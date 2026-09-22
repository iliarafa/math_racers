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
  streakDots,
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
    }
  }
});

const states = (dots: { state: string }[]) => dots.map((d) => d.state);
const EMPTY6 = ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'];

test('streakDots fills from the left, one dot per counted day, numbered by streak day', () => {
  const day1 = streakDots(s({ count: 1, lastDay: '2026-09-21', best: 1, recentDays: ['2026-09-21'] }), '2026-09-21');
  assert.deepEqual(states(day1), ['raced', ...EMPTY6], 'the first day is the left dot');
  assert.deepEqual(day1.map((d) => d.day), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(day1.map((d) => d.isToday), [true, false, false, false, false, false, false]);

  const day3 = streakDots(s({ count: 3, lastDay: '2026-09-23', best: 3, recentDays: days('2026-09', 21, 23) }), '2026-09-23');
  assert.deepEqual(states(day3), ['raced', 'raced', 'raced', 'empty', 'empty', 'empty', 'empty']);
  assert.equal(day3.findIndex((d) => d.isToday), 2);
});

test('streakDots holds a dashed dot for today until it counts, and starts from the first dot with no streak', () => {
  const atRisk = streakDots(s({ count: 4, lastDay: '2026-09-24', best: 4, recentDays: days('2026-09', 21, 24) }), '2026-09-25');
  assert.deepEqual(states(atRisk), ['raced', 'raced', 'raced', 'raced', 'today', 'empty', 'empty']);
  assert.equal(atRisk.findIndex((d) => d.isToday), 4);

  const broken = streakDots(s({ count: 4, lastDay: '2026-09-24', best: 4, recentDays: days('2026-09', 21, 24) }), '2026-09-27');
  assert.deepEqual(states(broken), ['today', ...EMPTY6], 'a broken streak restarts at day 1');
  assert.deepEqual(states(streakDots(EMPTY_STREAK, '2026-09-21')), ['today', ...EMPTY6]);

  // A pit stop will cover the missed 26th: the streak is still alive, so today is dot 5.
  const covered = s({ count: 4, lastDay: '2026-09-25', best: 4, recentDays: days('2026-09', 22, 25), pitStops: 1 });
  assert.deepEqual(states(streakDots(covered, '2026-09-27')), ['raced', 'raced', 'raced', 'raced', 'today', 'empty', 'empty']);
  const afterCover = advanceDailyStreak(covered, '2026-09-27').next;
  assert.deepEqual(states(streakDots(afterCover, '2026-09-27')), ['raced', 'raced', 'raced', 'raced', 'raced', 'empty', 'empty'], 'a covered day adds no dot');
});

test('streakDots starts a new row after every seventh day', () => {
  const run = (count: number, lastDay: string) => s({ count, lastDay, best: count, recentDays: [lastDay] });
  assert.deepEqual(states(streakDots(run(7, '2026-09-27'), '2026-09-27')), Array(7).fill('raced'), 'a full row on day 7');
  const next = streakDots(run(7, '2026-09-27'), '2026-09-28');
  assert.deepEqual(states(next), ['today', ...EMPTY6], 'day 8 waits at the start of a new row');
  assert.deepEqual(next.map((d) => d.day), [8, 9, 10, 11, 12, 13, 14]);
  assert.deepEqual(states(streakDots(run(8, '2026-09-28'), '2026-09-28')), ['raced', ...EMPTY6]);
  assert.deepEqual(states(streakDots(run(14, '2026-10-04'), '2026-10-04')), Array(7).fill('raced'));
  assert.deepEqual(streakDots(run(30, '2026-10-20'), '2026-10-20').map((d) => d.day), [29, 30, 31, 32, 33, 34, 35]);
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
