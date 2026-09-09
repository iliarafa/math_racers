import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedBotTimeMs } from '../../../shared/mathEngine.ts';
import {
  CARDS_PER_STAGE,
  PURPLE_MAJORITY,
  PURPLE_TIME_FACTOR,
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
