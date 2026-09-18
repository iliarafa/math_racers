import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_STREAK,
  advanceDailyStreak,
  isYesterday,
  localDayString,
  sanitizeDailyStreak,
  streakStatus,
  type DailyStreak,
} from './dailyStreak.ts';

test('localDayString uses the local calendar date, zero-padded', () => {
  assert.equal(localDayString(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(localDayString(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('isYesterday handles month, year and daylight-saving boundaries', () => {
  assert.equal(isYesterday('2026-12-31', '2027-01-01'), true);
  assert.equal(isYesterday('2026-02-28', '2026-03-01'), true);
  assert.equal(isYesterday('2026-03-28', '2026-03-29'), true, 'EU clocks go forward on 29 Mar 2026');
  assert.equal(isYesterday('2026-10-24', '2026-10-25'), true, 'EU clocks go back on 25 Oct 2026');
  assert.equal(isYesterday('2026-01-01', '2026-01-03'), false);
  assert.equal(isYesterday('2026-01-02', '2026-01-02'), false);
  assert.equal(isYesterday('2026-01-03', '2026-01-02'), false, 'order matters');
});

test('the first session starts a streak of one', () => {
  assert.deepEqual(advanceDailyStreak(EMPTY_STREAK, '2026-09-18'), {
    next: { count: 1, lastDay: '2026-09-18', best: 1 },
    change: 'started',
  });
});

test('a second session on the same day changes nothing', () => {
  const prev: DailyStreak = { count: 3, lastDay: '2026-09-18', best: 5 };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-18'), { next: prev, change: 'same' });
});

test('a session the next day increments and tracks the best', () => {
  const prev: DailyStreak = { count: 5, lastDay: '2026-09-18', best: 5 };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-19'), {
    next: { count: 6, lastDay: '2026-09-19', best: 6 },
    change: 'incremented',
  });
});

test('missing a day resets to one but keeps the best', () => {
  const prev: DailyStreak = { count: 6, lastDay: '2026-09-18', best: 6 };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-20'), {
    next: { count: 1, lastDay: '2026-09-20', best: 6 },
    change: 'reset',
  });
});

test('streak status: active today, at risk after yesterday, broken otherwise', () => {
  const s: DailyStreak = { count: 4, lastDay: '2026-09-18', best: 4 };
  assert.equal(streakStatus(s, '2026-09-18'), 'active');
  assert.equal(streakStatus(s, '2026-09-19'), 'at-risk');
  assert.equal(streakStatus(s, '2026-09-20'), 'broken');
  assert.equal(streakStatus(EMPTY_STREAK, '2026-09-18'), 'broken');
});

test('sanitizeDailyStreak repairs or discards junk', () => {
  assert.deepEqual(sanitizeDailyStreak(undefined), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak('nope'), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak({ count: -2, lastDay: '2026-09-18', best: 3 }), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak({ count: 2, lastDay: 'yesterday', best: 3 }), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak({ count: 4, lastDay: '2026-09-18', best: 2 }), { count: 4, lastDay: '2026-09-18', best: 4 });
  assert.deepEqual(sanitizeDailyStreak({ count: 2, lastDay: '2026-09-18', best: 3, extra: 1 }), { count: 2, lastDay: '2026-09-18', best: 3 });
});
