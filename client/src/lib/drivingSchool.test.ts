import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedBotTimeMs } from '../../../shared/mathEngine.ts';
import { factKey } from './factMastery.ts';
import {
  CARDS_PER_STAGE,
  DRIVING_SCHOOL_STAGES,
  OWED_SLOTS,
  PURPLE_MAJORITY,
  PURPLE_TIME_FACTOR,
  buildStageDeck,
  gradeFlashcard,
  isStageCleared,
  type FlashcardItem,
} from './drivingSchool.ts';

const BOT_MS = 2000;

test('purple needs a correct answer inside the widened time bar', () => {
  assert.equal(PURPLE_TIME_FACTOR, 1.5);
  assert.equal(gradeFlashcard(true, BOT_MS * 1.5 - 1, BOT_MS), 'purple');
  assert.equal(gradeFlashcard(true, BOT_MS * 1.5, BOT_MS), 'green');
  assert.equal(gradeFlashcard(true, BOT_MS * 3, BOT_MS), 'green');
  assert.equal(gradeFlashcard(false, 1, BOT_MS), 'red');
});

test('expected bot time is deterministic and randomness-free', () => {
  const a = expectedBotTimeMs('beginner', 'Addition', 3, 4);
  const b = expectedBotTimeMs('beginner', 'Addition', 3, 4);
  assert.equal(a, b);
  // Karting base 2500 × addition 0.85, no carry → 2125 ms
  assert.equal(a, 2125);
  // A carry makes the same stage's card slower, never faster
  assert.ok(expectedBotTimeMs('beginner', 'Addition', 6, 4) > a);
});

function deck(colors: Array<FlashcardItem['color']>): FlashcardItem[] {
  return colors.map((color, i) => ({
    id: `t-${i}`,
    question: { display: '1 + 1', answer: 2, botTime: BOT_MS } as FlashcardItem['question'],
    color,
  }));
}

test('a stage clears on 15 purple with no reds, greens allowed', () => {
  assert.equal(PURPLE_MAJORITY, 15);
  const fill = (purple: number, green: number, red = 0) =>
    deck([
      ...Array(purple).fill('purple'),
      ...Array(green).fill('green'),
      ...Array(red).fill('red'),
      ...Array(CARDS_PER_STAGE - purple - green - red).fill('pending'),
    ]);
  assert.equal(isStageCleared(fill(15, 5)), true);
  assert.equal(isStageCleared(fill(20, 0)), true);
  assert.equal(isStageCleared(fill(14, 6)), false);
  assert.equal(isStageCleared(fill(15, 4, 1)), false);
  assert.equal(isStageCleared(fill(15, 4)), false); // a pending card blocks the clear
});

test('owed facts take up to five slots of a deck when they fit the stage', () => {
  const stage = DRIVING_SCHOOL_STAGES.find((s) => s.id === 6)!; // Multiplication up to 8
  const owed = ['7x8', '6x7', '9x12', '15-7', '2x3', '4x6', '5x8', '3x7', '6x8'];
  const deck = buildStageDeck(stage, owed);
  assert.equal(deck.length, CARDS_PER_STAGE);
  const placed = OWED_SLOTS.map((slot) => factKey(deck[slot].question));
  // 9x12 is past the stage and 15-7 is another operation; the first five that fit go in, in order
  assert.deepEqual(placed, ['7x8', '6x7', '2x3', '4x6', '5x8']);
  const fresh = deck.filter((_, i) => !OWED_SLOTS.includes(i)).map((c) => factKey(c.question));
  assert.ok(fresh.every((key) => !placed.includes(key)), 'no fresh card repeats an owed one');
  for (const slot of OWED_SLOTS) {
    const { question } = deck[slot];
    assert.equal(question.botTime, expectedBotTimeMs(stage.difficulty, stage.operation, question.num1, question.num2));
  }
  assert.equal(new Set(deck.map((c) => c.id)).size, CARDS_PER_STAGE, 'card ids stay unique');
});

test('a deck with nothing owed is all fresh cards', () => {
  const stage = DRIVING_SCHOOL_STAGES[0];
  const deck = buildStageDeck(stage);
  assert.equal(deck.length, CARDS_PER_STAGE);
  assert.ok(deck.every((c) => c.question.operation === stage.operation && c.color === 'pending'));
});
