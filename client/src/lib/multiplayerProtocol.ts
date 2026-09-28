/**
 * Multiplayer v2 wire protocol: topic names, room codes, message shapes and their validation.
 *
 * Messages cross devices that may run different app builds (an App Store build can trail the
 * web by weeks), so every shape here is a contract between versions: change one, bump
 * PROTOCOL_VERSION. The version is checked before the shape, so a newer friend's message is
 * reported as "different version" instead of being dropped as garbage.
 */
import { z } from 'zod';
import type { Difficulty } from '@shared/mathEngine';

export const PROTOCOL_VERSION = 1;

const TOPIC_FAMILY = 'mathracer:mp2';

/** `dev` keeps rooms opened from the dev server apart from players' rooms on the same project. */
export type MpEnv = 'live' | 'dev';

export function roomTopic(env: MpEnv, code: string): string {
  return `${TOPIC_FAMILY}:${env}:${code}`;
}

const ROOM_CODE_RE = /^[1-9]\d{3}$/;

/** Four digits, no leading zero, so a code is typed on the race keypad and read aloud as a number. */
export function isRoomCode(s: string): boolean {
  return ROOM_CODE_RE.test(s);
}

export function randomRoomCode(random: () => number = Math.random): string {
  return String(1000 + Math.floor(random() * 9000));
}

/** Lights 1–5 come on a second apart and go out at 6 s, as in Game.tsx's countdown. */
export const COUNTDOWN_MS = 6000;
/**
 * The longest one-way delay the referee allows for. A car that finished just ahead of the
 * leader can have its finish still in flight; it is only ruled out once its race clock has
 * run this far past the leader's time.
 */
export const FINISH_MARGIN_MS = 1500;
/** A guest silent this long is shown as away (it sends its state every GUEST_HEARTBEAT_MS). */
export const AWAY_AFTER_MS = 9000;
/** An away guest leaves the lobby or the results after this long… */
export const LOBBY_DROP_MS = 20_000;
/** …and is out of a race (a DNF) after this long. */
export const RACE_DROP_MS = 60_000;

/** A host listens this long for another host already on its code before taking it. */
export const CODE_PROBE_MS = 1500;
/** A joining guest gives up with "no race with that code" after this long… */
export const JOIN_TIMEOUT_MS = 4000;
/** …asking again this often, in case a request or reply was lost. */
export const SYNC_RETRY_MS = 800;
/** The host re-sends the room this often even when nothing changed, so the guest knows it's there. */
export const HOST_HEARTBEAT_MS = 3000;
/** The guest re-sends a change this often until the host acknowledges it… */
export const GUEST_RESEND_MS = 1500;
/** …and its state this often anyway, for the host's away check and race clock. */
export const GUEST_HEARTBEAT_MS = 4000;
/** While the race's questions are missing, the guest asks for them this often. */
export const BANK_RETRY_MS = 1000;
/** The guest shows "Waiting for the host" after this long without a room message… */
export const HOST_SILENCE_MS = 7000;
/** …and treats the room as closed after this long. */
export const HOST_GONE_MS = 60_000;

/** The five maths types; ids are the `Circuit.type` strings the setup rows use. */
export const MATH_OPS = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'] as const;
export type MathOp = (typeof MATH_OPS)[number];

export type Level = Difficulty;
const LEVELS = ['beginner', 'easy', 'medium', 'hard', 'pro'] as const satisfies readonly Level[];

const count = z.number().int().min(0);
/** Durations in ms; an hour is far beyond any real lap or race. */
const duration = z.number().int().min(0).max(3_600_000);
const playerId = z.string().min(1).max(64);
const playerName = z.string().min(1).max(20);
const appVersion = z.string().max(20);

const lapWire = z.object({
  /** Response time: from the question appearing to the correct answer, retries included. */
  t: duration,
  /** The lap needed a retry (a red sector). */
  r: z.boolean(),
});

const racerWire = z.object({
  raceId: count,
  laps: z.array(lapWire).max(200),
  /** Wrong tries on the current question. */
  att: count,
  /** Wrong answers so far this race. */
  warn: count,
  st: z.enum(['racing', 'finished', 'crashed', 'retired']),
  /** Race time when the racer stopped: at the finish, the crash or the retirement. */
  ms: duration.nullable(),
});

/** "Start the race that follows `raceId`, with settings revision `rev`." */
const agreement = z.object({ raceId: count, rev: count });

const playerSnap = z.object({
  id: playerId,
  name: playerName,
  app: appVersion,
  agree: agreement.nullable(),
  away: z.boolean(),
  /** A DNF the referee gave: the player left mid-race, or stayed away too long. */
  out: z.enum(['left', 'disconnected']).nullable(),
  race: racerWire.nullable(),
});

const roomSnapshot = z.object({
  roomId: z.string().min(1).max(64),
  code: z.string().regex(ROOM_CODE_RE),
  phase: z.enum(['lobby', 'countdown', 'racing', 'results']),
  /** Settings revision; a Ready given for an older revision no longer counts. */
  rev: count,
  level: z.enum(LEVELS),
  op: z.enum(MATH_OPS),
  circuitId: z.string().min(1).max(40),
  circuitName: z.string().min(1).max(40),
  laps: z.number().int().min(1).max(200),
  /** 0 until the first race starts. */
  raceId: count,
  /** Time since the countdown started, so a guest can join the lights part-way. */
  countdownElapsedMs: duration.nullable(),
  host: playerSnap,
  guest: playerSnap.nullable(),
  result: z.object({ winnerId: playerId.nullable(), final: z.boolean() }).nullable(),
  /** The highest guest `seq` the host has applied. */
  guestAck: count,
});

const bankQuestion = z.object({
  display: z.string().min(1).max(24),
  answer: z.number().int(),
  num1: z.number().int().optional(),
  num2: z.number().int().optional(),
});

const versioned = { v: z.literal(PROTOCOL_VERSION), app: appVersion };

const SCHEMAS = {
  room: z.object({ ...versioned, seq: count, snap: roomSnapshot }),
  bank: z.object({
    ...versioned,
    roomId: z.string().min(1).max(64),
    raceId: count,
    level: z.enum(LEVELS),
    op: z.enum(MATH_OPS),
    questions: z.array(bankQuestion).min(1).max(200),
  }),
  guest: z.object({
    ...versioned,
    seq: count,
    /** New for every page load, so a reloaded guest's `seq` restarting at 1 is not taken as stale. */
    session: z.string().min(1).max(64),
    id: playerId,
    name: playerName,
    agree: agreement.nullable(),
    raceId: count,
    race: racerWire.nullable(),
    /** The guest's race time when it sent this, for the referee's "can they still win" check. */
    raceMs: duration.nullable(),
  }),
  sync: z.object({ ...versioned, id: playerId, name: playerName, need: z.array(z.enum(['room', 'bank'])).max(2) }),
  bye: z.object({ ...versioned, id: playerId }),
};

export type LapWire = z.infer<typeof lapWire>;
export type RacerWire = z.infer<typeof racerWire>;
export type RacerStatus = RacerWire['st'];
export type Agreement = z.infer<typeof agreement>;
export type PlayerSnap = z.infer<typeof playerSnap>;
export type OutReason = NonNullable<PlayerSnap['out']>;
export type RoomSnapshot = z.infer<typeof roomSnapshot>;
export type Phase = RoomSnapshot['phase'];
export type BankQuestion = z.infer<typeof bankQuestion>;
export type RoomMsg = z.infer<typeof SCHEMAS.room>;
export type BankMsg = z.infer<typeof SCHEMAS.bank>;
export type GuestMsg = z.infer<typeof SCHEMAS.guest>;
export type SyncMsg = z.infer<typeof SCHEMAS.sync>;
export type ByeMsg = z.infer<typeof SCHEMAS.bye>;
export type MpEvent = keyof typeof SCHEMAS;

export type Parsed =
  | { kind: 'room'; msg: RoomMsg }
  | { kind: 'bank'; msg: BankMsg }
  | { kind: 'guest'; msg: GuestMsg }
  | { kind: 'sync'; msg: SyncMsg }
  | { kind: 'bye'; msg: ByeMsg }
  | { kind: 'version'; v: number; app: string | null }
  | { kind: 'invalid' };

const INVALID: Parsed = { kind: 'invalid' };

export function parseMessage(event: string, payload: unknown): Parsed {
  if (typeof payload !== 'object' || payload === null) return INVALID;
  const { v, app } = payload as { v?: unknown; app?: unknown };
  if (typeof v !== 'number') return INVALID;
  if (v !== PROTOCOL_VERSION) {
    return { kind: 'version', v, app: typeof app === 'string' ? app.slice(0, 20) : null };
  }
  if (!Object.hasOwn(SCHEMAS, event)) return INVALID;
  const result = SCHEMAS[event as MpEvent].safeParse(payload);
  return result.success ? ({ kind: event, msg: result.data } as Parsed) : INVALID;
}
