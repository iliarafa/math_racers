/**
 * One player's race under Quick Race rules, at the room's fixed level: a wrong answer keeps
 * the question and turns the sector red, the fourth wrong try on one question is a crash, and
 * the last correct answer finishes the race. Pure; each device runs its own racer and sends
 * the wire form to the other.
 */
import { factKey } from './factMastery';
import type { BankQuestion, LapWire, RacerStatus, RacerWire } from './multiplayerProtocol';
import type { QuestionBank } from './multiplayerQuestions';

/** The fourth wrong try on one question is a crash (Game.tsx's race mode). */
export const MAX_ATTEMPTS = 4;

/** A completed lap. Also a valid fact-mastery row, so finished laps go straight to ingestFactResults. */
export interface MpLap {
  display: string;
  answer: number;
  /** From the question appearing to the correct answer; wrong tries don't restart it (as in Game). */
  responseTime: number;
  wrongAttempts: number[];
  fact: string;
}

export interface RacerState {
  raceId: number;
  laps: number;
  done: MpLap[];
  /** Wrong tries on the current question. */
  attempts: number;
  wrongValues: number[];
  warnings: number;
  status: RacerStatus;
  /** Race time when the racer stopped: at the finish, the crash or the retirement. */
  raceMs: number | null;
}

export type AnswerOutcome = 'correct' | 'wrong' | 'crash' | 'finish' | 'ignored';

export function startRacer(raceId: number, laps: number): RacerState {
  return { raceId, laps, done: [], attempts: 0, wrongValues: [], warnings: 0, status: 'racing', raceMs: null };
}

/** Null before this race's bank has arrived, and once the racer has stopped. */
export function currentQuestion(s: RacerState, bank: QuestionBank | null): BankQuestion | null {
  if (!bank || bank.raceId !== s.raceId || s.status !== 'racing') return null;
  return bank.questions[s.done.length] ?? null;
}

export function submitAnswer(
  s: RacerState,
  bank: QuestionBank | null,
  value: number,
  responseTimeMs: number,
  raceMsNow: number,
): { state: RacerState; outcome: AnswerOutcome } {
  const question = currentQuestion(s, bank);
  if (!question || !bank) return { state: s, outcome: 'ignored' };

  if (value !== question.answer) {
    const attempts = s.attempts + 1;
    const next: RacerState = { ...s, attempts, wrongValues: [...s.wrongValues, value], warnings: s.warnings + 1 };
    if (attempts >= MAX_ATTEMPTS) return { state: { ...next, status: 'crashed', raceMs: raceMsNow }, outcome: 'crash' };
    return { state: next, outcome: 'wrong' };
  }

  const lap: MpLap = {
    display: question.display,
    answer: question.answer,
    responseTime: responseTimeMs,
    wrongAttempts: s.wrongValues,
    fact: factKey({ ...question, operation: bank.op }),
  };
  const next: RacerState = { ...s, done: [...s.done, lap], attempts: 0, wrongValues: [] };
  if (next.done.length >= s.laps) return { state: { ...next, status: 'finished', raceMs: raceMsNow }, outcome: 'finish' };
  return { state: next, outcome: 'correct' };
}

export function retireRacer(s: RacerState, raceMsNow: number): RacerState {
  return s.status === 'racing' ? { ...s, status: 'retired', raceMs: raceMsNow } : s;
}

export function toWire(s: RacerState): RacerWire {
  return {
    raceId: s.raceId,
    laps: s.done.map((lap) => ({ t: lap.responseTime, r: lap.wrongAttempts.length > 0 })),
    att: s.attempts,
    warn: s.warnings,
    st: s.status,
    ms: s.raceMs,
  };
}

export type SectorColor = 'purple' | 'green' | 'yellow' | 'red';

/**
 * Quick Race's race-mode colours between two cars (Game.tsx, "F1-style competitive sector
 * timing"): purple for the fastest clean time on a sector, green within 1.5x of it, yellow
 * slower, red when the lap needed a retry. Recomputed from both cars' laps, so purple moves
 * to whoever is fastest as the second car comes through.
 */
export function sectorColors(mine: LapWire[], rival: LapWire[]): { mine: SectorColor[]; rival: SectorColor[] } {
  const best = (i: number) => {
    const clean = [mine[i], rival[i]].filter((lap): lap is LapWire => !!lap && !lap.r).map((lap) => lap.t);
    return clean.length > 0 ? Math.min(...clean) : Infinity;
  };
  const colour = (lap: LapWire, i: number): SectorColor => {
    if (lap.r) return 'red';
    const fastest = best(i);
    if (lap.t <= fastest) return 'purple';
    return lap.t <= fastest * 1.5 ? 'green' : 'yellow';
  };
  return { mine: mine.map(colour), rival: rival.map(colour) };
}
