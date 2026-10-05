/**
 * Question picking from fact stats. A missed question comes back REASK_MIN–REASK_MAX questions
 * later in the same session, and facts owed from earlier sessions (FactStat.missedAt) are mixed in
 * once they fit the level, so practice lands on what the kid got wrong. Most questions stay fresh
 * ones from generateQuestion: after a WARM_UP, at most one question in three is a re-ask and at
 * most one in four an owed fact. Pure; Game.tsx, LaneRacer.tsx and the flashcard deck builder
 * keep the state and fall back to generateQuestion when nothing is picked.
 */
import { operandRange, raceBotTimeMs, type Difficulty, type Question } from '@shared/mathEngine';
import { parseFactKey, type ParsedFact } from './factMastery';

/** A missed question comes back this many questions later, at random so it can't be timed. */
export const REASK_MIN = 3;
export const REASK_MAX = 5;
/** A re-ask still waiting this long past its slot is dropped; the miss is owed next session anyway. */
export const REASK_GRACE = 3;
/** One fact comes back at most this many times in a session. */
export const REASKS_PER_FACT = 2;
/** The session's first questions are always fresh. */
export const WARM_UP = 2;
/** Fresh questions between two targeted ones (re-asks and owed facts): at most one in three. */
export const MIN_FRESH_BETWEEN = 2;
/** Fresh questions before an owed fact: they take at most one question in four. */
export const OWED_FRESH_BETWEEN = 3;

type QuestionLike = { display: string };

export type Reask<Q extends QuestionLike> = { question: Q; key: string; due: number };

export type Picker<Q extends QuestionLike> = {
  /** Wall clock at the session's start: misses before it are owed from earlier sessions. */
  startedAt: number;
  /** Index of the question on screen, counted from 0; -1 before the first. */
  serial: number;
  reasks: Reask<Q>[];
  /** Times each fact has been sent back this session. */
  sentBack: Record<string, number>;
  /** The serial whose miss is already queued: a second miss on one question queues nothing. */
  missNoted: number;
  /** Owed facts not yet asked this session, the most recent miss first (owedFacts). */
  owed: string[];
  /** Serial of the last re-ask or owed fact; -Infinity before any. */
  lastTargeted: number;
};

export function startPicker<Q extends QuestionLike>(owed: readonly string[], startedAt: number): Picker<Q> {
  return { startedAt, serial: -1, reasks: [], sentBack: {}, missNoted: -1, owed: [...owed], lastTargeted: -Infinity };
}

/**
 * A miss on the question on screen (`key` from factKey): it comes back REASK_MIN–REASK_MAX
 * questions later, at most REASKS_PER_FACT times a session, and leaves the owed list, since this
 * session now handles it. One entry per fact, so a question missed again moves to its new slot.
 */
export function noteMiss<Q extends QuestionLike>(picker: Picker<Q>, question: Q, key: string, rand: () => number = Math.random): Picker<Q> {
  if (picker.missNoted === picker.serial) return picker;
  const owed = picker.owed.filter((k) => k !== key);
  const sent = picker.sentBack[key] ?? 0;
  if (sent >= REASKS_PER_FACT) return { ...picker, missNoted: picker.serial, owed };
  const gap = REASK_MIN + Math.floor(rand() * (REASK_MAX - REASK_MIN + 1));
  return {
    ...picker,
    missNoted: picker.serial,
    owed,
    sentBack: { ...picker.sentBack, [key]: sent + 1 },
    reasks: [...picker.reasks.filter((r) => r.key !== key), { question, key, due: picker.serial + gap }],
  };
}

export type PickOptions<Q> = {
  /** OVERTAKE asks for a harder question: serve a fresh one and keep everything queued. */
  harder?: boolean;
  previousDisplay?: string;
  /** Builds an owed fact for the current level, or null while it doesn't fit (factQuestion). */
  owedQuestion?: (key: string) => Q | null;
};

export type PickResult<Q extends QuestionLike> = { picker: Picker<Q>; question: Q | null; kind: 'reask' | 'owed' | null };

/**
 * The next question: the earliest due re-ask, else the first owed fact that fits, else null for a
 * fresh question. Call it for every question, the first included.
 */
export function pickNext<Q extends QuestionLike>(picker: Picker<Q>, opts: PickOptions<Q> = {}): PickResult<Q> {
  const serial = picker.serial + 1;
  const reasks = picker.reasks.filter((r) => r.due + REASK_GRACE >= serial);
  const base: Picker<Q> = { ...picker, serial, reasks };
  const fresh: PickResult<Q> = { picker: base, question: null, kind: null };
  if (opts.harder || serial < WARM_UP) return fresh;
  const freshSince = serial - picker.lastTargeted - 1;
  if (freshSince < MIN_FRESH_BETWEEN) return fresh;

  let due = -1;
  reasks.forEach((r, i) => {
    if (r.due > serial || r.question.display === opts.previousDisplay) return;
    if (due === -1 || r.due < reasks[due].due) due = i;
  });
  if (due !== -1) {
    return {
      picker: { ...base, reasks: reasks.filter((_, i) => i !== due), lastTargeted: serial },
      question: reasks[due].question,
      kind: 'reask',
    };
  }

  if (freshSince < OWED_FRESH_BETWEEN || !opts.owedQuestion) return fresh;
  for (let i = 0; i < picker.owed.length; i++) {
    const question = opts.owedQuestion(picker.owed[i]);
    if (!question || question.display === opts.previousDisplay) continue;
    return {
      picker: { ...base, owed: picker.owed.filter((_, j) => j !== i), lastTargeted: serial },
      question,
      kind: 'owed',
    };
  }
  return fresh;
}

/**
 * True when generateQuestion could ask this fact at `difficulty`: its numbers are inside the
 * level's range. Smaller is fine (a fact missed at F3 still comes back at F1), bigger waits for
 * the level to climb, and Karting only asks x + a = b.
 */
export function fitsLevel(fact: ParsedFact, difficulty: Difficulty): boolean {
  const { max } = operandRange(difficulty, fact.operation);
  switch (fact.operation) {
    case 'Addition':
    case 'Multiplication':
      return Math.max(fact.num1, fact.num2) <= max;
    case 'Subtraction':
      return fact.num1 <= max;
    case 'Division':
      return Math.max(fact.answer, fact.num2) <= max;
    case 'Variables': {
      if (difficulty === 'beginner' && fact.form !== 'plus') return false;
      const constantMax = fact.form === 'times' ? (difficulty === 'pro' ? Math.min(12, max) : 6) : max;
      return fact.answer <= max && fact.num2 <= constantMax;
    }
  }
}

/**
 * An owed fact as a race question at `difficulty`, or null while it doesn't fit the level.
 * Commutative facts come either way round, as generateQuestion asks them.
 */
export function factQuestion(key: string, difficulty: Difficulty, rand: () => number = Math.random): Question | null {
  const fact = parseFactKey(key);
  if (!fact || !fitsLevel(fact, difficulty)) return null;
  const flip = (fact.operation === 'Addition' || fact.operation === 'Multiplication') && fact.num1 !== fact.num2 && rand() < 0.5;
  const [num1, num2] = flip ? [fact.num2, fact.num1] : [fact.num1, fact.num2];
  const display = flip ? `${num1} ${fact.operation === 'Addition' ? '+' : '×'} ${num2}` : fact.display;
  return { display, answer: fact.answer, num1, num2, operation: fact.operation, botTime: raceBotTimeMs(difficulty, fact.operation, num1, num2) };
}
