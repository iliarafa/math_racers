/**
 * Fact mastery: per-fact response statistics built from a race's lapResults,
 * so the finish screen can say "You got faster at 7 × 8" and the trophies
 * page can count mastered facts. Pure; persisted in GameState.factStats.
 */

export type FactStat = {
  /** Every attempt, clean or not. */
  seen: number;
  /** Attempts answered right first time. */
  correct: number;
  bestMs: number;
  lastMs: number;
  /** Exponential moving average of clean-answer times. */
  ewmaMs: number;
  /** Epoch ms of the last attempt; the eviction key when the store is full. */
  lastAt: number;
  /**
   * Epoch ms of a miss still owed: set by a session that missed the fact, cleared by a clean answer
   * in a later session. lib/questionPicker.ts asks owed facts again. Absent when nothing is owed.
   */
  missedAt?: number;
};

export type FactStats = Record<string, FactStat>;

/**
 * A lapResults row, reduced to what mastery needs. Flashcards send one per graded card; Lane
 * Racer sends a NaN responseTime, as its answers are picked and timed by the track: a wrong pick
 * is a miss, a right one only counts as seen.
 */
export type FactRow = {
  fact?: string;
  responseTime: number;
  wrongAttempts?: number[];
  /** The duplicate sector entry an AERO boost adds; not a second answer. */
  isBonus?: boolean;
  result?: 'correct' | 'incorrect';
};

export const FACT_STATS_CAP = 400;
export const MASTERY_MIN_CORRECT = 3;
export const EWMA_ALPHA = 0.3;
/** A session mean under this share of the prior average counts as a speed-up. */
export const IMPROVEMENT_RATIO = 0.85;
/** Slower answers count as seen but not timed: the question clock keeps running through a pause. */
export const MAX_TIMED_MS = 60_000;

/** Moving average a fact must be under to count as mastered, per operation. */
export const MASTERY_MS: Record<string, number> = {
  Addition: 4000,
  Subtraction: 4500,
  Multiplication: 4000,
  Division: 5000,
  Variables: 6000,
};
const DEFAULT_MASTERY_MS = 5000;

const EMPTY_STAT: FactStat = { seen: 0, correct: 0, bestMs: 0, lastMs: 0, ewmaMs: 0, lastAt: 0 };

type QuestionLike = { display: string; num1?: number; num2?: number; operation?: string };

/**
 * Stable key for a question. Commutative operations are normalised so 7×8 and
 * 8×7 are one fact. Variables use the display because their three formats
 * overload num1/num2.
 */
export function factKey(q: QuestionLike): string {
  const op = q.operation ?? '';
  const compact = q.display.replace(/\s+/g, '');
  if (op === 'Variables') return `var:${compact}`;
  if (typeof q.num1 !== 'number' || typeof q.num2 !== 'number') return `${op}:${compact}`;
  const [a, b] = [q.num1, q.num2];
  switch (op) {
    case 'Addition': return `${Math.min(a, b)}+${Math.max(a, b)}`;
    case 'Multiplication': return `${Math.min(a, b)}x${Math.max(a, b)}`;
    case 'Subtraction': return `${a}-${b}`;
    case 'Division': return `${a}/${b}`;
    default: return `${op}:${compact}`;
  }
}

const NUMERIC_KEY = /^(\d+)([+x\-/])(\d+)$/;
const OP_BY_SYMBOL: Record<string, string> = { '+': 'Addition', x: 'Multiplication', '-': 'Subtraction', '/': 'Division' };
const LABEL_SYMBOL: Record<string, string> = { '+': '+', x: '×', '-': '−', '/': '÷' };

export function factOperation(key: string): string {
  if (key.startsWith('var:')) return 'Variables';
  const m = NUMERIC_KEY.exec(key);
  if (m) return OP_BY_SYMBOL[m[2]];
  const colon = key.indexOf(':');
  return colon > 0 ? key.slice(0, colon) : 'Unknown';
}

/** Human form of a key: '7x8' → '7 × 8', 'var:x+3=7' → 'x + 3 = 7'. */
export function factLabel(key: string): string {
  const m = NUMERIC_KEY.exec(key);
  if (m) return `${m[1]} ${LABEL_SYMBOL[m[2]]} ${m[3]}`;
  const colon = key.indexOf(':');
  const body = colon > 0 ? key.slice(colon + 1) : key;
  return body.replace(/([+−×÷=])/g, ' $1 ').replace(/\s+/g, ' ').trim();
}

/** A fact rebuilt from its key: the operands and display generateQuestion would have used. */
export type ParsedFact = {
  operation: 'Addition' | 'Subtraction' | 'Multiplication' | 'Division' | 'Variables';
  display: string;
  answer: number;
  num1: number;
  num2: number;
  /** Variables only: x + a = b, a − x = b or ax = b. */
  form?: 'plus' | 'minus' | 'times';
};

const VAR_PLUS = /^x\+(\d+)=(\d+)$/;
const VAR_MINUS = /^(\d+)−x=(\d+)$/;
const VAR_TIMES = /^(\d+)x=(\d+)$/;

/**
 * The inverse of factKey, so an owed fact can be asked again. Null for keys no generated question
 * makes (a fallback `Operation:display` key, a negative or fractional answer).
 */
export function parseFactKey(key: string): ParsedFact | null {
  const m = NUMERIC_KEY.exec(key);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    switch (m[2]) {
      case '+': return { operation: 'Addition', display: `${a} + ${b}`, answer: a + b, num1: a, num2: b };
      case 'x': return { operation: 'Multiplication', display: `${a} × ${b}`, answer: a * b, num1: a, num2: b };
      case '-': return a >= b ? { operation: 'Subtraction', display: `${a} − ${b}`, answer: a - b, num1: a, num2: b } : null;
      default: return b > 0 && a % b === 0 ? { operation: 'Division', display: `${a} ÷ ${b}`, answer: a / b, num1: a, num2: b } : null;
    }
  }
  if (!key.startsWith('var:')) return null;
  // num1/num2 follow generateQuestion: num2 is the constant (or the coefficient) the bot's timing reads.
  const body = key.slice(4);
  const plus = VAR_PLUS.exec(body);
  if (plus) {
    const [a, b] = [Number(plus[1]), Number(plus[2])];
    return b > a ? { operation: 'Variables', form: 'plus', display: `x + ${a} = ${b}`, answer: b - a, num1: b, num2: a } : null;
  }
  const minus = VAR_MINUS.exec(body);
  if (minus) {
    const [a, b] = [Number(minus[1]), Number(minus[2])];
    return a > b ? { operation: 'Variables', form: 'minus', display: `${a} − x = ${b}`, answer: a - b, num1: a, num2: b } : null;
  }
  const times = VAR_TIMES.exec(body);
  if (times) {
    const [c, b] = [Number(times[1]), Number(times[2])];
    return c > 0 && b % c === 0 && b > 0 ? { operation: 'Variables', form: 'times', display: `${c}x = ${b}`, answer: b / c, num1: b, num2: c } : null;
  }
  return null;
}

function masteryThreshold(key: string): number {
  return MASTERY_MS[factOperation(key)] ?? DEFAULT_MASTERY_MS;
}

export function isMastered(key: string, stat: FactStat | undefined): boolean {
  return !!stat && stat.correct >= MASTERY_MIN_CORRECT && stat.ewmaMs > 0 && stat.ewmaMs <= masteryThreshold(key);
}

export type FactClass = 'new' | 'learning' | 'mastered';

export function factClass(key: string, stat: FactStat | undefined): FactClass {
  if (!stat || stat.seen === 0) return 'new';
  return isMastered(key, stat) ? 'mastered' : 'learning';
}

/** True when the fact was missed before `sessionStart` and not answered clean in a session since. */
export function isOwed(stat: FactStat | undefined, sessionStart: number): boolean {
  return !!stat && (stat.missedAt ?? 0) > 0 && (stat.missedAt as number) < sessionStart;
}

/** Facts of one operation owed from earlier sessions, the most recent miss first. */
export function owedFacts(stats: FactStats, operation: string, sessionStart: number): string[] {
  return Object.keys(stats)
    .filter((key) => factOperation(key) === operation && isOwed(stats[key], sessionStart))
    .sort((a, b) => (stats[b].missedAt as number) - (stats[a].missedAt as number));
}

export type Improvement = { fact: string; beforeMs: number; afterMs: number };

export type IngestOutcome = {
  stats: FactStats;
  improved: Improvement[];
  newlyMastered: string[];
};

/**
 * Fold one batch of a session's rows into the store. Returns the new store and what changed.
 * `sessionStart` (the session's first question; defaults to `now`, a batch per session) decides
 * which misses a clean answer pays off: only ones from before the session, so a fact missed and
 * then got right in the same session is still owed next time.
 */
export function ingestSession(stats: FactStats, rows: readonly FactRow[], now: number, sessionStart: number = now): IngestOutcome {
  const next: FactStats = { ...stats };
  const cleanTimes = new Map<string, number[]>();
  const touched = new Set<string>();
  const missed = new Set<string>();

  for (const r of rows) {
    if (!r.fact || r.isBonus) continue;
    touched.add(r.fact);
    // A time past the cap was not spent answering (paused, BOX open, app in the background).
    const timed = Number.isFinite(r.responseTime) && r.responseTime >= 0 && r.responseTime <= MAX_TIMED_MS;
    const miss = r.result === 'incorrect' || (r.wrongAttempts !== undefined && r.wrongAttempts.length > 0);
    if (miss) missed.add(r.fact);
    const clean = timed && !miss;
    const prev = next[r.fact] ?? EMPTY_STAT;
    const updated: FactStat = { ...prev, seen: prev.seen + 1, lastAt: now };
    if (clean) {
      const ms = r.responseTime;
      updated.correct = prev.correct + 1;
      updated.bestMs = prev.bestMs > 0 ? Math.min(prev.bestMs, ms) : ms;
      updated.lastMs = ms;
      updated.ewmaMs = prev.ewmaMs > 0 ? Math.round(EWMA_ALPHA * ms + (1 - EWMA_ALPHA) * prev.ewmaMs) : ms;
      const times = cleanTimes.get(r.fact);
      if (times) times.push(ms);
      else cleanTimes.set(r.fact, [ms]);
    }
    next[r.fact] = updated;
  }

  // A miss is owed until a clean answer in a later session pays it off.
  touched.forEach((fact) => {
    if (missed.has(fact)) {
      next[fact] = { ...next[fact], missedAt: now };
    } else if (cleanTimes.has(fact) && isOwed(next[fact], sessionStart)) {
      const { missedAt: _paid, ...rest } = next[fact];
      next[fact] = rest;
    }
  });

  const improved: Improvement[] = [];
  cleanTimes.forEach((times, fact) => {
    const prior = stats[fact];
    if (!prior || prior.seen < 2 || prior.ewmaMs <= 0) return;
    const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
    if (mean < prior.ewmaMs * IMPROVEMENT_RATIO) {
      improved.push({ fact, beforeMs: prior.ewmaMs, afterMs: Math.round(mean) });
    }
  });

  const newlyMastered = Array.from(cleanTimes.keys()).filter((fact) => !isMastered(fact, stats[fact]) && isMastered(fact, next[fact]));

  const overflow = Object.keys(next).length - FACT_STATS_CAP;
  if (overflow > 0) {
    // Least recently seen go first, owed facts last, but never this session's facts: a device
    // clock that was set back can leave older rows stamped later than `now`.
    const owed = (key: string) => ((next[key].missedAt ?? 0) > 0 ? 1 : 0);
    const evictable = Object.keys(next).filter((key) => !touched.has(key));
    evictable.sort((a, b) => owed(a) - owed(b) || next[a].lastAt - next[b].lastAt);
    for (const key of evictable.slice(0, overflow)) delete next[key];
  }

  return { stats: next, improved, newlyMastered };
}

export function countMastered(stats: FactStats): number {
  return Object.keys(stats).filter((key) => isMastered(key, stats[key])).length;
}

export type OperationSummary = { mastered: number; learning: number };

export function summarizeByOperation(stats: FactStats): Record<string, OperationSummary> {
  const out: Record<string, OperationSummary> = {};
  for (const key of Object.keys(stats)) {
    const op = factOperation(key);
    const bucket = out[op] ?? (out[op] = { mastered: 0, learning: 0 });
    if (isMastered(key, stats[key])) bucket.mastered += 1;
    else bucket.learning += 1;
  }
  return out;
}

/** One line for the finish screen, or null when nothing notable happened. */
export function pickCallout(outcome: Pick<IngestOutcome, 'improved' | 'newlyMastered'>): string | null {
  if (outcome.improved.length > 0) {
    const best = outcome.improved.reduce((a, b) => (b.beforeMs - b.afterMs > a.beforeMs - a.afterMs ? b : a));
    return `You got faster at ${factLabel(best.fact)}`;
  }
  if (outcome.newlyMastered.length > 0) return `${factLabel(outcome.newlyMastered[0])} mastered`;
  return null;
}

const STAT_FIELDS: (keyof FactStat)[] = ['seen', 'correct', 'bestMs', 'lastMs', 'ewmaMs', 'lastAt'];

export function sanitizeFactStats(raw: unknown): FactStats {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: FactStats = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    if (!STAT_FIELDS.every((f) => typeof v[f] === 'number' && Number.isFinite(v[f] as number) && (v[f] as number) >= 0)) continue;
    const entry: FactStat = { seen: v.seen as number, correct: v.correct as number, bestMs: v.bestMs as number, lastMs: v.lastMs as number, ewmaMs: v.ewmaMs as number, lastAt: v.lastAt as number };
    // Optional: older saves have none, and only a real timestamp means a miss is owed.
    if (typeof v.missedAt === 'number' && Number.isFinite(v.missedAt) && v.missedAt > 0) entry.missedAt = v.missedAt;
    out[key] = entry;
  }
  return out;
}
