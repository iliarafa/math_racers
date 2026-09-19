import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_STREAK,
  MAX_PIT_STOPS,
  PIT_STOP_EVERY,
  STREAK_WEEK,
  advanceDailyStreak,
  daysBetween,
  isYesterday,
  liveCount,
  localDayString,
  sanitizeDailyStreak,
  streakLevel,
  streakStatus,
  streakWeek,
  weekdayName,
  type DailyStreak,
} from './dailyStreak.ts';

// Pin a zone that observes daylight saving (EU: forward 29 Mar 2026, back 25 Oct 2026) so the
// DST cases below run the same on any machine or CI runner. Node applies a runtime TZ change.
// 14 Sep 2026 is a Monday.
process.env.TZ = 'Europe/London';

/** `from`..`to` inclusive within one month, e.g. days('2026-09', 14, 18). */
function days(month: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${month}-${String(from + i).padStart(2, '0')}`);
}

/** A streak with EMPTY_STREAK's value for every field not given (a missing pitStops would be NaN). */
function s(fields: Partial<DailyStreak>): DailyStreak {
  return { ...EMPTY_STREAK, ...fields };
}

/** The parts of an advance the pit-stop cases check. */
function outcome(prev: DailyStreak, today: string) {
  const r = advanceDailyStreak(prev, today);
  return { count: r.next.count, pitStops: r.next.pitStops, best: r.next.best, change: r.change, saved: r.saved, earned: r.pitStopEarned };
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

test('daysBetween counts whole days either way and rejects malformed days', () => {
  assert.equal(daysBetween('2026-09-14', '2026-09-19'), 5);
  assert.equal(daysBetween('2026-09-19', '2026-09-17'), -2);
  assert.equal(daysBetween('2026-10-24', '2026-10-27'), 3, 'across the autumn change');
  assert.ok(Number.isNaN(daysBetween('nope', '2026-09-17')));
});

test('weekdayName names a local calendar day', () => {
  assert.equal(weekdayName('2026-09-14'), 'Monday');
  assert.equal(weekdayName('2026-09-19'), 'Saturday');
});

test('the first session starts a streak of one', () => {
  assert.deepEqual(advanceDailyStreak(EMPTY_STREAK, '2026-09-18'), {
    next: s({ count: 1, lastDay: '2026-09-18', best: 1, recentDays: ['2026-09-18'] }),
    change: 'started',
    saved: [],
    pitStopEarned: false,
  });
});

test('a second session on the same day changes nothing', () => {
  const prev = s({ count: 3, lastDay: '2026-09-18', best: 5, recentDays: days('2026-09', 16, 18), pitStops: 1 });
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-18'), { next: prev, change: 'same', saved: [], pitStopEarned: false });
});

test('a session the next day increments and tracks the best', () => {
  const prev = s({ count: 5, lastDay: '2026-09-18', best: 5, recentDays: days('2026-09', 14, 18) });
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-19'), {
    next: s({ count: 6, lastDay: '2026-09-19', best: 6, recentDays: days('2026-09', 14, 19) }),
    change: 'incremented',
    saved: [],
    pitStopEarned: false,
  });
});

test('missing a day with no pit stop resets to one but keeps the best and the days already raced', () => {
  const prev = s({ count: 6, lastDay: '2026-09-18', best: 6, recentDays: days('2026-09', 13, 18) });
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-20'), {
    next: s({ count: 1, lastDay: '2026-09-20', best: 6, recentDays: [...days('2026-09', 13, 18), '2026-09-20'] }),
    change: 'reset',
    saved: [],
    pitStopEarned: false,
  });
});

test('recentDays keeps the last week of counted days, oldest first', () => {
  assert.equal(STREAK_WEEK, 7);
  let streak = EMPTY_STREAK;
  for (const day of ['2026-09-01', '2026-09-02', ...days('2026-09', 4, 9)]) {
    streak = advanceDailyStreak(streak, day).next;
  }
  assert.equal(streak.count, 6, 'the 3rd was skipped with no pit stop to cover it');
  assert.deepEqual(streak.recentDays, ['2026-09-02', ...days('2026-09', 4, 9)], 'the oldest of eight days drops off');
  assert.deepEqual(EMPTY_STREAK.recentDays, [], 'the shared empty streak is never mutated');
});

test('a clock set back changes nothing, and the streak carries on once the date catches up', () => {
  const prev = s({ count: 10, lastDay: '2026-09-19', best: 10, recentDays: days('2026-09', 13, 19), pitStops: 1 });
  assert.deepEqual(advanceDailyStreak(prev, '2026-09-17'), { next: prev, change: 'same', saved: [], pitStopEarned: false });
  assert.equal(streakStatus(prev, '2026-09-17'), 'active');
  assert.deepEqual(outcome(prev, '2026-09-20'), { count: 11, pitStops: 1, best: 11, change: 'incremented', saved: [], earned: false });
});

test('a zero count with a leftover day never swallows that day', () => {
  const inconsistent = { count: 0, lastDay: '2026-09-18', best: 4, recentDays: ['2026-09-18'], pitStops: 0 };
  assert.deepEqual(sanitizeDailyStreak(inconsistent), s({ best: 4 }));
  assert.deepEqual(advanceDailyStreak(inconsistent, '2026-09-18'), {
    next: s({ count: 1, lastDay: '2026-09-18', best: 4, recentDays: ['2026-09-18'] }),
    change: 'started',
    saved: [],
    pitStopEarned: false,
  });
});

test('pit stops: earned every seventh day up to two, and each covers one missed day', () => {
  assert.equal(PIT_STOP_EVERY, 7);
  assert.equal(MAX_PIT_STOPS, 2);
  // One save: Monday raced, Tuesday missed, Wednesday raced.
  assert.deepEqual(outcome(s({ count: 5, lastDay: '2026-09-14', best: 5, pitStops: 1 }), '2026-09-16'),
    { count: 6, pitStops: 0, best: 6, change: 'incremented', saved: ['2026-09-15'], earned: false });
  assert.deepEqual(outcome(s({ count: 9, lastDay: '2026-09-14', best: 9, pitStops: 2 }), '2026-09-17'),
    { count: 10, pitStops: 0, best: 10, change: 'incremented', saved: ['2026-09-15', '2026-09-16'], earned: false }, 'two saves');
  assert.deepEqual(outcome(s({ count: 20, lastDay: '2026-09-14', best: 20, pitStops: 2 }), '2026-09-18'),
    { count: 1, pitStops: 2, best: 20, change: 'reset', saved: [], earned: false }, 'too many missed: none spent');
  assert.deepEqual(outcome(s({ count: 6, lastDay: '2026-09-18', best: 6 }), '2026-09-19'),
    { count: 7, pitStops: 1, best: 7, change: 'incremented', saved: [], earned: true }, 'earned on day 7');
  assert.deepEqual(outcome(s({ count: 13, lastDay: '2026-09-18', best: 13, pitStops: 2 }), '2026-09-19'),
    { count: 14, pitStops: 2, best: 14, change: 'incremented', saved: [], earned: false }, 'nothing earned at the cap');
  assert.deepEqual(outcome(s({ count: 13, lastDay: '2026-09-17', best: 13, pitStops: 2 }), '2026-09-19'),
    { count: 14, pitStops: 2, best: 14, change: 'incremented', saved: ['2026-09-18'], earned: true }, 'used and earned in one session');
  assert.deepEqual(outcome(s({ count: 6, lastDay: '2026-09-17', best: 6 }), '2026-09-19'),
    { count: 1, pitStops: 0, best: 6, change: 'reset', saved: [], earned: false }, "day 7's pit stop can't cover day 6's gap");
});

test('pit stops cover days across daylight-saving changes and the new year', () => {
  assert.deepEqual(advanceDailyStreak(s({ count: 3, lastDay: '2026-03-28', best: 3, pitStops: 1 }), '2026-03-30').saved, ['2026-03-29']);
  assert.deepEqual(advanceDailyStreak(s({ count: 3, lastDay: '2026-10-24', best: 3, pitStops: 2 }), '2026-10-27').saved, ['2026-10-25', '2026-10-26']);
  assert.deepEqual(advanceDailyStreak(s({ count: 3, lastDay: '2026-12-30', best: 3, pitStops: 1 }), '2027-01-01').saved, ['2026-12-31']);
});

test('streak status: active today, at risk while pit stops still cover the gap, broken otherwise', () => {
  const plain = s({ count: 4, lastDay: '2026-09-18', best: 4, recentDays: days('2026-09', 15, 18) });
  assert.equal(streakStatus(plain, '2026-09-18'), 'active');
  assert.equal(streakStatus(plain, '2026-09-19'), 'at-risk');
  assert.equal(streakStatus(plain, '2026-09-20'), 'broken');
  assert.equal(streakStatus(EMPTY_STREAK, '2026-09-18'), 'broken');
  const covered = { ...plain, pitStops: 1 };
  assert.equal(streakStatus(covered, '2026-09-20'), 'at-risk', 'a pit stop covers the 19th');
  assert.equal(streakStatus(covered, '2026-09-21'), 'broken');
  assert.equal(liveCount(covered, '2026-09-20'), 4);
  assert.equal(liveCount(covered, '2026-09-21'), 0, 'a broken streak shows 0 though its count waits for the next session');
});

test('the card and the counting agree on every day around the last session', () => {
  for (let pitStops = 0; pitStops <= MAX_PIT_STOPS; pitStops++) {
    const prev = s({ count: 9, lastDay: '2026-09-14', best: 9, recentDays: days('2026-09', 8, 14), pitStops });
    for (const today of days('2026-09', 12, 19)) {
      const status = streakStatus(prev, today);
      const r = advanceDailyStreak(prev, today);
      const label = `${pitStops} pit stops, ${today}`;
      assert.equal(status === 'broken', r.change === 'reset', label);
      assert.equal(status === 'active', r.change === 'same', label);
      assert.deepEqual(streakWeek(prev, today).filter((d) => d.pending).map((d) => d.day), r.saved, label);
    }
  }
});

test('streakWeek lists the seven days ending today and marks the ones that counted', () => {
  // Raced Mon 14, Tue 15, skipped Wed 16 with no pit stop (a reset), raced Thu 17 and Fri 18; today is Sat 19.
  const streak = s({ count: 2, lastDay: '2026-09-18', best: 2, recentDays: ['2026-09-14', '2026-09-15', '2026-09-17', '2026-09-18'] });
  const week = streakWeek(streak, '2026-09-19');
  assert.deepEqual(week.map((d) => d.day), days('2026-09', 13, 19));
  assert.deepEqual(week.map((d) => d.weekday), [0, 1, 2, 3, 4, 5, 6], 'Sunday first for this week');
  assert.deepEqual(week.map((d) => d.raced), [false, true, true, false, true, true, false]);
  assert.deepEqual(week.map((d) => d.saved), [false, false, false, false, false, false, false], 'the 16th ended the old run');
  assert.deepEqual(week.map((d) => d.isToday), [false, false, false, false, false, false, true]);

  assert.deepEqual(streakWeek(streak, '2026-09-18').at(-1), { day: '2026-09-18', weekday: 5, raced: true, saved: false, pending: false, isToday: true });
});

test('streakWeek shows a pit stop as pending until it is used, then as saved until the run ends', () => {
  const before = s({ count: 5, lastDay: '2026-09-14', best: 5, recentDays: days('2026-09', 10, 14), pitStops: 1 });
  const pending = streakWeek(before, '2026-09-16').find((d) => d.day === '2026-09-15');
  assert.deepEqual({ pending: pending?.pending, saved: pending?.saved }, { pending: true, saved: false });

  const used = advanceDailyStreak(before, '2026-09-16').next;
  const saved = streakWeek(used, '2026-09-16').find((d) => d.day === '2026-09-15');
  assert.deepEqual({ pending: saved?.pending, saved: saved?.saved, raced: saved?.raced }, { pending: false, saved: true, raced: false });

  const restarted = advanceDailyStreak(used, '2026-09-20').next;
  assert.equal(restarted.count, 1, 'three missed days and no pit stop left');
  assert.equal(streakWeek(restarted, '2026-09-20').find((d) => d.day === '2026-09-15')?.saved, false, 'the run it saved has ended');
});

test('streakWeek steps whole days across daylight-saving changes and month ends', () => {
  assert.deepEqual(streakWeek(EMPTY_STREAK, '2026-10-28').map((d) => d.day), days('2026-10', 22, 28));
  assert.deepEqual(streakWeek(EMPTY_STREAK, '2026-04-01').map((d) => d.day), [...days('2026-03', 26, 31), '2026-04-01']);
});

test('streak levels start at 1, 7, 14, 30 and 100 days', () => {
  const at = (n: number) => streakLevel(n);
  assert.deepEqual([0, 1, 6, 7, 13, 14, 29, 30, 99, 100, 365].map(at),
    ['none', 'base', 'base', 'bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'purple', 'purple']);
});

test('sanitizeDailyStreak repairs or discards junk', () => {
  assert.deepEqual(sanitizeDailyStreak(undefined), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak('nope'), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak({ count: -2, lastDay: '2026-09-18', best: 3 }), EMPTY_STREAK);
  assert.deepEqual(sanitizeDailyStreak({ count: 2, lastDay: 'yesterday', best: 3 }), EMPTY_STREAK);
  assert.deepEqual(
    sanitizeDailyStreak({ count: 2, lastDay: '2026-09-18', best: 3, recentDays: ['2026-09-17', '2026-09-18'], pitStops: 1, extra: 1 }),
    s({ count: 2, lastDay: '2026-09-18', best: 3, recentDays: ['2026-09-17', '2026-09-18'], pitStops: 1 }),
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

test('sanitizeDailyStreak keeps pit stops to a whole number from 0 to 2', () => {
  const pits = (pitStops: unknown, count = 3) => sanitizeDailyStreak({ count, lastDay: '2026-09-18', best: 3, pitStops }).pitStops;
  assert.deepEqual(['x', -1, 1.5, undefined, 0, 1, 2, 5].map((p) => pits(p)), [0, 0, 0, 0, 0, 1, 2, 2]);
  assert.equal(pits(2, 0), 0, 'no streak, no pit stops');
});

test('a save from before recentDays existed gets its current run back', () => {
  assert.deepEqual(sanitizeDailyStreak({ count: 4, lastDay: '2026-09-18', best: 2 }), s({
    count: 4,
    lastDay: '2026-09-18',
    best: 4,
    recentDays: days('2026-09', 15, 18),
  }));
  assert.deepEqual(sanitizeDailyStreak({ count: 30, lastDay: '2026-10-01', best: 30, recentDays: 'x' }).recentDays, [
    ...days('2026-09', 25, 30),
    '2026-10-01',
  ]);
});
