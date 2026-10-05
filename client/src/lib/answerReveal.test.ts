import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingestSession } from './factMastery.ts';
import {
  RADIO_HOLD_MS,
  REVEAL_AFTER_MISSES,
  ghostDigits,
  revealsOnMiss,
} from './answerReveal.ts';

test('the first miss is a free retry; the second reveals the answer, once', () => {
  assert.equal(REVEAL_AFTER_MISSES, 2);
  assert.equal(RADIO_HOLD_MS, 1500);
  assert.equal(revealsOnMiss(1, true), false);
  assert.equal(revealsOnMiss(2, true), true);
  // A third miss keeps the answer up but brings no second hold
  assert.equal(revealsOnMiss(3, true), false);
});

test('a team radio switched off in the Garage never reveals the answer', () => {
  assert.equal(revealsOnMiss(2, false), false);
});

test('typed digits replace the ghost digits from the left', () => {
  assert.deepEqual(ghostDigits('', '56'), { typed: '', ghost: '56' });
  assert.deepEqual(ghostDigits('5', '56'), { typed: '5', ghost: '6' });
  // A wrong digit still takes its place; the submit decides
  assert.deepEqual(ghostDigits('4', '56'), { typed: '4', ghost: '6' });
  assert.deepEqual(ghostDigits('56', '56'), { typed: '56', ghost: '' });
  assert.deepEqual(ghostDigits('567', '56'), { typed: '567', ghost: '' });
});

test('a revealed answer never counts as clean for fact mastery', () => {
  // The lapResults row Game writes when the kid types the radio answer: it carries both misses.
  const revealed = { fact: '7x8', responseTime: 2500, result: 'correct' as const, wrongAttempts: [54, 48] };
  assert.equal(revealed.wrongAttempts.length, REVEAL_AFTER_MISSES);
  const { stats } = ingestSession({}, [revealed], 1_000);
  assert.equal(stats['7x8'].seen, 1);
  assert.equal(stats['7x8'].correct, 0);
  assert.equal(stats['7x8'].ewmaMs, 0);
});
