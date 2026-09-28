import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AWAY_AFTER_MS,
  COUNTDOWN_MS,
  LOBBY_DROP_MS,
  PROTOCOL_VERSION,
  RACE_DROP_MS,
  type GuestMsg,
  type RacerStatus,
  type RacerWire,
} from './multiplayerProtocol.ts';
import { createRoom, reduceRoom, toSnapshot, type RoomState } from './multiplayerRoom.ts';

const HOST = { id: 'H', name: 'Mia', app: '1.3.17' };
const T0 = 1_000_000;
/** Host lights out, on the host's clock. */
const LO = T0 + COUNTDOWN_MS;

function room(): RoomState {
  return createRoom({
    roomId: 'r1', code: '4821', host: HOST, level: 'easy', op: 'Addition',
    circuit: { id: 'malaysia', name: 'Malaysia' }, laps: 3,
  });
}

let seq = 0;
/** A guest message; each call gets a newer seq unless one is given. */
function g(fields: Partial<GuestMsg> = {}): GuestMsg {
  return {
    v: PROTOCOL_VERSION, app: '1.3.16', seq: ++seq, session: 'S1', id: 'G', name: 'Leo',
    agree: null, raceId: 0, race: null, raceMs: null, ...fields,
  };
}

function wire(times: number[], st: RacerStatus = 'racing', ms: number | null = null, fields: Partial<RacerWire> = {}): RacerWire {
  return { raceId: 1, laps: times.map((t) => ({ t, r: false })), att: 0, warn: 0, st, ms, ...fields };
}

const guest = (s: RoomState, msg: GuestMsg, now: number) => reduceRoom(s, { type: 'guest', msg, now });
const hostRace = (s: RoomState, race: RacerWire, now: number) => reduceRoom(s, { type: 'hostRace', race, now });
const tick = (s: RoomState, now: number) => reduceRoom(s, { type: 'tick', now });

/** Host and guest agreed at T0; the lights went out at LO; race 1 is on. */
function racing(): RoomState {
  let s = room();
  s = guest(s, g({ agree: { raceId: 0, rev: s.rev } }), T0);
  s = reduceRoom(s, { type: 'hostAgree', now: T0 });
  return tick(s, LO);
}

// ---------------------------------------------------------------- lobby

test('a guest who messages an empty lobby takes the seat', () => {
  const s = guest(room(), g({ seq: 7 }), T0);
  const snap = toSnapshot(s, T0);
  assert.deepEqual(snap.guest, { id: 'G', name: 'Leo', app: '1.3.16', agree: null, away: false, out: null, race: null });
  assert.equal(snap.guestAck, 7);
  assert.equal(snap.phase, 'lobby');
});

test('a second player cannot take a seated room, and the host cannot be its own guest', () => {
  let s = guest(room(), g(), T0);
  s = guest(s, g({ id: 'X', name: 'Zoe', session: 'SX' }), T0 + 10);
  s = guest(s, g({ id: 'H', name: 'Mia', session: 'SH' }), T0 + 20);
  assert.equal(toSnapshot(s, T0 + 20).guest?.id, 'G');
  assert.equal(toSnapshot(guest(room(), g({ id: 'H' }), T0), T0).guest, null);
});

test('the race starts when host and guest agree on the same settings, in either order', () => {
  let a = room();
  a = guest(a, g({ agree: { raceId: 0, rev: a.rev } }), T0);
  a = reduceRoom(a, { type: 'hostAgree', now: T0 + 5 });
  assert.deepEqual([a.phase, a.raceId], ['countdown', 1]);

  let b = guest(room(), g(), T0);
  b = reduceRoom(b, { type: 'hostAgree', now: T0 + 5 });
  assert.equal(b.phase, 'lobby');
  b = guest(b, g({ agree: { raceId: 0, rev: b.rev } }), T0 + 10);
  assert.deepEqual([b.phase, b.raceId], ['countdown', 1]);
});

test('changing the level or maths after the guest is ready means the guest must ready again', () => {
  let s = room();
  s = guest(s, g({ agree: { raceId: 0, rev: s.rev } }), T0);
  const oldRev = s.rev;
  s = reduceRoom(s, { type: 'settings', level: 'medium' });
  s = reduceRoom(s, { type: 'hostAgree', now: T0 + 10 });
  assert.equal(s.phase, 'lobby');
  assert.equal(toSnapshot(s, T0 + 10).level, 'medium');
  s = guest(s, g({ agree: { raceId: 0, rev: oldRev } }), T0 + 20); // a resend of the old Ready
  assert.equal(s.phase, 'lobby');
  s = guest(s, g({ agree: { raceId: 0, rev: s.rev } }), T0 + 30);
  assert.equal(s.phase, 'countdown');
});

test('settings are locked once the lights are on', () => {
  const s = racing();
  const after = reduceRoom(s, { type: 'settings', op: 'Division' });
  assert.equal(toSnapshot(after, LO).op, 'Addition');
});

test('a delayed older guest message does not undo a newer one', () => {
  let s = room();
  s = guest(s, g({ seq: 5, agree: { raceId: 0, rev: s.rev } }), T0);
  s = guest(s, g({ seq: 4, agree: null }), T0 + 10);
  assert.deepEqual(toSnapshot(s, T0 + 10).guest?.agree, { raceId: 0, rev: s.rev });
});

test('a silent guest shows as away, then leaves the lobby', () => {
  let s = guest(room(), g(), T0);
  assert.equal(toSnapshot(tick(s, T0 + AWAY_AFTER_MS), T0 + AWAY_AFTER_MS).guest?.away, false);
  assert.equal(toSnapshot(tick(s, T0 + AWAY_AFTER_MS + 1), T0 + AWAY_AFTER_MS + 1).guest?.away, true);
  s = tick(s, T0 + LOBBY_DROP_MS + 1);
  assert.equal(toSnapshot(s, T0 + LOBBY_DROP_MS + 1).guest, null);
});

test('the race does not start while the guest is away', () => {
  let s = room();
  s = guest(s, g({ agree: { raceId: 0, rev: s.rev } }), T0);
  s = reduceRoom(s, { type: 'hostAgree', now: T0 + AWAY_AFTER_MS + 1 });
  assert.equal(s.phase, 'lobby');
});

test("a guest's bye empties the seat", () => {
  const s = reduceRoom(guest(room(), g(), T0), { type: 'guestBye', id: 'G', now: T0 + 1 });
  assert.equal(toSnapshot(s, T0 + 1).guest, null);
});

// ---------------------------------------------------------------- countdown and race

test('the lights go out COUNTDOWN_MS after the start, and the snapshot says how far in it is', () => {
  let s = room();
  s = guest(s, g({ agree: { raceId: 0, rev: s.rev } }), T0);
  s = reduceRoom(s, { type: 'hostAgree', now: T0 });
  assert.equal(toSnapshot(s, T0 + 2500).countdownElapsedMs, 2500);
  assert.equal(tick(s, LO - 1).phase, 'countdown');
  const out = tick(s, LO);
  assert.equal(out.phase, 'racing');
  assert.equal(toSnapshot(out, LO).countdownElapsedMs, null);
});

test('guest race updates must belong to this race, only grow, and a finish must add up', () => {
  const s = guest(racing(), g({ raceId: 1, race: wire([2000, 2000]), raceMs: 4500 }), LO + 4500);
  const laps = (x: RoomState) => toSnapshot(x, LO + 9000).guest?.race?.laps.length;
  assert.equal(laps(guest(s, g({ raceId: 1, race: { ...wire([2000]), raceId: 0 } }), LO + 5000)), 2, 'another race');
  assert.equal(laps(guest(s, g({ raceId: 1, race: wire([2000]) }), LO + 5000)), 2, 'shrinking');
  assert.equal(laps(guest(s, g({ raceId: 1, race: wire([2000, 2000, 2000], 'finished', 5000) }), LO + 7000)), 2, 'finish faster than its own laps');
  assert.equal(laps(guest(s, g({ raceId: 1, race: wire([2000, 2000], 'finished', 7000) }), LO + 7000)), 2, 'finish short of the laps');
  assert.equal(laps(guest(s, g({ raceId: 1, race: wire([2000, 2000, 2000], 'finished', 6500) }), LO + 7000)), 3, 'a real finish');
});

// ---------------------------------------------------------------- result

test('host finishes first: the result waits until the guest provably cannot beat it', () => {
  // The guest reported 9.000 s of race time, received at LO + 9.050.
  let s = guest(racing(), g({ raceId: 1, race: wire([3000, 3000]), raceMs: 9000 }), LO + 9050);
  s = hostRace(s, wire([3000, 3000, 4000], 'finished', 10_000), LO + 10_000);
  assert.deepEqual(toSnapshot(s, LO + 10_000).result, { winnerId: 'H', final: false });
  // The guest's clock is now at least 9000 + (now - (LO + 9050)); it is out of it once past 10000 + 1500.
  assert.equal(tick(s, LO + 11_550).result?.final, false);
  s = tick(s, LO + 11_551);
  assert.deepEqual(toSnapshot(s, LO + 11_551).result, { winnerId: 'H', final: true });
  assert.equal(s.phase, 'racing', 'the guest still races to the line');
  s = guest(s, g({ raceId: 1, race: wire([3000, 3000, 5000], 'finished', 12_000), raceMs: 12_000 }), LO + 12_050);
  assert.equal(s.phase, 'results');
});

test('host finishes first, but a faster guest finish still in flight wins', () => {
  let s = guest(racing(), g({ raceId: 1, race: wire([3000, 3000]), raceMs: 9000 }), LO + 9050);
  s = hostRace(s, wire([3000, 3000, 4000], 'finished', 10_000), LO + 10_000);
  s = guest(s, g({ raceId: 1, race: wire([3000, 3000, 3700], 'finished', 9800), raceMs: 9800 }), LO + 10_300);
  assert.deepEqual(toSnapshot(s, LO + 10_300).result, { winnerId: 'G', final: true });
  assert.equal(s.phase, 'results');
});

test('guest finishes first: final as soon as the host race clock passes the guest time', () => {
  let s = hostRace(racing(), wire([2000, 2000]), LO + 5000);
  s = guest(s, g({ raceId: 1, race: wire([2500, 2500, 2900], 'finished', 8000), raceMs: 8000 }), LO + 8050);
  assert.deepEqual(toSnapshot(s, LO + 8050).result, { winnerId: 'G', final: true });
  assert.equal(s.phase, 'racing');
});

test('a crash is a DNF: the other car wins by finishing; if both crash nobody wins', () => {
  let s = guest(racing(), g({ raceId: 1, race: wire([2000], 'crashed', 5000), raceMs: 5000 }), LO + 5050);
  assert.equal(toSnapshot(s, LO + 5050).result, null);
  const won = hostRace(s, wire([3000, 3000, 3000], 'finished', 12_000), LO + 12_000);
  assert.deepEqual([toSnapshot(won, LO + 12_000).result, won.phase], [{ winnerId: 'H', final: true }, 'results']);
  const bothOut = hostRace(s, wire([3000], 'crashed', 6000), LO + 6000);
  assert.deepEqual([toSnapshot(bothOut, LO + 6000).result, bothOut.phase], [{ winnerId: null, final: true }, 'results']);
});

test('a retired host loses to a guest who finishes', () => {
  let s = hostRace(racing(), wire([3000], 'retired', 4000), LO + 4000);
  s = guest(s, g({ raceId: 1, race: wire([3000, 3000, 3000], 'finished', 9500), raceMs: 9500 }), LO + 9550);
  assert.deepEqual([toSnapshot(s, LO + 9550).result, s.phase], [{ winnerId: 'G', final: true }, 'results']);
});

test('equal race times go to fewer warnings, then to the host', () => {
  const base = hostRace(racing(), wire([3000, 3000, 3000], 'finished', 9000, { warn: 1 }), LO + 9000);
  const fewer = guest(base, g({ raceId: 1, race: wire([3000, 3000, 3000], 'finished', 9000), raceMs: 9000 }), LO + 9050);
  assert.equal(toSnapshot(fewer, LO + 9050).result?.winnerId, 'G');
  const same = guest(base, g({ raceId: 1, race: wire([3000, 3000, 3000], 'finished', 9000, { warn: 1 }), raceMs: 9000 }), LO + 9050);
  assert.equal(toSnapshot(same, LO + 9050).result?.winnerId, 'H');
});

test('a declared result never changes', () => {
  let s = guest(racing(), g({ raceId: 1, race: wire([3000, 3000]), raceMs: 9000 }), LO + 9050);
  s = hostRace(s, wire([3000, 3000, 4000], 'finished', 10_000), LO + 10_000);
  s = tick(s, LO + 11_551);
  s = guest(s, g({ raceId: 1, race: wire([3000, 3000, 3400], 'finished', 9500), raceMs: 9500 }), LO + 12_000);
  assert.deepEqual(toSnapshot(s, LO + 12_000).result, { winnerId: 'H', final: true });
});

test('a guest silent for RACE_DROP_MS is out of the race', () => {
  let s = racing();
  s = hostRace(s, wire([3000, 3000, 3000], 'finished', 9000), LO + 9000);
  s = tick(s, T0 + RACE_DROP_MS);
  assert.equal(toSnapshot(s, T0 + RACE_DROP_MS).guest?.out, null);
  s = tick(s, T0 + RACE_DROP_MS + 1);
  const snap = toSnapshot(s, T0 + RACE_DROP_MS + 1);
  assert.deepEqual([snap.guest?.out, snap.result, s.phase], ['disconnected', { winnerId: 'H', final: true }, 'results']);
});

test('a guest who reloads or leaves mid-race is out; one who already finished keeps the finish', () => {
  const reloaded = guest(racing(), g({ session: 'S2', seq: 1 }), LO + 3000);
  assert.equal(toSnapshot(reloaded, LO + 3000).guest?.out, 'left');
  const left = reduceRoom(racing(), { type: 'guestBye', id: 'G', now: LO + 3000 });
  assert.equal(toSnapshot(left, LO + 3000).guest?.out, 'left');
  let done = guest(racing(), g({ raceId: 1, race: wire([2000, 2000, 2000], 'finished', 6500), raceMs: 6500 }), LO + 6550);
  done = reduceRoom(done, { type: 'guestBye', id: 'G', now: LO + 7000 });
  assert.equal(toSnapshot(done, LO + 7000).guest?.out, null);
  assert.equal(toSnapshot(done, LO + 7000).result?.winnerId, 'G');
});

// ---------------------------------------------------------------- after the race

function finished(): RoomState {
  let s = hostRace(racing(), wire([3000, 3000, 3000], 'finished', 9000), LO + 9000);
  s = guest(s, g({ raceId: 1, race: wire([3000, 3000, 4000], 'finished', 10_000), raceMs: 10_000 }), LO + 10_050);
  assert.equal(s.phase, 'results');
  return s;
}

test('a rematch starts when both tap Race again, with fresh cars', () => {
  let s = finished();
  s = reduceRoom(s, { type: 'hostAgree', now: LO + 20_000 });
  assert.equal(s.phase, 'results');
  s = guest(s, g({ raceId: 1, agree: { raceId: 1, rev: s.rev } }), LO + 21_000);
  const snap = toSnapshot(s, LO + 21_000);
  assert.deepEqual([s.phase, snap.raceId, snap.result, snap.host.race, snap.guest?.race], ['countdown', 2, null, null, null]);
});

test('a guest who leaves after a race stays on the results as away, and a rematch waits for them', () => {
  let s = reduceRoom(finished(), { type: 'guestBye', id: 'G', now: LO + 20_000 });
  s = reduceRoom(s, { type: 'hostAgree', now: LO + 20_100 });
  s = tick(s, LO + 20_000 + LOBBY_DROP_MS + 1);
  const snap = toSnapshot(s, LO + 20_000 + LOBBY_DROP_MS + 1);
  assert.deepEqual([s.phase, snap.guest?.away, snap.guest?.race?.st, snap.result?.winnerId], ['results', true, 'finished', 'H']);
  // Back again (they rejoined by code): Race again works.
  s = guest(s, g({ raceId: 1, agree: { raceId: 1, rev: s.rev } }), LO + 50_000);
  assert.equal(s.phase, 'countdown');
});
