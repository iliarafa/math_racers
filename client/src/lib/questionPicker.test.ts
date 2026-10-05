import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expectedBotTimeMs, generateQuestion, type Difficulty } from '../../../shared/mathEngine.ts';
import { factKey, parseFactKey } from './factMastery.ts';
import {
  MIN_FRESH_BETWEEN,
  OWED_FRESH_BETWEEN,
  REASKS_PER_FACT,
  REASK_GRACE,
  REASK_MAX,
  REASK_MIN,
  WARM_UP,
  factQuestion,
  fitsLevel,
  noteMiss,
  pickNext,
  startPicker,
  type Picker,
  type PickOptions,
} from './questionPicker.ts';

type Q = { display: string };
const q = (display: string): Q => ({ display });
const low = () => 0;
const high = () => 0.999;

/** Serve fresh questions until the one on screen is `serial`; returns the picker there. */
function advanceTo(picker: Picker<Q>, serial: number, opts: PickOptions<Q> = {}): Picker<Q> {
  let p = picker;
  while (p.serial < serial) {
    const pick = pickNext(p, opts);
    assert.equal(pick.question, null, `question ${pick.picker.serial} should be fresh`);
    p = pick.picker;
  }
  return p;
}

test('a missed question comes back three to five questions later', () => {
  assert.deepEqual([REASK_MIN, REASK_MAX], [3, 5]);
  for (const [rand, gap] of [[low, 3], [high, 5]] as const) {
    let p = advanceTo(startPicker<Q>([], 0), 4);
    p = noteMiss(p, q('7 × 8'), '7x8', rand);
    p = advanceTo(p, 4 + gap - 1);
    const pick = pickNext(p);
    assert.equal(pick.picker.serial, 4 + gap);
    assert.equal(pick.question?.display, '7 × 8');
    assert.equal(pick.kind, 'reask');
    assert.deepEqual(pick.picker.reasks, []);
  }
});

test('only the first miss on a question sends it back', () => {
  let p = advanceTo(startPicker<Q>([], 0), 4);
  p = noteMiss(p, q('7 × 8'), '7x8', low);
  const again = noteMiss(p, q('7 × 8'), '7x8', high);
  assert.equal(again, p, 'the second miss on the same question changes nothing');
  assert.equal(p.reasks.length, 1);
  assert.equal(p.reasks[0].due, 7);
});

test('a power-up asking for a harder question keeps the re-ask for the next normal one', () => {
  let p = advanceTo(startPicker<Q>([], 0), 4);
  p = noteMiss(p, q('7 × 8'), '7x8', low);
  p = advanceTo(p, 6);
  const boosted = pickNext(p, { harder: true });
  assert.equal(boosted.question, null);
  assert.equal(boosted.picker.reasks.length, 1);
  assert.equal(pickNext(boosted.picker).question?.display, '7 × 8');
});

test('a re-ask never repeats the question just asked', () => {
  let p = advanceTo(startPicker<Q>([], 0), 4);
  p = noteMiss(p, q('7 × 8'), '7x8', low);
  p = advanceTo(p, 6);
  const blocked = pickNext(p, { previousDisplay: '7 × 8' });
  assert.equal(blocked.question, null);
  assert.equal(pickNext(blocked.picker, { previousDisplay: '3 × 4' }).question?.display, '7 × 8');
});

test('two re-asks due together are spaced so most questions stay fresh', () => {
  assert.equal(MIN_FRESH_BETWEEN, 2);
  let p = advanceTo(startPicker<Q>([], 0), 4);
  p = noteMiss(p, q('6 × 7'), '6x7', low); // due 7
  p = advanceTo(p, 5);
  p = noteMiss(p, q('8 × 9'), '8x9', low); // due 8
  p = advanceTo(p, 6);
  const first = pickNext(p);
  assert.equal(first.picker.serial, 7);
  assert.equal(first.question?.display, '6 × 7');
  p = advanceTo(first.picker, 9);
  const second = pickNext(p);
  assert.equal(second.picker.serial, 10, 'two fresh questions between the re-asks');
  assert.equal(second.question?.display, '8 × 9');
});

test('a fact comes back at most twice a session, then waits for next session', () => {
  assert.equal(REASKS_PER_FACT, 2);
  let p = advanceTo(startPicker<Q>([], 0), 2);
  for (let round = 0; round < REASKS_PER_FACT; round++) {
    p = noteMiss(p, q('7 × 8'), '7x8', low);
    p = advanceTo(p, p.serial + 2);
    const back = pickNext(p);
    assert.equal(back.question?.display, '7 × 8');
    p = back.picker;
  }
  p = noteMiss(p, q('7 × 8'), '7x8', low);
  assert.deepEqual(p.reasks, []);
});

test('a re-ask that cannot be served in time is dropped', () => {
  let p = advanceTo(startPicker<Q>([], 0), 4);
  p = noteMiss(p, q('7 × 8'), '7x8', low); // due 7, servable up to 7 + REASK_GRACE
  while (p.serial < 7 + REASK_GRACE) p = pickNext(p, { harder: true }).picker; // OVERTAKE all the way
  assert.equal(p.reasks.length, 1, 'still servable on its last question');
  p = pickNext(p, { harder: true }).picker;
  assert.deepEqual(p.reasks, []);
});

test('owed facts wait for the warm-up and take at most one question in four', () => {
  assert.deepEqual([WARM_UP, OWED_FRESH_BETWEEN], [2, 3]);
  const owed = Array.from({ length: 12 }, (_, i) => `${i + 1}+${i + 20}`);
  let p = startPicker<Q>(owed, 0);
  const owedAt: number[] = [];
  for (let i = 0; i < 20; i++) {
    const pick = pickNext(p, { owedQuestion: (key) => q(key) });
    if (pick.kind === 'owed') owedAt.push(pick.picker.serial);
    p = pick.picker;
  }
  assert.deepEqual(owedAt, [2, 6, 10, 14, 18]);
  assert.equal(p.owed.length, 7, 'the rest wait for the next session');
});

test('an owed fact that does not fit the level yet stays owed until it does', () => {
  let fits = false;
  const opts: PickOptions<Q> = { owedQuestion: (key) => (fits ? q(key) : null) };
  let p = advanceTo(startPicker<Q>(['9x12'], 0), 5, opts);
  assert.deepEqual(p.owed, ['9x12']);
  fits = true; // the adaptive level climbed
  const pick = pickNext(p, opts);
  assert.equal(pick.question?.display, '9x12');
  assert.deepEqual(pick.picker.owed, []);
});

test('missing an owed fact moves it from the owed list to the re-asks', () => {
  let p = advanceTo(startPicker<Q>(['7x8'], 0), 3);
  p = noteMiss(p, q('7 × 8'), '7x8', low);
  assert.deepEqual(p.owed, []);
  assert.equal(p.reasks[0].key, '7x8');
});

test('however the misses fall, at least two fresh questions separate targeted ones', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let run = 0; run < 50; run++) {
    let p = startPicker<Q>(['1+1', '2+2', '3+3', '4+4', '5+5'], 0);
    let last = -Infinity;
    let targeted = 0;
    for (let i = 0; i < 60; i++) {
      const pick = pickNext(p, { owedQuestion: (key) => q(`owed ${key}`) });
      p = pick.picker;
      const shown = pick.question ?? q(`fresh ${i}`);
      if (pick.kind) {
        assert.ok(p.serial - last > MIN_FRESH_BETWEEN, `targeted at ${last} and ${p.serial}`);
        last = p.serial;
        targeted++;
      }
      if (rand() < 0.4) p = noteMiss(p, shown, shown.display, rand);
    }
    assert.ok(targeted <= 20, 'at most one question in three');
  }
});

test('an owed fact comes back exactly as the generator asks it, at its own level', () => {
  const levels: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'pro'];
  const operations = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'];
  for (const level of levels) {
    for (const op of operations) {
      for (let i = 0; i < 200; i++) {
        const asked = generateQuestion('spa', level, false, 0, undefined, op);
        const key = factKey(asked);
        const again = factQuestion(key, level);
        assert.ok(again, `${key} should fit ${level}`);
        assert.equal(again.answer, asked.answer, key);
        assert.equal(again.operation, op);
        assert.equal(factKey(again), key, 'the same fact either way round');
        if (op !== 'Addition' && op !== 'Multiplication') assert.equal(again.display, asked.display);
      }
    }
  }
});

test('commutative facts come either way round', () => {
  assert.equal(factQuestion('7x8', 'hard', low)?.display, '8 × 7');
  assert.equal(factQuestion('7x8', 'hard', high)?.display, '7 × 8');
  assert.equal(factQuestion('3+9', 'easy', low)?.display, '9 + 3');
  assert.equal(factQuestion('20-7', 'hard', low)?.display, '20 − 7');
});

test('a fact fits a level when its numbers are inside the level’s range', () => {
  const fits = (key: string, level: Difficulty) => fitsLevel(parseFactKey(key)!, level);
  assert.equal(fits('9x12', 'beginner'), false, 'times tables to 5 at Karting');
  assert.equal(fits('9x12', 'hard'), true);
  assert.equal(fits('2x7', 'hard'), true, 'a smaller fact missed at F3 still comes back at F1');
  assert.equal(fits('15-7', 'beginner'), false);
  assert.equal(fits('15-7', 'easy'), true);
  assert.equal(fits('63/9', 'easy'), false, 'answer 7 fits F3, divisor 9 does not');
  assert.equal(fits('63/9', 'medium'), true);
  assert.equal(fits('var:x+2=5', 'beginner'), true);
  assert.equal(fits('var:7−x=3', 'beginner'), false, 'Karting only asks x + a = b');
  assert.equal(fits('var:7−x=3', 'easy'), true);
  assert.equal(fits('var:9x=36', 'hard'), false, 'coefficients stop at 6 below Pro');
  assert.equal(fits('var:9x=36', 'pro'), true);
});

test('a fact asked again gets a race bot time with the usual roll', () => {
  const expected = expectedBotTimeMs('hard', 'Multiplication', 7, 8);
  for (let i = 0; i < 50; i++) {
    const again = factQuestion('7x8', 'hard', () => 0.9)!;
    assert.ok(again.botTime >= Math.floor(expected * 0.75) && again.botTime <= Math.ceil(expected * 1.25), String(again.botTime));
  }
  assert.equal(factQuestion('Addition:4+4', 'easy'), null, 'a fallback key cannot be rebuilt');
});
