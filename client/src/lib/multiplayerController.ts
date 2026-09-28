/**
 * Runs one side of a multiplayer room: the host (the referee plus its own car) or the guest
 * (its own car plus the host's latest snapshot). Plain TypeScript with the transport, clock and
 * timers injected, so React only subscribes to the view and a test can run a whole race in
 * memory. Nothing here depends on the two devices' clocks agreeing.
 */
import {
  BANK_RETRY_MS,
  CODE_PROBE_MS,
  GUEST_HEARTBEAT_MS,
  GUEST_RESEND_MS,
  HOST_GONE_MS,
  HOST_HEARTBEAT_MS,
  HOST_SILENCE_MS,
  JOIN_TIMEOUT_MS,
  PROTOCOL_VERSION,
  SYNC_RETRY_MS,
  COUNTDOWN_MS,
  isRoomCode,
  parseMessage,
  randomRoomCode,
  roomTopic,
  type Agreement,
  type Level,
  type MathOp,
  type MpEnv,
  type MpEvent,
  type RoomMsg,
  type RoomSnapshot,
} from './multiplayerProtocol';
import { mintQuestionBank, type QuestionBank } from './multiplayerQuestions';
import { retireRacer, startRacer, submitAnswer, toWire, type AnswerOutcome, type RacerState } from './multiplayerRaceState';
import { createRoom, lightsOutAt, reduceRoom, toSnapshot, type RoomAction, type RoomState } from './multiplayerRoom';

// ---------------------------------------------------------------- transport

export type TransportStatus = 'joined' | 'error' | 'closed';

export interface TransportHandlers {
  onMessage(event: string, payload: unknown): void;
  /** 'joined' fires when the channel is first joined and again after every automatic rejoin. */
  onStatus(status: TransportStatus): void;
}

export interface RoomTransport {
  /** Returns false when the message could not be sent (not joined). Delivery is at most once. */
  send(event: MpEvent, payload: object): boolean;
  /** Nudge a socket that may have died while the app was in the background. */
  probe(): void;
  close(): void;
}

export type OpenTransport = (topic: string, handlers: TransportHandlers) => RoomTransport;

// ---------------------------------------------------------------- controller

export interface ControllerDeps {
  openTransport: OpenTransport;
  env: MpEnv;
  now(): number;
  /** Runs `fn` once after `ms`; returns a cancel function. */
  setTimer(fn: () => void, ms: number): () => void;
  random(): number;
  newId(): string;
  me: { id: string; name: string; app: string };
}

export interface HostSettings {
  level: Level;
  op: MathOp;
  circuit: { id: string; name: string };
  laps: number;
}

export type Stage = 'connecting' | 'probing' | 'joining' | 'room' | 'failed' | 'closed';
export type ControllerError = 'not-found' | 'full' | 'own-race' | 'version' | 'host-left' | 'no-code';

export interface ControllerView {
  role: 'host' | 'guest';
  stage: Stage;
  error: ControllerError | null;
  /** The other app's version, when the protocols differ. */
  theirApp: string | null;
  code: string;
  connected: boolean;
  snap: RoomSnapshot | null;
  bank: QuestionBank | null;
  racer: RacerState | null;
  /** When the countdown ends on this device's clock. */
  countdownEndsAt: number | null;
  /** This car's lights-out: the end of the countdown, or the questions' arrival if later. The lights hold on five until then. */
  lightsOutAt: number | null;
  /** Guest only: the host has gone quiet. */
  hostSilent: boolean;
}

export interface RoomController {
  getView(): ControllerView;
  subscribe(listener: () => void): () => void;
  /** Host: Start race / Race again. Guest: Ready (on or off) / Race again. */
  agree(on: boolean): void;
  setLevel(level: Level): void;
  setOperation(op: MathOp): void;
  answer(value: number, responseTimeMs: number): AnswerOutcome;
  retire(): void;
  /** The app came back to the foreground. */
  resume(): void;
  leave(): void;
}

export const RoomController = {
  host(deps: ControllerDeps, settings: HostSettings): RoomController {
    return new HostSide(deps, settings);
  },
  join(deps: ControllerDeps, code: string): RoomController {
    return new GuestSide(deps, code);
  },
};

const HOST_TICK_MS = 250;
const GUEST_TICK_MS = 250;
const MAX_CODE_ATTEMPTS = 5;

function initialView(role: 'host' | 'guest', code = ''): ControllerView {
  return {
    role, stage: 'connecting', error: null, theirApp: null, code, connected: false,
    snap: null, bank: null, racer: null, countdownEndsAt: null, lightsOutAt: null, hostSilent: false,
  };
}

abstract class Side implements RoomController {
  protected view: ControllerView;
  protected transport: RoomTransport | null = null;
  private listeners = new Set<() => void>();
  private cancels = new Set<() => void>();

  constructor(protected deps: ControllerDeps, view: ControllerView) {
    this.view = view;
  }

  getView = (): ControllerView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  abstract agree(on: boolean): void;
  abstract answer(value: number, responseTimeMs: number): AnswerOutcome;
  abstract retire(): void;
  abstract leave(): void;
  setLevel(_level: Level): void {}
  setOperation(_op: MathOp): void {}

  resume(): void {
    this.transport?.probe();
  }

  protected update(patch: Partial<ControllerView>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  protected send(event: MpEvent, payload: object): boolean {
    return this.transport?.send(event, { v: PROTOCOL_VERSION, app: this.deps.me.app, ...payload }) ?? false;
  }

  protected openTopic(code: string) {
    this.transport = this.deps.openTransport(roomTopic(this.deps.env, code), {
      onStatus: (status) => {
        this.update({ connected: status === 'joined' });
        if (status === 'joined') this.onJoined();
      },
      onMessage: (event, payload) => this.onMessage(event, payload),
    });
  }

  protected abstract onJoined(): void;
  protected abstract onMessage(event: string, payload: unknown): void;

  protected after(ms: number, fn: () => void) {
    const cancel = this.deps.setTimer(() => {
      this.cancels.delete(cancel);
      fn();
    }, ms);
    this.cancels.add(cancel);
  }

  protected every(ms: number, fn: () => void) {
    this.after(ms, () => {
      fn();
      if (this.view.stage !== 'failed' && this.view.stage !== 'closed') this.every(ms, fn);
    });
  }

  protected end(stage: 'failed' | 'closed', error: ControllerError | null, theirApp: string | null = null) {
    this.cancels.forEach((cancel) => cancel());
    this.cancels.clear();
    this.transport?.close();
    this.transport = null;
    this.update({ stage, error, theirApp, connected: false });
  }
}

// ---------------------------------------------------------------- host

class HostSide extends Side {
  private state: RoomState | null = null;
  private seq = 0;
  private bank: QuestionBank | null = null;
  private racer: RacerState | null = null;
  private codeAttempts = 0;

  constructor(deps: ControllerDeps, private settings: HostSettings) {
    super(deps, initialView('host'));
    this.tryCode();
  }

  private tryCode() {
    if (this.codeAttempts >= MAX_CODE_ATTEMPTS) {
      this.end('failed', 'no-code');
      return;
    }
    this.codeAttempts++;
    const code = randomRoomCode(this.deps.random);
    this.update({ code, stage: 'connecting' });
    this.openTopic(code);
  }

  protected onJoined() {
    if (this.view.stage === 'connecting') {
      // Ask the channel whether someone already hosts this code before taking it.
      this.update({ stage: 'probing' });
      const { id, name } = this.deps.me;
      this.send('sync', { id, name, need: ['room'] });
      this.after(CODE_PROBE_MS, () => {
        if (this.view.stage === 'probing') this.openRoom();
      });
    } else if (this.view.stage === 'room') {
      // Back after a dropped connection: tell the guest where things stand.
      this.sendBank();
      this.broadcastRoom();
    }
  }

  protected onMessage(event: string, payload: unknown) {
    const parsed = parseMessage(event, payload);
    if (this.view.stage === 'probing') {
      const taken = (parsed.kind === 'room' && parsed.msg.snap.host.id !== this.deps.me.id) || parsed.kind === 'version';
      if (taken) {
        this.transport?.close();
        this.transport = null;
        this.tryCode();
      }
      return;
    }
    if (this.view.stage !== 'room' || !this.state) return;
    const now = this.deps.now();
    switch (parsed.kind) {
      case 'guest':
        this.dispatch({ type: 'guest', msg: parsed.msg, now });
        return;
      case 'sync':
        if (parsed.msg.need.includes('bank')) this.sendBank();
        this.broadcastRoom();
        return;
      case 'bye':
        this.dispatch({ type: 'guestBye', id: parsed.msg.id, now });
        return;
    }
  }

  private openRoom() {
    const { level, op, circuit, laps } = this.settings;
    this.state = createRoom({ roomId: this.deps.newId(), code: this.view.code, host: this.deps.me, level, op, circuit, laps });
    this.update({ stage: 'room' });
    this.every(HOST_TICK_MS, () => this.dispatch({ type: 'tick', now: this.deps.now() }));
    this.every(HOST_HEARTBEAT_MS, () => this.broadcastRoom());
    this.broadcastRoom();
  }

  private dispatch(action: RoomAction) {
    if (!this.state) return;
    const before = this.state;
    const next = reduceRoom(before, action);
    if (next === before) return;
    this.state = next;
    if (next.raceId !== before.raceId) this.newRace(next);
    this.broadcastRoom();
  }

  private newRace(s: RoomState) {
    this.bank = mintQuestionBank({ raceId: s.raceId, level: s.level, op: s.op, circuitId: s.circuit.id, laps: s.laps });
    this.racer = startRacer(s.raceId, s.laps);
    this.sendBank();
  }

  private sendBank() {
    if (!this.state || !this.bank || this.bank.raceId !== this.state.raceId) return;
    const { raceId, level, op, questions } = this.bank;
    this.send('bank', { roomId: this.state.roomId, raceId, level, op, questions });
  }

  private broadcastRoom() {
    if (!this.state) return;
    const snap = toSnapshot(this.state, this.deps.now());
    this.send('room', { seq: ++this.seq, snap });
    const lightsOut = lightsOutAt(this.state);
    this.update({ snap, bank: this.bank, racer: this.racer, countdownEndsAt: lightsOut, lightsOutAt: lightsOut });
  }

  private raceMsNow(): number | null {
    const lightsOut = this.state ? lightsOutAt(this.state) : null;
    const now = this.deps.now();
    return lightsOut === null || now < lightsOut ? null : now - lightsOut;
  }

  agree(on: boolean) {
    if (on) this.dispatch({ type: 'hostAgree', now: this.deps.now() });
  }

  setLevel(level: Level) {
    this.dispatch({ type: 'settings', level });
  }

  setOperation(op: MathOp) {
    this.dispatch({ type: 'settings', op });
  }

  answer(value: number, responseTimeMs: number): AnswerOutcome {
    const raceMs = this.raceMsNow();
    if (!this.racer || raceMs === null) return 'ignored';
    const { state, outcome } = submitAnswer(this.racer, this.bank, value, responseTimeMs, raceMs);
    if (outcome === 'ignored') return outcome;
    this.racer = state;
    this.dispatch({ type: 'hostRace', race: toWire(state), now: this.deps.now() });
    this.update({ racer: state });
    return outcome;
  }

  retire() {
    const raceMs = this.raceMsNow();
    if (!this.racer || raceMs === null) return;
    this.racer = retireRacer(this.racer, raceMs);
    this.dispatch({ type: 'hostRace', race: toWire(this.racer), now: this.deps.now() });
    this.update({ racer: this.racer });
  }

  leave() {
    this.send('bye', { id: this.deps.me.id });
    this.end('closed', null);
  }
}

// ---------------------------------------------------------------- guest

class GuestSide extends Side {
  private session: string;
  private seq = 0;
  private acked = 0;
  private lastSentAt = -Infinity;
  private lastSyncAt = -Infinity;
  private hostSeq = -1;
  private lastRoomAt = 0;
  private agreement: Agreement | null = null;
  private raceId = 0;
  private racer: RacerState | null = null;
  private bank: QuestionBank | null = null;
  private countdownEndsAt: number | null = null;
  private lightsOut: number | null = null;

  constructor(deps: ControllerDeps, code: string) {
    super(deps, initialView('guest', code));
    this.session = deps.newId();
    if (!isRoomCode(code)) {
      this.end('failed', 'not-found');
      return;
    }
    this.openTopic(code);
    this.after(JOIN_TIMEOUT_MS, () => {
      if (this.view.stage === 'connecting' || this.view.stage === 'joining') this.end('failed', 'not-found');
    });
  }

  protected onJoined() {
    if (this.view.stage === 'connecting') {
      this.update({ stage: 'joining' });
      this.requestSync();
      this.every(SYNC_RETRY_MS, () => {
        if (this.view.stage === 'joining') this.requestSync();
      });
    } else if (this.view.stage === 'room') {
      // Back after a dropped connection: catch up, and tell the host where this car is.
      this.requestSync();
      this.sendState();
    }
  }

  protected onMessage(event: string, payload: unknown) {
    const parsed = parseMessage(event, payload);
    const me = this.deps.me;
    if (this.view.stage === 'joining') {
      if (parsed.kind === 'version') this.end('failed', 'version', parsed.app);
      else if (parsed.kind === 'room') {
        const { snap } = parsed.msg;
        if (snap.host.id === me.id) this.end('failed', 'own-race');
        else if (snap.guest && snap.guest.id !== me.id) this.end('failed', 'full');
        else this.enterRoom(parsed.msg);
      }
      return;
    }
    if (this.view.stage !== 'room') return;
    switch (parsed.kind) {
      case 'room':
        this.applyRoom(parsed.msg);
        return;
      case 'bank': {
        const { roomId, raceId, level, op, questions } = parsed.msg;
        if (roomId !== this.view.snap?.roomId || raceId < this.raceId || (this.bank && this.bank.raceId >= raceId)) return;
        // It can arrive before the snapshot that starts its race; keep it for then.
        this.bank = { raceId, level, op, questions };
        this.startIfReady();
        this.refresh();
        return;
      }
      case 'bye':
        if (parsed.msg.id === this.view.snap?.host.id) this.end('closed', 'host-left');
        return;
    }
  }

  private enterRoom(msg: RoomMsg) {
    this.update({ stage: 'room' });
    this.applyRoom(msg);
    this.sendState();
    this.every(GUEST_TICK_MS, () => this.tick());
  }

  private applyRoom(msg: RoomMsg) {
    const { snap } = msg;
    const previous = this.view.snap;
    if (previous && snap.roomId !== previous.roomId) {
      this.end('closed', 'host-left');
      return;
    }
    if (msg.seq <= this.hostSeq) return;
    if (snap.guest && snap.guest.id !== this.deps.me.id) {
      this.end('closed', 'full');
      return;
    }
    const now = this.deps.now();
    this.hostSeq = msg.seq;
    this.lastRoomAt = now;
    this.acked = snap.guestAck;
    if (snap.raceId > this.raceId && (snap.phase === 'countdown' || snap.phase === 'racing')) {
      // A new race: run the lights from where the host's countdown is, or go now if it's already on.
      this.raceId = snap.raceId;
      this.racer = startRacer(snap.raceId, snap.laps);
      this.countdownEndsAt = snap.phase === 'countdown' ? now + COUNTDOWN_MS - (snap.countdownElapsedMs ?? 0) : now;
      this.lightsOut = null;
      if (this.bank && this.bank.raceId !== snap.raceId) this.bank = null;
      this.startIfReady();
    }
    this.update({ snap, hostSilent: false });
    this.refresh();
  }

  /** Lights go out at the end of the countdown, or when the questions arrive if that's later. */
  private startIfReady() {
    if (this.lightsOut !== null || this.countdownEndsAt === null || this.bank?.raceId !== this.raceId) return;
    this.lightsOut = Math.max(this.countdownEndsAt, this.deps.now());
  }

  private tick() {
    const now = this.deps.now();
    if (now - this.lastRoomAt > HOST_GONE_MS) {
      this.end('closed', 'host-left');
      return;
    }
    const silent = now - this.lastRoomAt > HOST_SILENCE_MS;
    if (silent !== this.view.hostSilent) this.update({ hostSilent: silent });
    const unacked = this.seq > this.acked;
    if ((unacked && now - this.lastSentAt >= GUEST_RESEND_MS) || now - this.lastSentAt >= GUEST_HEARTBEAT_MS) this.sendState();
    const racing = this.view.snap?.phase === 'countdown' || this.view.snap?.phase === 'racing';
    if (racing && this.bank?.raceId !== this.raceId && now - this.lastSyncAt >= BANK_RETRY_MS) this.requestSync();
  }

  private requestSync() {
    this.lastSyncAt = this.deps.now();
    const need = this.raceId > 0 && this.bank?.raceId !== this.raceId ? ['room', 'bank'] : ['room'];
    const { id, name } = this.deps.me;
    this.send('sync', { id, name, need });
  }

  private raceMsNow(): number | null {
    const now = this.deps.now();
    if (!this.racer || this.racer.status !== 'racing' || this.lightsOut === null || now < this.lightsOut) return null;
    return now - this.lightsOut;
  }

  private sendState() {
    this.lastSentAt = this.deps.now();
    const { id, name } = this.deps.me;
    this.send('guest', {
      seq: this.seq,
      session: this.session,
      id,
      name,
      agree: this.agreement,
      raceId: this.raceId,
      race: this.racer ? toWire(this.racer) : null,
      raceMs: this.raceMsNow(),
    });
  }

  private changed() {
    this.seq++;
    this.sendState();
    this.refresh();
  }

  private refresh() {
    this.update({ bank: this.bank, racer: this.racer, countdownEndsAt: this.countdownEndsAt, lightsOutAt: this.lightsOut });
  }

  agree(on: boolean) {
    const snap = this.view.snap;
    this.agreement = on && snap ? { raceId: snap.raceId, rev: snap.rev } : null;
    this.changed();
  }

  answer(value: number, responseTimeMs: number): AnswerOutcome {
    const raceMs = this.raceMsNow();
    if (!this.racer || raceMs === null) return 'ignored';
    const { state, outcome } = submitAnswer(this.racer, this.bank, value, responseTimeMs, raceMs);
    if (outcome === 'ignored') return outcome;
    this.racer = state;
    this.changed();
    return outcome;
  }

  retire() {
    const raceMs = this.raceMsNow();
    if (!this.racer || raceMs === null) return;
    this.racer = retireRacer(this.racer, raceMs);
    this.changed();
  }

  leave() {
    this.send('bye', { id: this.deps.me.id });
    this.end('closed', null);
  }
}
