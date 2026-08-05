import { generateQuestion, type Difficulty, type Question } from '@/lib/gameLogic';

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
const PROGRESS_KEY = 'drivingSchoolHighestCleared';

/**
 * Driving School purple is intentionally easier than race practice (0.5× botTime).
 * Correct within the bot's expected time → purple; correct but slower → green.
 */
export const PURPLE_TIME_FACTOR = 1.0;

export function gradeFlashcard(correct: boolean, responseTimeMs: number, botTimeMs: number): CardColor {
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

/** Build a 20-card deck for a stage (unique-ish displays). */
export function buildStageDeck(stage: DrivingSchoolStage): FlashcardItem[] {
  const deck: FlashcardItem[] = [];
  let previousDisplay: string | undefined;
  for (let i = 0; i < CARDS_PER_STAGE; i++) {
    const question = generateQuestion(
      'spa',
      stage.difficulty,
      false,
      0,
      previousDisplay,
      stage.operation,
    );
    previousDisplay = question.display;
    deck.push({
      id: `${stage.id}-${i}-${question.display}`,
      question,
      color: 'pending',
    });
  }
  return deck;
}
