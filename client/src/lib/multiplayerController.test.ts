import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COUNTDOWN_MS,
  GUEST_RESEND_MS,
  HOST_GONE_MS,
  HOST_SILENCE_MS,
  JOIN_TIMEOUT_MS,
  roomTopic,
} from './multiplayerProtocol.ts';
import {
  RoomController,
  type ControllerDeps,
  type OpenTransport,
  type TransportHandlers,
} from './multiplayerController.ts';
import { currentQuestion } from './multiplayerRaceState.ts';

// ---------------------------------------------------------------- test doubles

/** Timers run only when the test advances time, in time order. */
class FakeClock {
  t = 1_000_000;
  private timers: Array<{ at: number; id: number; fn: () => void }> = [];
  private nextId = 1;
  now = () => this.t;
  setTimer = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.push({ at: this.t + Math.max(0, ms), id, fn });
    return () => {
      this.timers = this.timers.filter((timer) => timer.id !== id);
    };
  };
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.timers[0];
      if (!next || next.at > end) break;
      this.timers.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = end;
  }
}

/** A deterministic pseudo-random source, so dropped messages are the same every run. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stands in for Supabase Realtime: broadcast to everyone else on the topic after a delay, at
 * most once, with JSON copies; 'joined' after opening and again after a cut is restored.
 */
class MemoryHub {
  latencyMs = 30;
  private endpoints: Array<{ topic: string; handlers: TransportHandlers; cut: boolean; closed: boolean }> = [];
  private toDrop = new Map<string, number>();
  constructor(private clock: FakeClock, private dropRate = 0, private random = seeded(7)) {}

  /** Lose the next `count` messages of this event, whoever sends them. */
  dropNext(event: string, count = 1) {
    this.toDrop.set(event, (this.toDrop.get(event) ?? 0) + count);
  }

  open: OpenTransport = (topic, handlers) => {
    const ep = { topic, handlers, cut: false, closed: false };
    this.endpoints.push(ep);
    this.clock.setTimer(() => { if (!ep.closed && !ep.cut) handlers.onStatus('joined'); }, 50);
    return {
      send: (event, payload) => {
        if (ep.closed || ep.cut) return false;
        const pending = this.toDrop.get(event) ?? 0;
        if (pending > 0) {
          this.toDrop.set(event, pending - 1);
          return true;
        }
        const data = JSON.parse(JSON.stringify(payload));
        for (const other of this.endpoints) {
          if (other === ep || other.topic !== topic || other.closed || other.cut) continue;
          if (this.dropRate > 0 && this.random() < this.dropRate) continue;
          this.clock.setTimer(() => { if (!other.closed && !other.cut) other.handlers.onMessage(event, data); }, this.latencyMs);
        }
        return true;
      },
      probe: () => {},
      close: () => { ep.closed = true; },
    };
  };

  /** Endpoints in the order they were opened. */
  cut(index: number) {
    this.endpoints[index].cut = true;
    this.endpoints[index].handlers.onStatus('error');
  }
  restore(index: number) {
    const ep = this.endpoints[index];
    ep.cut = false;
    this.clock.setTimer(() => { if (!ep.closed && !ep.cut) ep.handlers.onStatus('joined'); }, 50);
  }
}

const MIA = { id: 'host-mia', name: 'Mia', app: '1.3.17' };
const LEO = { id: 'guest-leo', name: 'Leo', app: '1.3.17' };
const ZOE = { id: 'guest-zoe', name: 'Zoe', app: '1.3.17' };
const SETTINGS = { level: 'easy', op: 'Addition', circuit: { id: 'malaysia', name: 'Malaysia' }, laps: 3 } as const;

function world({ dropRate = 0 } = {}) {
  const clock = new FakeClock();
  const hub = new MemoryHub(clock, dropRate);
  let ids = 0;
  const deps = (me: typeof MIA, { offset = 0, randoms = [0.4] }: { offset?: number; randoms?: number[] } = {}): ControllerDeps => {
    let r = 0;
    return {
      openTransport: hub.open,
      env: 'dev',
      now: () => clock.now() + offset,
      setTimer: clock.setTimer,
      random: () => randoms[Math.min(r++, randoms.length - 1)],
      newId: () => `${me.id}-${++ids}`,
      me,
    };
  };
  return { clock, hub, deps };
}

/** Mia hosts, Leo joins, both in the lobby. */
function lobby(opts: { dropRate?: number; guestOffset?: number } = {}) {
  const w = world({ dropRate: opts.dropRate });
  const host = RoomController.host(w.deps(MIA), SETTINGS);
  w.clock.advance(2000);
  const guest = RoomController.join(w.deps(LEO, { offset: opts.guestOffset ?? 0 }), host.getView().code);
  w.clock.advance(opts.dropRate ? 8000 : 500);
  return { ...w, host, guest };
}

/** Each driver answers correctly every `everyMs` until its car stops. */
function race(clock: FakeClock, drivers: Array<[RoomController, number]>) {
  const due = drivers.map(([c, every]) => ({ c, every, at: clock.now() + every }));
  for (let guard = 0; guard < 500; guard++) {
    const active = due.filter((d) => d.c.getView().racer?.status === 'racing');
    if (active.length === 0) return;
    const next = active.reduce((a, b) => (a.at <= b.at ? a : b));
    clock.advance(next.at - clock.now());
    const v = next.c.getView();
    const q = v.racer && currentQuestion(v.racer, v.bank);
    if (q) next.c.answer(q.answer, next.every);
    next.at += next.every;
  }
  throw new Error('the race did not finish');
}

// ---------------------------------------------------------------- joining

test('a host gets a four-digit code and an empty lobby', () => {
  const { clock, deps } = world();
  const host = RoomController.host(deps(MIA), SETTINGS);
  assert.equal(host.getView().stage, 'connecting');
  clock.advance(2000);
  const v = host.getView();
  assert.deepEqual([v.stage, v.code, v.snap?.phase, v.snap?.guest], ['room', '4600', 'lobby', null]);
});

test('a guest joins by code and each sees the other', () => {
  const { host, guest } = lobby();
  assert.equal(guest.getView().stage, 'room');
  assert.equal(guest.getView().snap?.host.name, 'Mia');
  assert.equal(host.getView().snap?.guest?.name, 'Leo');
});

test('a code nobody is hosting fails as not found', () => {
  const { clock, deps } = world();
  const guest = RoomController.join(deps(LEO), '1234');
  clock.advance(JOIN_TIMEOUT_MS + 200);
  assert.deepEqual([guest.getView().stage, guest.getView().error], ['failed', 'not-found']);
});

test('a third player finds the room full', () => {
  const { clock, deps, host } = lobby();
  const zoe = RoomController.join(deps(ZOE), host.getView().code);
  clock.advance(1000);
  assert.deepEqual([zoe.getView().stage, zoe.getView().error], ['failed', 'full']);
  assert.equal(host.getView().snap?.guest?.name, 'Leo');
});

test('joining your own race is refused', () => {
  const { clock, deps } = world();
  const host = RoomController.host(deps(MIA), SETTINGS);
  clock.advance(2000);
  const again = RoomController.join(deps(MIA), host.getView().code);
  clock.advance(1000);
  assert.deepEqual([again.getView().stage, again.getView().error], ['failed', 'own-race']);
});

test('a host on another protocol version is reported with its app version', () => {
  const { clock, hub, deps } = world();
  const handlers: TransportHandlers = {
    onStatus: () => {},
    onMessage: (event) => {
      if (event === 'sync') other.send('room', { v: 99, app: '9.9.9', seq: 1, snap: { anything: true } });
    },
  };
  const other = hub.open(roomTopic('dev', '4821'), handlers);
  const guest = RoomController.join(deps(LEO), '4821');
  clock.advance(1000);
  const v = guest.getView();
  assert.deepEqual([v.stage, v.error, v.theirApp], ['failed', 'version', '9.9.9']);
});

test('a host whose code is taken picks another one', () => {
  const { clock, deps } = world();
  const first = RoomController.host(deps(MIA), SETTINGS);
  clock.advance(2000);
  const second = RoomController.host(deps(ZOE, { randoms: [0.4, 0.5] }), SETTINGS);
  clock.advance(4000);
  assert.equal(first.getView().code, '4600');
  assert.deepEqual([second.getView().stage, second.getView().code], ['room', '5500']);
});

test('an idle lobby keeps both players present', () => {
  const { clock, host, guest } = lobby();
  clock.advance(60_000);
  assert.deepEqual([guest.getView().stage, guest.getView().hostSilent], ['room', false]);
  assert.deepEqual([host.getView().snap?.guest?.name, host.getView().snap?.guest?.away], ['Leo', false]);
});

test('the guest keeps hearing the host while its own messages are being lost', () => {
  const { clock, hub, guest } = lobby();
  hub.dropNext('guest', 4);
  clock.advance(HOST_SILENCE_MS + 3000);
  assert.equal(guest.getView().hostSilent, false);
});

test('a Ready lost on the way is sent again well before the next heartbeat', () => {
  const { clock, hub, host, guest } = lobby();
  clock.advance(100);
  hub.dropNext('guest');
  guest.agree(true);
  clock.advance(GUEST_RESEND_MS + 300);
  assert.notEqual(host.getView().snap?.guest?.agree, null);
});

test('questions lost on the way are asked for again before the lights go out', () => {
  const { clock, hub, host, guest } = lobby();
  guest.agree(true);
  clock.advance(200);
  hub.dropNext('bank');
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 200);
  const g = guest.getView();
  assert.equal(g.bank?.raceId, 1);
  assert.ok(g.lightsOutAt !== null && g.lightsOutAt <= clock.now());
});

// ---------------------------------------------------------------- racing

test('ready and start run the lights on both screens, with the same questions', () => {
  const { clock, host, guest } = lobby();
  guest.agree(true);
  clock.advance(200);
  host.agree(true);
  clock.advance(200);
  assert.equal(host.getView().snap?.phase, 'countdown');
  assert.equal(guest.getView().snap?.phase, 'countdown');
  clock.advance(COUNTDOWN_MS);
  const [h, g] = [host.getView(), guest.getView()];
  assert.equal(h.snap?.phase, 'racing');
  assert.ok(g.lightsOutAt !== null && g.lightsOutAt <= clock.now());
  assert.deepEqual(g.bank?.questions, h.bank?.questions);
  assert.equal(g.bank?.questions.length, 3);
});

test('a full race: both screens agree on the winner, even with the guest clock an hour off', () => {
  const { clock, host, guest } = lobby({ guestOffset: 3_600_000 });
  guest.agree(true);
  clock.advance(200);
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 500);
  race(clock, [[guest, 500], [host, 900]]);
  clock.advance(3000);
  for (const c of [host, guest]) {
    assert.deepEqual(c.getView().snap?.result, { winnerId: LEO.id, final: true });
    assert.equal(c.getView().snap?.phase, 'results');
  }
});

test('a race still finishes the same on both screens when 30% of messages are lost', () => {
  const { clock, host, guest } = lobby({ dropRate: 0.3 });
  assert.equal(host.getView().snap?.guest?.name, 'Leo');
  guest.agree(true);
  clock.advance(5000);
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 5000);
  race(clock, [[host, 700], [guest, 1100]]);
  clock.advance(20_000);
  // Who wins depends on which countdown messages were lost (a guest that missed them starts its
  // own clock later); what must hold is that both screens show the same, final result.
  const result = host.getView().snap?.result;
  assert.equal(result?.final, true);
  assert.ok(result?.winnerId === MIA.id || result?.winnerId === LEO.id);
  assert.deepEqual(guest.getView().snap?.result, result);
  assert.equal(guest.getView().snap?.phase, 'results');
});

test('a guest cut off mid-race comes back and the race still ends right', () => {
  const { clock, hub, host, guest } = lobby();
  guest.agree(true);
  clock.advance(200);
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 500);
  hub.cut(1);
  race(clock, [[guest, 600]]);
  clock.advance(5000);
  hub.restore(1);
  clock.advance(1000);
  race(clock, [[host, 2000]]);
  clock.advance(3000);
  for (const c of [host, guest]) assert.deepEqual(c.getView().snap?.result, { winnerId: LEO.id, final: true });
});

test('a crash is out of the race, and the other car wins by finishing', () => {
  const { clock, host, guest } = lobby();
  guest.agree(true);
  clock.advance(200);
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 500);
  for (let i = 0; i < 4; i++) {
    clock.advance(300);
    guest.answer(-1, 300);
  }
  assert.equal(guest.getView().racer?.status, 'crashed');
  race(clock, [[host, 1000]]);
  clock.advance(1000);
  assert.deepEqual(guest.getView().snap?.result, { winnerId: MIA.id, final: true });
});

test('race again: both tap, and a new race starts with new questions and fresh cars', () => {
  const { clock, host, guest } = lobby();
  guest.agree(true);
  clock.advance(200);
  host.agree(true);
  clock.advance(COUNTDOWN_MS + 500);
  race(clock, [[guest, 500], [host, 900]]);
  clock.advance(3000);
  host.agree(true);
  clock.advance(200);
  guest.agree(true);
  clock.advance(500);
  const [h, g] = [host.getView(), guest.getView()];
  assert.deepEqual([h.snap?.phase, h.snap?.raceId, g.snap?.raceId], ['countdown', 2, 2]);
  assert.equal(g.racer?.done.length, 0);
  assert.equal(g.bank?.raceId, 2);
});

// ---------------------------------------------------------------- the host going away

test('a silent host shows as waiting, then the room closes', () => {
  const { clock, hub, guest } = lobby();
  hub.cut(0);
  clock.advance(HOST_SILENCE_MS + 1000);
  assert.equal(guest.getView().hostSilent, true);
  assert.equal(guest.getView().stage, 'room');
  clock.advance(HOST_GONE_MS);
  assert.deepEqual([guest.getView().stage, guest.getView().error], ['closed', 'host-left']);
});

test('a host coming back in time clears the waiting state', () => {
  const { clock, hub, guest } = lobby();
  hub.cut(0);
  clock.advance(HOST_SILENCE_MS + 1000);
  hub.restore(0);
  clock.advance(4000);
  assert.equal(guest.getView().hostSilent, false);
});

test('when the host leaves, the guest is told the room closed', () => {
  const { clock, host, guest } = lobby();
  host.leave();
  clock.advance(200);
  assert.deepEqual([guest.getView().stage, guest.getView().error], ['closed', 'host-left']);
});
