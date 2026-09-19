import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_STREAK,
  STREAK_WEEK,
  advanceDailyStreak,
  isYesterday,
  localDayString,
  sanitizeDailyStreak,
  streakStatus,
  streakWeek,
  type DailyStreak,
} from './dailyStreak.ts';

// Pin a zone that observes daylight saving (EU: forward 29 Mar 2026, back 25 Oct 2026) so the
// DST cases below run the same on any machine or CI runner. Node applies a runtime TZ change.
process.env.TZ = 'Europe/London';

/** `from`..`to` inclusive within one month, e.g. days('2026-09', 14, 18). */
function days(month: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${month}-${String(from + i).padStart(2, '0')}`);
}

test('localDayString uses the local calendar date, zero-padded', () => {
  assert.equal(localDayString(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(localDayString(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('isYesterday handles month, year and daylight-saving boundaries', () => {
  assert.notEqual(new Date(2026, 2, 28).getTimezoneOffset(), new Date(2026, 2, 30).getTimezoneOffset(), 'the test zone observes DST');
  assert.equal(isYesterday('2026-12-31', '2027-01-01'), true);
  assert.equal(isYesterday('2026-02-28', '2026-03-01'), true);
  // Each 23- or 25-hour interval breaks a different naive implementation: noon-to-noon spans the
  // spring shift for 28→29, midnight-to-midnight spans it for 29→30.
  assert.equal(isYesterday('2026-03-28', '2026-03-29'), true, 'noon 28 Mar to noon 29 Mar is 23 hours');
  assert.equal(isYesterday('2026-03-29', '2026-03-30'), true, '29 Mar 2026 is a 23-hour day');
  assert.equal(isYesterday('2026-10-24', '2026-10-25'), true, 'noon 24 Oct to noon 25 Oct is 25 hours');
  assert.equal(isYesterday('2026-10-25', '2026-10-26'), true, '25 Oct 2026 is a 25-hour day');
  assert.equal(isYesterday('2026-03-28', '2026-03-30'), false, 'two days across the shift is not yesterday');
  assert.equal(isYesterday('2026-01-01', '2026-01-03'), false);
  assert.equal(isYesterday('2026-01-02', '2026-01-02'), false);
  assert.equal(isYesterday('2026-01-03', '2026-01-02'), false, 'order matters');
});

test('the first session starts a streak of one', () => {
  assert.deepEqual(advanceDailyStreak(EMPTY_STREAK, '2026-09-18'), {
    next: { count: 1, lastDay: '2026-09-18', best: 1, recentDays: ['2026-09-18'] },
    change: 'started',
  });
});

test('a second session on the same day changes nothing', () => {
  const prev: DailyStreak = { count: 3, lastDay: '2026-09-18', best: 5, recentDays: days('2026-09', 16, 18) };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-18'), { next: prev, change: 'same' });
});

test('a session the next day increments and tracks the best', () => {
  const prev: DailyStreak = { count: 5, lastDay: '2026-09-18', best: 5, recentDays: days('2026-09', 14, 18) };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-19'), {
    next: { count: 6, lastDay: '2026-09-19', best: 6, recentDays: days('2026-09', 14, 19) },
    change: 'incremented',
  });
});

test('missing a day resets to one but keeps the best and the days already raced', () => {
  const prev: DailyStreak = { count: 6, lastDay: '2026-09-18', best: 6, recentDays: days('2026-09', 13, 18) };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-20'), {
    next: { count: 1, lastDay: '2026-09-20', best: 6, recentDays: [...days('2026-09', 13, 18), '2026-09-20'] },
    change: 'reset',
  });
});

test('recentDays keeps the last week of counted days, oldest first', () => {
  assert.equal(STREAK_WEEK, 7);
  let streak = EMPTY_STREAK;
  for (const day of ['2026-09-01', '2026-09-02', ...days('2026-09', 4, 9)]) {
    streak = advanceDailyStreak(streak, day).next;
  }
  assert.equal(streak.count, 6, 'the 3rd was skipped');
  assert.deepEqual(streak.recentDays, ['2026-09-02', ...days('2026-09', 4, 9)], 'the oldest of eight days drops off');
  assert.deepEqual(EMPTY_STREAK.recentDays, [], 'the shared empty streak is never mutated');
});

test('a clock set back still leaves recentDays in order', () => {
  const prev: DailyStreak = { count: 2, lastDay: '2026-09-18', best: 2, recentDays: ['2026-09-17', '2026-09-18'] };
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-10').next.recentDays, ['2026-09-10', '2026-09-17', '2026-09-18']);
});

test('a zero count with a leftover day never swallows that day', () => {
  const inconsistent = { count: 0, lastDay: '2026-09-18', best: 4, recentDays: ['2026-09-18'] };
  assert.deepEqual(sanitizeDailyStreak(inconsistent), { count: 0, lastDay: '', best: 4, recentDays: [] });
  assert.deepEqual(advanceDailyStreak(inconsistent, '2026-09-18'), {
    next: { count: 1, lastDay: '2026-09-18', best: 4, recentDays: ['2026-09-18'] },
    change: 'started',
  });
});

test('streak status: active today, at risk after yesterday, broken otherwise', () => {
  const s: DailyStreak = { count: 4, lastDay: '2026-09-18', best: 4, recentDays: days('2026-09', 15, 18) };
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
  assert.deepEqual(
    sanitizeDailyStreak({ count: 2, lastDay: '2026-09-18', best: 3, recentDays: ['2026-09-17', '2026-09-18'], extra: 1 }),
    { count: 2, lastDay: '2026-09-18', best: 3, recentDays: ['2026-09-17', '2026-09-18'] },
  );
  assert.deepEqual(
    sanitizeDailyStreak({
      count: 1,
      lastDay: '2026-09-18',
      best: 3,
      recentDays: ['2026-09-18', 'nope', 5, null, '2026-09-10', '2026-09-18', ...days('2026-09', 11, 16)],
    }).recentDays,
    [...days('2026-09', 11, 16), '2026-09-18'],
    'junk and repeats dropped, sorted, last seven kept',
  );
});

test('a save from before recentDays existed gets its current run back', () => {
  assert.deepEqual(sanitizeDailyStreak({ count: 4, lastDay: '2026-09-18', best: 2 }), {
    count: 4,
    lastDay: '2026-09-18',
    best: 4,
    recentDays: days('2026-09', 15, 18),
  });
  assert.deepEqual(sanitizeDailyStreak({ count: 30, lastDay: '2026-10-01', best: 30, recentDays: 'x' }).recentDays, [
    ...days('2026-09', 25, 30),
    '2026-10-01',
  ]);
});

test('streakWeek lists the seven days ending today and marks the ones that counted', () => {
  // Raced Mon 14, Tue 15, skipped Wed 16, raced Thu 17 and Fri 18; today is Sat 19 September 2026.
  const streak: DailyStreak = { count: 2, lastDay: '2026-09-18', best: 2, recentDays: ['2026-09-14', '2026-09-15', '2026-09-17', '2026-09-18'] };
  const week = streakWeek(streak, '2026-09-19');
  assert.deepEqual(week.map((d) => d.day), days('2026-09', 13, 19));
  assert.deepEqual(week.map((d) => d.weekday), [0, 1, 2, 3, 4, 5, 6], 'Sunday first for this week');
  assert.deepEqual(week.map((d) => d.raced), [false, true, true, false, true, true, false]);
  assert.deepEqual(week.map((d) => d.isToday), [false, false, false, false, false, false, true]);

  const racedToday = streakWeek(streak, '2026-09-18');
  assert.deepEqual(racedToday.at(-1), { day: '2026-09-18', weekday: 5, raced: true, isToday: true });
});

test('streakWeek steps whole days across daylight-saving changes and month ends', () => {
  assert.deepEqual(streakWeek(EMPTY_STREAK, '2026-10-28').map((d) => d.day), days('2026-10', 22, 28));
  assert.deepEqual(streakWeek(EMPTY_STREAK, '2026-04-01').map((d) => d.day), [...days('2026-03', 26, 31), '2026-04-01']);
});
