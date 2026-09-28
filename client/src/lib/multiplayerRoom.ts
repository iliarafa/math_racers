/**
 * The room referee. It runs on the host's device only; the guest sees its decisions through
 * the snapshots the host broadcasts. Pure, with the clock passed in on every action, so the
 * rules can be tested without timers or a network.
 *
 * Each device times its own race from its own lights-out, so no clock sync is needed: only
 * durations measured on one device are ever compared.
 */
import {
  AWAY_AFTER_MS,
  COUNTDOWN_MS,
  FINISH_MARGIN_MS,
  LOBBY_DROP_MS,
  RACE_DROP_MS,
  type Agreement,
  type GuestMsg,
  type Level,
  type MathOp,
  type OutReason,
  type Phase,
  type PlayerSnap,
  type RacerWire,
  type RoomSnapshot,
} from './multiplayerProtocol';

export interface RoomPlayer {
  id: string;
  name: string;
  app: string;
  agree: Agreement | null;
  race: RacerWire | null;
  out: OutReason | null;
}

interface SeatedGuest extends RoomPlayer {
  session: string;
  /** The highest seq applied from this session; echoed back as the acknowledgement. */
  seq: number;
  lastSeenAt: number;
  /** Said goodbye. Shown as away until a message from the same player brings them back. */
  gone: boolean;
  /** The guest's race time as last reported, and when that report arrived (host clock). */
  clock: { raceMs: number; recvAt: number } | null;
}

export interface RaceResult {
  winnerId: string | null;
  /** False while a car that could still win is racing (or its finish may be in flight). */
  final: boolean;
}

export interface RoomState {
  roomId: string;
  code: string;
  phase: Phase;
  rev: number;
  level: Level;
  op: MathOp;
  circuit: { id: string; name: string };
  laps: number;
  raceId: number;
  countdownStartedAt: number | null;
  host: RoomPlayer;
  guest: SeatedGuest | null;
  result: RaceResult | null;
}

export type RoomAction =
  | { type: 'guest'; msg: GuestMsg; now: number }
  | { type: 'guestBye'; id: string; now: number }
  | { type: 'settings'; level?: Level; op?: MathOp }
  /** Lobby: Start race. Results: Race again. */
  | { type: 'hostAgree'; now: number }
  | { type: 'hostRace'; race: RacerWire; now: number }
  | { type: 'tick'; now: number };

export function createRoom(init: {
  roomId: string;
  code: string;
  host: { id: string; name: string; app: string };
  level: Level;
  op: MathOp;
  circuit: { id: string; name: string };
  laps: number;
}): RoomState {
  return {
    roomId: init.roomId,
    code: init.code,
    phase: 'lobby',
    rev: 1,
    level: init.level,
    op: init.op,
    circuit: init.circuit,
    laps: init.laps,
    raceId: 0,
    countdownStartedAt: null,
    host: { ...init.host, agree: null, race: null, out: null },
    guest: null,
    result: null,
  };
}

/** Returns the same object when nothing changed, so the host only broadcasts real changes. */
export function reduceRoom(s: RoomState, a: RoomAction): RoomState {
  if (a.type === 'settings') return changeSettings(s, a.level, a.op);
  const before = settle(s, a.now);
  return settle(apply(before, a), a.now);
}

export function toSnapshot(s: RoomState, now: number): RoomSnapshot {
  const player = (p: RoomPlayer, away: boolean): PlayerSnap => ({
    id: p.id, name: p.name, app: p.app, agree: p.agree, away, out: p.out, race: p.race,
  });
  return {
    roomId: s.roomId,
    code: s.code,
    phase: s.phase,
    rev: s.rev,
    level: s.level,
    op: s.op,
    circuitId: s.circuit.id,
    circuitName: s.circuit.name,
    laps: s.laps,
    raceId: s.raceId,
    countdownElapsedMs: s.phase === 'countdown' && s.countdownStartedAt !== null ? Math.max(0, now - s.countdownStartedAt) : null,
    host: player(s.host, false),
    guest: s.guest ? player(s.guest, isAway(s.guest, now)) : null,
    result: s.result,
    guestAck: s.guest?.seq ?? 0,
  };
}

/** The host's lights-out on its own clock. */
export function lightsOutAt(s: RoomState): number | null {
  return s.countdownStartedAt === null ? null : s.countdownStartedAt + COUNTDOWN_MS;
}

// ---------------------------------------------------------------- actions

function apply(s: RoomState, a: Exclude<RoomAction, { type: 'settings' }>): RoomState {
  switch (a.type) {
    case 'guest':
      return onGuest(s, a.msg, a.now);
    case 'guestBye':
      if (s.guest?.id !== a.id) return s;
      if (s.phase === 'lobby') return removeGuest(s);
      // Results keep the guest's race on the podium; mid-race, leaving is a DNF.
      return { ...s, guest: { ...s.guest, gone: true, out: s.phase !== 'results' && isStillRacing(s.guest) ? 'left' : s.guest.out } };
    case 'hostAgree':
      return isBetweenRaces(s) ? { ...s, host: { ...s.host, agree: { raceId: s.raceId, rev: s.rev } } } : s;
    case 'hostRace':
      return acceptRace(s, s.host.race, a.race) ? { ...s, host: { ...s.host, race: a.race } } : s;
    case 'tick':
      return s;
  }
}

function changeSettings(s: RoomState, level?: Level, op?: MathOp): RoomState {
  if (!isBetweenRaces(s)) return s;
  const next = { level: level ?? s.level, op: op ?? s.op };
  if (next.level === s.level && next.op === s.op) return s;
  // A new revision voids every Ready given for the old settings, including the host's own.
  return { ...s, ...next, rev: s.rev + 1, host: { ...s.host, agree: null } };
}

function onGuest(s: RoomState, msg: GuestMsg, now: number): RoomState {
  if (msg.id === s.host.id) return s;
  const g = s.guest;

  if (!g) {
    if (s.phase !== 'lobby') return s;
    return {
      ...s,
      guest: {
        id: msg.id, name: msg.name, app: msg.app, agree: msg.agree, race: null, out: null,
        session: msg.session, seq: msg.seq, lastSeenAt: now, gone: false, clock: null,
      },
    };
  }
  if (msg.id !== g.id) return s;

  if (msg.session !== g.session) {
    // A reloaded page starts its seq again. Mid-race it has lost its car: that is leaving the race.
    const midRace = !isBetweenRaces(s);
    return {
      ...s,
      guest: {
        ...g,
        name: msg.name,
        app: msg.app,
        agree: midRace ? g.agree : msg.agree,
        out: midRace && isStillRacing(g) ? 'left' : g.out,
        session: msg.session,
        seq: msg.seq,
        lastSeenAt: now,
        gone: false,
      },
    };
  }

  // An older message still proves the guest is there, but must not undo a newer one.
  if (msg.seq < g.seq) return { ...s, guest: { ...g, lastSeenAt: now, gone: false } };

  const race = g.out === null && msg.race && acceptRace(s, g.race, msg.race) ? msg.race : g.race;
  const clock = s.phase === 'racing' && msg.raceId === s.raceId && msg.raceMs !== null
    ? { raceMs: msg.raceMs, recvAt: now }
    : g.clock;
  return { ...s, guest: { ...g, name: msg.name, app: msg.app, agree: msg.agree, race, seq: msg.seq, lastSeenAt: now, gone: false, clock } };
}

/** Race updates belong to this race, only grow, never leave a finish, and a finish must add up. */
function acceptRace(s: RoomState, current: RacerWire | null, next: RacerWire): boolean {
  if (s.phase !== 'racing' || next.raceId !== s.raceId || next.laps.length > s.laps) return false;
  if (current) {
    if (current.st !== 'racing' || next.laps.length < current.laps.length) return false;
  }
  if (next.st !== 'racing' && next.ms === null) return false;
  if (next.st === 'finished') {
    if (next.laps.length !== s.laps || next.ms === null) return false;
    // Race time covers every lap's answer time plus the pauses between questions.
    if (next.ms < next.laps.reduce((sum, lap) => sum + lap.t, 0)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- time and consequences

function settle(s: RoomState, now: number): RoomState {
  let next = s;
  if (next.phase === 'countdown' && next.countdownStartedAt !== null && now >= next.countdownStartedAt + COUNTDOWN_MS) {
    next = { ...next, phase: 'racing' };
  }
  next = dropSilentGuest(next, now);
  if (canStart(next, now)) next = startRace(next, now);
  if (next.phase === 'racing') next = settleResult(next, now);
  return next;
}

/**
 * The lobby frees the seat for another friend. A race marks the silent guest out. Results keep
 * the guest (shown as away) so the podium stays whole; a rematch simply waits for them.
 */
function dropSilentGuest(s: RoomState, now: number): RoomState {
  const g = s.guest;
  if (!g) return s;
  const silent = now - g.lastSeenAt;
  if (s.phase === 'lobby') return silent > LOBBY_DROP_MS ? removeGuest(s) : s;
  if (s.phase === 'results') return s;
  if (silent > RACE_DROP_MS && g.out === null && isStillRacing(g)) return { ...s, guest: { ...g, out: 'disconnected' } };
  return s;
}

function removeGuest(s: RoomState): RoomState {
  // The host's Start was for the guest who left; a new guest needs a new one.
  return { ...s, guest: null, host: { ...s.host, agree: null } };
}

function canStart(s: RoomState, now: number): boolean {
  const g = s.guest;
  if (!isBetweenRaces(s) || !g || isAway(g, now)) return false;
  const agrees = (a: Agreement | null) => a !== null && a.raceId === s.raceId && a.rev === s.rev;
  return agrees(s.host.agree) && agrees(g.agree);
}

function startRace(s: RoomState, now: number): RoomState {
  const fresh = { agree: null, race: null, out: null };
  return {
    ...s,
    phase: 'countdown',
    raceId: s.raceId + 1,
    countdownStartedAt: now,
    result: null,
    host: { ...s.host, ...fresh },
    guest: s.guest ? { ...s.guest, ...fresh, clock: null } : null,
  };
}

function settleResult(s: RoomState, now: number): RoomState {
  const result = decideResult(s, now);
  const sameResult = result === s.result
    || (result !== null && s.result !== null && result.winnerId === s.result.winnerId && result.final === s.result.final);
  const next = sameResult ? s : { ...s, result };
  const everyoneStopped = racers(next).every((p) => !isStillRacing(p) || p.out !== null);
  return everyoneStopped && next.result?.final ? { ...next, phase: 'results' } : next;
}

function decideResult(s: RoomState, now: number): RaceResult | null {
  if (s.result?.final) return s.result;
  const all = racers(s);
  const finishers = all
    .filter((p) => p.race?.st === 'finished' && p.race.ms !== null)
    .sort((a, b) => a.race!.ms! - b.race!.ms! || a.race!.warn - b.race!.warn || (a === s.host ? -1 : 1));
  const leader = finishers[0];
  const racing = all.filter((p) => p.out === null && isStillRacing(p));
  if (!leader) return racing.length === 0 ? { winnerId: null, final: true } : null;

  const leaderMs = leader.race!.ms!;
  const beaten = (p: RoomPlayer): boolean => {
    if (p === s.host) {
      // The host's own clock: exact.
      const lightsOut = lightsOutAt(s);
      return lightsOut !== null && now - lightsOut > leaderMs;
    }
    // The guest's last report plus the time since it arrived never overestimates its race time;
    // the margin covers a finish of its that is still on the way.
    const clock = s.guest?.clock;
    return !!clock && clock.raceMs + (now - clock.recvAt) > leaderMs + FINISH_MARGIN_MS;
  };
  return { winnerId: leader.id, final: racing.every(beaten) };
}

// ---------------------------------------------------------------- helpers

function racers(s: RoomState): RoomPlayer[] {
  return s.guest ? [s.host, s.guest] : [s.host];
}

function isBetweenRaces(s: RoomState): boolean {
  return s.phase === 'lobby' || s.phase === 'results';
}

/** Still on track: no car yet (lights just out) or a car that hasn't stopped. */
function isStillRacing(p: RoomPlayer): boolean {
  return p.race === null || p.race.st === 'racing';
}

function isAway(g: SeatedGuest, now: number): boolean {
  return g.gone || now - g.lastSeenAt > AWAY_AFTER_MS;
}
