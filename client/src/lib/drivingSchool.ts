import { expectedBotTimeMs } from '@shared/mathEngine';
import { generateQuestion, type Difficulty, type Question } from '@/lib/gameLogic';
import { factKey } from '@/lib/factMastery';
import { factQuestion } from '@/lib/questionPicker';

export type CardColor = 'purple' | 'green' | 'red' | 'pending';

export type DrivingSchoolStage = {
  id: number;
  title: string;
  subtitle: string;
  operation: 'Addition' | 'Subtraction' | 'Multiplication' | 'Division';
  /** Difficulty band used for ranges + botTime (maps to “up to N”). */
  difficulty: Difficulty;
};

/** 10 gated stages — clear stage N to unlock N+1. */
export const DRIVING_SCHOOL_STAGES: DrivingSchoolStage[] = [
  { id: 1, title: 'Addition up to 10', subtitle: 'STAGE 1', operation: 'Addition', difficulty: 'beginner' },
  { id: 2, title: 'Addition up to 20', subtitle: 'STAGE 2', operation: 'Addition', difficulty: 'easy' },
  { id: 3, title: 'Subtraction up to 10', subtitle: 'STAGE 3', operation: 'Subtraction', difficulty: 'beginner' },
  { id: 4, title: 'Subtraction up to 20', subtitle: 'STAGE 4', operation: 'Subtraction', difficulty: 'easy' },
  { id: 5, title: 'Multiplication up to 5', subtitle: 'STAGE 5', operation: 'Multiplication', difficulty: 'beginner' },
  { id: 6, title: 'Multiplication up to 8', subtitle: 'STAGE 6', operation: 'Multiplication', difficulty: 'easy' },
  { id: 7, title: 'Multiplication up to 10', subtitle: 'STAGE 7', operation: 'Multiplication', difficulty: 'medium' },
  { id: 8, title: 'Division up to 5', subtitle: 'STAGE 8', operation: 'Division', difficulty: 'beginner' },
  { id: 9, title: 'Division up to 8', subtitle: 'STAGE 9', operation: 'Division', difficulty: 'easy' },
  { id: 10, title: 'Division up to 10', subtitle: 'STAGE 10', operation: 'Division', difficulty: 'medium' },
];

export const CARDS_PER_STAGE = 20;
/** A stage clears with a purple majority — no reds, and at least this many purples. */
export const PURPLE_MAJORITY = 15;
const PROGRESS_KEY = 'drivingSchoolHighestCleared';

/**
 * Correct within 1.5× the bot's expected time → purple; correct but slower → green.
 * The bar is deterministic (expectedBotTimeMs) so no card is randomly tighter than its neighbours;
 * timing runs from the card appearing to the ✓ tap, so 1.5× leaves room for typing.
 */
export const PURPLE_TIME_FACTOR = 1.5;

export function gradeFlashcard(correct: boolean, responseTimeMs: number, botTimeMs: number): Exclude<CardColor, 'pending'> {
  if (!correct) return 'red';
  if (responseTimeMs < botTimeMs * PURPLE_TIME_FACTOR) return 'purple';
  return 'green';
}

export function loadHighestClearedStage(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(DRIVING_SCHOOL_STAGES.length, n));
  } catch {
    return 0;
  }
}

export function saveHighestClearedStage(stageId: number): void {
  const next = Math.max(0, Math.min(DRIVING_SCHOOL_STAGES.length, stageId));
  const prev = loadHighestClearedStage();
  if (next > prev) {
    localStorage.setItem(PROGRESS_KEY, String(next));
  }
}

export function isStageUnlocked(stageId: number, highestCleared: number): boolean {
  return stageId === 1 || stageId <= highestCleared + 1;
}

export type FlashcardItem = {
  id: string;
  question: Question;
  color: CardColor;
};

/** Purple-majority clear: no red (or pending) cards and at least PURPLE_MAJORITY purples. */
export function isStageCleared(deck: FlashcardItem[]): boolean {
  const purple = deck.filter((c) => c.color === 'purple').length;
  const blocked = deck.some((c) => c.color === 'red' || c.color === 'pending');
  return !blocked && purple >= PURPLE_MAJORITY;
}

/** Deck slots an owed fact may take: one card in four, never the first two. */
export const OWED_SLOTS = [2, 6, 10, 14, 18];

/**
 * Build a 20-card deck for a stage (unique-ish displays). `owed` (owedFacts for the stage's
 * operation, lib/factMastery.ts) are facts missed in earlier sessions: the first five that fit the
 * stage take the OWED_SLOTS, and the fresh cards around them never repeat one, so most of the
 * deck stays fresh and each owed fact appears once.
 */
export function buildStageDeck(stage: DrivingSchoolStage, owed: readonly string[] = []): FlashcardItem[] {
  const owedCards = new Map<number, Question>();
  const owedKeys = new Set<string>();
  for (const key of owed) {
    if (owedCards.size >= OWED_SLOTS.length) break;
    const question = factQuestion(key, stage.difficulty);
    if (!question || question.operation !== stage.operation || owedKeys.has(key)) continue;
    owedCards.set(OWED_SLOTS[owedCards.size], question);
    owedKeys.add(key);
  }

  const deck: FlashcardItem[] = [];
  let previousDisplay: string | undefined;
  for (let i = 0; i < CARDS_PER_STAGE; i++) {
    let question = owedCards.get(i);
    if (!question) {
      // A fresh card, drawn again (ten tries at most) when it would repeat an owed one.
      let tries = 0;
      do {
        question = generateQuestion('spa', stage.difficulty, false, 0, previousDisplay, stage.operation);
      } while (owedKeys.has(factKey(question)) && ++tries < 10);
    }
    previousDisplay = question.display;
    // Replace the race bot's randomised time with the deterministic expected time.
    question.botTime = expectedBotTimeMs(stage.difficulty, stage.operation, question.num1, question.num2);
    deck.push({ id: `${stage.id}-${i}-${question.display}`, question, color: 'pending' });
  }
  return deck;
}
