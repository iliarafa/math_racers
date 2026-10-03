import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingestSession } from './factMastery.ts';
import {
  RADIO_HOLD_MS,
  REASK_AFTER,
  REVEAL_AFTER_MISSES,
  ghostDigits,
  queueReask,
  revealsOnMiss,
  takeReask,
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

const q = (display: string) => ({ display });

test('a revealed question comes back REASK_AFTER questions later', () => {
  assert.equal(REASK_AFTER, 3);
  const queue = queueReask([], q('7 × 8'), 5);
  assert.equal(takeReask(queue, 6, { harder: false }).question, null);
  assert.equal(takeReask(queue, 7, { harder: false }).question, null);
  const due = takeReask(queue, 8, { harder: false });
  assert.equal(due.question?.display, '7 × 8');
  assert.deepEqual(due.queue, []);
});

test('a power-up asking for a harder question keeps the re-ask for the next normal one', () => {
  const queue = queueReask([], q('7 × 8'), 5);
  const boosted = takeReask(queue, 8, { harder: true });
  assert.equal(boosted.question, null);
  assert.equal(boosted.queue.length, 1);
  assert.equal(takeReask(boosted.queue, 9, { harder: false }).question?.display, '7 × 8');
});

test('the earliest due re-ask goes first, one per question', () => {
  let queue = queueReask([], q('6 × 7'), 2); // due 5
  queue = queueReask(queue, q('8 × 9'), 3); // due 6
  const first = takeReask(queue, 6, { harder: false });
  assert.equal(first.question?.display, '6 × 7');
  const second = takeReask(first.queue, 7, { harder: false });
  assert.equal(second.question?.display, '8 × 9');
  assert.deepEqual(second.queue, []);
});

test('a question revealed again moves to its new slot', () => {
  let queue = queueReask([], q('7 × 8'), 5); // due 8
  queue = queueReask(queue, q('7 × 8'), 8); // revealed again on the re-ask: due 11
  assert.equal(queue.length, 1);
  assert.equal(queue[0].due, 11);
});

test('a re-ask never repeats the question just asked', () => {
  const queue = queueReask([], q('7 × 8'), 5);
  const blocked = takeReask(queue, 8, { harder: false, previousDisplay: '7 × 8' });
  assert.equal(blocked.question, null);
  assert.equal(takeReask(blocked.queue, 9, { harder: false, previousDisplay: '3 × 4' }).question?.display, '7 × 8');
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
