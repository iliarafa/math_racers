import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EWMA_ALPHA,
  FACT_STATS_CAP,
  MASTERY_MIN_CORRECT,
  MASTERY_MS,
  MAX_TIMED_MS,
  countMastered,
  factClass,
  factKey,
  factLabel,
  factOperation,
  ingestSession,
  isOwed,
  owedFacts,
  parseFactKey,
  pickCallout,
  sanitizeFactStats,
  summarizeByOperation,
  type FactRow,
  type FactStat,
  type FactStats,
} from './factMastery.ts';

function row(fact: string, responseTime: number, extra: Partial<FactRow> = {}): FactRow {
  return { fact, responseTime, result: 'correct', ...extra };
}

function stat(extra: Partial<FactStat> = {}): FactStat {
  return { seen: 0, correct: 0, bestMs: 0, lastMs: 0, ewmaMs: 0, lastAt: 0, ...extra };
}

test('factKey normalises commutative operations and keeps ordered ones', () => {
  assert.equal(factKey({ display: '8 × 7', num1: 8, num2: 7, operation: 'Multiplication' }), '7x8');
  assert.equal(factKey({ display: '7 × 8', num1: 7, num2: 8, operation: 'Multiplication' }), '7x8');
  assert.equal(factKey({ display: '12 + 9', num1: 12, num2: 9, operation: 'Addition' }), '9+12');
  assert.equal(factKey({ display: '20 − 7', num1: 20, num2: 7, operation: 'Subtraction' }), '20-7');
  assert.equal(factKey({ display: '56 ÷ 8', num1: 56, num2: 8, operation: 'Division' }), '56/8');
});

test('factKey uses the display for Variables and when operands are missing', () => {
  assert.equal(factKey({ display: 'x + 3 = 7', num1: 7, num2: 3, operation: 'Variables' }), 'var:x+3=7');
  assert.equal(factKey({ display: '5x = 30', num1: 30, num2: 5, operation: 'Variables' }), 'var:5x=30');
  assert.equal(factKey({ display: '4 + 4', operation: 'Addition' }), 'Addition:4+4');
});

test('factOperation and factLabel are derived from the key', () => {
  assert.equal(factOperation('7x8'), 'Multiplication');
  assert.equal(factOperation('9+12'), 'Addition');
  assert.equal(factOperation('20-7'), 'Subtraction');
  assert.equal(factOperation('56/8'), 'Division');
  assert.equal(factOperation('var:x+3=7'), 'Variables');
  assert.equal(factLabel('7x8'), '7 × 8');
  assert.equal(factLabel('9+12'), '9 + 12');
  assert.equal(factLabel('20-7'), '20 − 7');
  assert.equal(factLabel('56/8'), '56 ÷ 8');
  assert.equal(factLabel('var:x+3=7'), 'x + 3 = 7');
  assert.equal(factLabel('var:5x=30'), '5x = 30');
});

test('ingestSession counts every attempt as seen but only clean answers as correct', () => {
  const rows = [row('7x8', 3000), row('7x8', 2000, { wrongAttempts: [54] }), row('7x8', 2500)];
  const { stats } = ingestSession({}, rows, 100);
  assert.equal(stats['7x8'].seen, 3);
  assert.equal(stats['7x8'].correct, 2);
  assert.equal(stats['7x8'].bestMs, 2500, 'timing comes from clean answers only');
  assert.equal(stats['7x8'].lastMs, 2500);
  assert.equal(stats['7x8'].lastAt, 100);
});

test('an answer slower than MAX_TIMED_MS is seen but not timed, so a pause cannot wreck the average', () => {
  const prior: FactStats = { '7x8': stat({ seen: 3, correct: 3, bestMs: 2000, lastMs: 2000, ewmaMs: 2000, lastAt: 1 }) };
  // The child paused (or opened BOX, or left the iPad) for five minutes, then answered first try.
  const paused = ingestSession(prior, [row('7x8', 5 * 60_000)], 2);
  assert.equal(paused.stats['7x8'].seen, 4);
  assert.equal(paused.stats['7x8'].correct, 3);
  assert.equal(paused.stats['7x8'].ewmaMs, 2000);
  assert.equal(paused.stats['7x8'].lastAt, 2);
  assert.equal(factClass('7x8', paused.stats['7x8']), 'mastered', 'still mastered');
  // The next ordinary answer is not reported as a speed-up.
  assert.deepEqual(ingestSession(paused.stats, [row('7x8', 2100)], 3).improved, []);
  assert.equal(ingestSession(prior, [row('7x8', MAX_TIMED_MS)], 4).stats['7x8'].correct, 4, 'an answer at the cap still counts');
});

test('ingestSession skips bonus rows and rows without a fact', () => {
  const rows: FactRow[] = [row('7x8', 3000), row('7x8', 3000, { isBonus: true }), { responseTime: 1000, result: 'correct' }];
  const { stats } = ingestSession({}, rows, 100);
  assert.equal(stats['7x8'].seen, 1);
  assert.equal(Object.keys(stats).length, 1);
});

test('the moving average starts at the first time and then follows EWMA_ALPHA', () => {
  const first = ingestSession({}, [row('7x8', 4000)], 1).stats;
  assert.equal(first['7x8'].ewmaMs, 4000);
  const second = ingestSession(first, [row('7x8', 2000)], 2).stats;
  assert.equal(second['7x8'].ewmaMs, Math.round(EWMA_ALPHA * 2000 + (1 - EWMA_ALPHA) * 4000));
});

test('a session clearly faster than the prior average counts as an improvement', () => {
  const prior: FactStats = { '7x8': stat({ seen: 2, correct: 2, bestMs: 4800, lastMs: 5000, ewmaMs: 5000, lastAt: 1 }) };
  const faster = ingestSession(prior, [row('7x8', 3000), row('7x8', 3000)], 2);
  assert.deepEqual(faster.improved, [{ fact: '7x8', beforeMs: 5000, afterMs: 3000 }]);
  const barely = ingestSession(prior, [row('7x8', 4500)], 2);
  assert.deepEqual(barely.improved, [], '4500 is not under 85% of 5000');
});

test('an improvement needs at least two prior sightings', () => {
  const prior: FactStats = { '7x8': stat({ seen: 1, correct: 1, bestMs: 5000, lastMs: 5000, ewmaMs: 5000, lastAt: 1 }) };
  assert.deepEqual(ingestSession(prior, [row('7x8', 1000)], 2).improved, []);
});

test('a fact is mastered after enough clean answers under the operation threshold', () => {
  const fast = MASTERY_MS.Multiplication - 500;
  let stats: FactStats = {};
  for (let i = 0; i < MASTERY_MIN_CORRECT - 1; i++) {
    stats = ingestSession(stats, [row('7x8', fast)], i + 1).stats;
  }
  assert.equal(factClass('7x8', stats['7x8']), 'learning');
  const result = ingestSession(stats, [row('7x8', fast)], 10);
  assert.equal(factClass('7x8', result.stats['7x8']), 'mastered');
  assert.deepEqual(result.newlyMastered, ['7x8']);
  const again = ingestSession(result.stats, [row('7x8', fast)], 11);
  assert.deepEqual(again.newlyMastered, [], 'reported once');
  assert.equal(factClass('7x8', undefined), 'new');
});

test('a slow fact stays learning however often it is answered', () => {
  const slow = MASTERY_MS.Addition + 1000;
  let stats: FactStats = {};
  for (let i = 0; i < 6; i++) stats = ingestSession(stats, [row('9+12', slow)], i + 1).stats;
  assert.equal(factClass('9+12', stats['9+12']), 'learning');
});

test('the store is capped by evicting the least recently seen facts', () => {
  const stats: FactStats = {};
  for (let i = 0; i < FACT_STATS_CAP; i++) {
    stats[`${i}+1000`] = stat({ seen: 1, correct: 1, bestMs: 1, lastMs: 1, ewmaMs: 1, lastAt: i + 1 });
  }
  const { stats: next } = ingestSession(stats, [row('7x8', 3000)], 10_000);
  assert.equal(Object.keys(next).length, FACT_STATS_CAP);
  assert.ok(next['7x8']);
  assert.equal(next['0+1000'], undefined, 'the oldest entry was evicted');
  assert.ok(next['1+1000']);
});

test('eviction never drops a fact answered this session, even when stored stamps ran ahead of the clock', () => {
  // A device clock that was set forward and then corrected leaves rows stamped in the "future".
  const stats: FactStats = {};
  for (let i = 0; i < FACT_STATS_CAP; i++) {
    stats[`${i}+1000`] = stat({ seen: 1, correct: 1, bestMs: 1, lastMs: 1, ewmaMs: 1, lastAt: 2_000_000_000_000 });
  }
  const { stats: next } = ingestSession(stats, [row('7x8', 3000)], 1_700_000_000_000);
  assert.equal(Object.keys(next).length, FACT_STATS_CAP);
  assert.ok(next['7x8'], 'the fact just answered is kept');
});

test('summaries count mastered and learning facts per operation', () => {
  const stats: FactStats = {
    '7x8': stat({ seen: 3, correct: 3, ewmaMs: 1000, lastAt: 1 }),
    '6x9': stat({ seen: 1, correct: 1, ewmaMs: 1000, lastAt: 1 }),
    '9+12': stat({ seen: 3, correct: 3, ewmaMs: 1000, lastAt: 1 }),
  };
  assert.equal(countMastered(stats), 2);
  assert.deepEqual(summarizeByOperation(stats), {
    Multiplication: { mastered: 1, learning: 1 },
    Addition: { mastered: 1, learning: 0 },
  });
});

test('pickCallout prefers the biggest speed-up, then a new mastery, else nothing', () => {
  assert.equal(
    pickCallout({ improved: [{ fact: '9+12', beforeMs: 4000, afterMs: 3500 }, { fact: '7x8', beforeMs: 5000, afterMs: 2000 }], newlyMastered: ['9+12'] }),
    'You got faster at 7 × 8',
  );
  assert.equal(pickCallout({ improved: [], newlyMastered: ['56/8'] }), '56 ÷ 8 mastered');
  assert.equal(pickCallout({ improved: [], newlyMastered: [] }), null);
});

test('sanitizeFactStats keeps well-formed entries and drops junk', () => {
  const good = stat({ seen: 2, correct: 1, bestMs: 100, lastMs: 200, ewmaMs: 150, lastAt: 5 });
  const raw = { '7x8': good, '9+12': { seen: 'two' }, '1+1': null, '2+2': { ...good, extra: true } };
  assert.deepEqual(sanitizeFactStats(raw), { '7x8': good, '2+2': good });
  assert.deepEqual(sanitizeFactStats(undefined), {});
  assert.deepEqual(sanitizeFactStats([]), {});
});

test('parseFactKey rebuilds every fact factKey writes', () => {
  assert.deepEqual(parseFactKey('7x8'), { operation: 'Multiplication', display: '7 × 8', answer: 56, num1: 7, num2: 8 });
  assert.deepEqual(parseFactKey('9+12'), { operation: 'Addition', display: '9 + 12', answer: 21, num1: 9, num2: 12 });
  assert.deepEqual(parseFactKey('20-7'), { operation: 'Subtraction', display: '20 − 7', answer: 13, num1: 20, num2: 7 });
  assert.deepEqual(parseFactKey('56/8'), { operation: 'Division', display: '56 ÷ 8', answer: 7, num1: 56, num2: 8 });
  assert.deepEqual(parseFactKey('var:x+3=7'), { operation: 'Variables', form: 'plus', display: 'x + 3 = 7', answer: 4, num1: 7, num2: 3 });
  assert.deepEqual(parseFactKey('var:15−x=9'), { operation: 'Variables', form: 'minus', display: '15 − x = 9', answer: 6, num1: 15, num2: 9 });
  assert.deepEqual(parseFactKey('var:5x=30'), { operation: 'Variables', form: 'times', display: '5x = 30', answer: 6, num1: 30, num2: 5 });
  for (const junk of ['Addition:4+4', '3-9', '7/2', 'var:x+9=3', 'var:4x=10', 'nonsense']) {
    assert.equal(parseFactKey(junk), null, junk);
  }
});

test('a miss is owed until a clean answer in a later session pays it off', () => {
  const missed = ingestSession({}, [row('7x8', 4000, { wrongAttempts: [54] })], 1_000, 500);
  assert.equal(missed.stats['7x8'].missedAt, 1_000);
  assert.equal(isOwed(missed.stats['7x8'], 1_000), false, 'not owed to the session that missed it');
  assert.equal(isOwed(missed.stats['7x8'], 2_000), true);

  const paid = ingestSession(missed.stats, [row('7x8', 3000)], 3_000, 2_000);
  assert.equal(paid.stats['7x8'].missedAt, undefined);
  assert.equal(isOwed(paid.stats['7x8'], 9_000), false);
});

test('a fact missed and then got right in the same session is still owed next time', () => {
  // One batch: missed, then answered clean when it came back
  const once = ingestSession({}, [row('7x8', 4000, { result: 'incorrect' }), row('7x8', 2500)], 1_000, 500);
  assert.equal(once.stats['7x8'].missedAt, 1_000);
  // Flashcards fold in each lap: a later lap of the same session pays nothing off
  const lap2 = ingestSession(once.stats, [row('7x8', 2500)], 1_500, 500);
  assert.equal(lap2.stats['7x8'].missedAt, 1_000);
});

test('Lane Racer picks are untimed: a wrong one is a miss, a right one pays nothing off', () => {
  const wrong = ingestSession({}, [row('7x8', Number.NaN, { result: 'incorrect' })], 1_000);
  assert.equal(wrong.stats['7x8'].missedAt, 1_000);
  const right = ingestSession(wrong.stats, [row('7x8', Number.NaN)], 2_000, 1_500);
  assert.equal(right.stats['7x8'].missedAt, 1_000);
  assert.equal(right.stats['7x8'].seen, 2);
  assert.equal(right.stats['7x8'].correct, 0);
});

test('owedFacts lists one operation’s owed facts, the most recent miss first', () => {
  const stats: FactStats = {
    '7x8': stat({ seen: 1, missedAt: 100 }),
    '6x7': stat({ seen: 1, missedAt: 300 }),
    '3x4': stat({ seen: 1 }),
    '9+12': stat({ seen: 1, missedAt: 200 }),
    '8x9': stat({ seen: 1, missedAt: 900 }),
  };
  assert.deepEqual(owedFacts(stats, 'Multiplication', 500), ['6x7', '7x8'], '8x9 was missed in this session');
  assert.deepEqual(owedFacts(stats, 'Addition', 500), ['9+12']);
  assert.deepEqual(owedFacts(stats, 'Division', 500), []);
});

test('sanitizeFactStats keeps a real missedAt and drops a bad one', () => {
  const base = { seen: 1, correct: 0, bestMs: 0, lastMs: 0, ewmaMs: 0, lastAt: 5 };
  const out = sanitizeFactStats({
    a: { ...base, missedAt: 42 },
    b: { ...base, missedAt: -1 },
    c: { ...base, missedAt: 'soon' },
    d: { ...base, missedAt: 0 },
  });
  assert.equal(out.a.missedAt, 42);
  for (const key of ['b', 'c', 'd']) assert.equal('missedAt' in out[key], false, key);
});

test('a full store evicts facts with nothing owed before owed ones', () => {
  const prior: FactStats = {};
  for (let i = 0; i < FACT_STATS_CAP; i++) prior[`1+${i + 100}`] = stat({ seen: 1, lastAt: i + 10 });
  prior['1+100'] = stat({ seen: 1, lastAt: 1, missedAt: 1 }); // the oldest, but owed
  const { stats } = ingestSession(prior, [row('7x8', 2000)], 10_000);
  assert.equal(Object.keys(stats).length, FACT_STATS_CAP);
  assert.ok(stats['1+100'], 'the owed fact stays');
  assert.equal(stats['1+101'], undefined, 'the oldest fact with nothing owed goes');
});
