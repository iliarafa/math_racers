import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BADGES,
  BADGE_EVERYTHING_IS_PURPLE,
  SEASON_ROUNDS,
  STREAK_BADGE_DAYS,
  evaluateMilestones,
  nextStreakGoal,
  rewardToast,
  sanitizeTrophies,
  seasonSlots,
  trophyId,
  upgradeTrophy,
  weekendTrophyTier,
  type MilestoneContext,
  type Trophy,
} from './trophies.ts';

function trophy(extra: Partial<Trophy> = {}): Trophy {
  return {
    id: trophyId(2026, 15, 'baku'),
    season: 2026,
    round: 15,
    circuitId: 'baku',
    name: 'BAKU',
    tier: 'bronze',
    operation: 'Addition',
    at: 1000,
    ...extra,
  };
}

test('trophy id is unique per season and round, so a returning circuit gets its own slot', () => {
  assert.equal(trophyId(2026, 15, 'baku'), 'gp:2026:15:baku');
  assert.notEqual(trophyId(2026, 15, 'baku'), trophyId(2027, 15, 'baku'));
  assert.notEqual(trophyId(2026, 15, 'baku'), trophyId(2026, 16, 'baku'));
});

test('weekend tier: finish is bronze, a win is silver, pole plus win is gold', () => {
  assert.equal(weekendTrophyTier({ beatBot: false, pole: false }), 'bronze');
  assert.equal(weekendTrophyTier({ beatBot: false, pole: true }), 'bronze', 'pole alone is not rewarded');
  assert.equal(weekendTrophyTier({ beatBot: true, pole: false }), 'silver');
  assert.equal(weekendTrophyTier({ beatBot: true, pole: true }), 'gold');
});

test('a first trophy is new', () => {
  const incoming = trophy();
  assert.deepEqual(upgradeTrophy(undefined, incoming), { trophy: incoming, status: 'new' });
});

test('a better tier upgrades the trophy but keeps when it was first earned', () => {
  const existing = trophy({ tier: 'bronze', at: 1000, operation: 'Addition' });
  const incoming = trophy({ tier: 'gold', at: 2000, operation: 'Division' });
  const result = upgradeTrophy(existing, incoming);
  assert.equal(result.status, 'upgraded');
  assert.equal(result.trophy.tier, 'gold');
  assert.equal(result.trophy.at, 1000);
  assert.equal(result.trophy.operation, 'Division', 'the operation that earned the tier is kept');
});

test('a trophy never downgrades', () => {
  const existing = trophy({ tier: 'silver', at: 1000 });
  assert.deepEqual(upgradeTrophy(existing, trophy({ tier: 'bronze', at: 2000 })), { trophy: existing, status: 'unchanged' });
  assert.deepEqual(upgradeTrophy(existing, trophy({ tier: 'silver', at: 2000 })), { trophy: existing, status: 'unchanged' });
});

test('sanitizeTrophies keeps well-formed entries and drops junk', () => {
  const good = trophy();
  const raw = [good, null, 'x', { ...good, tier: 'platinum' }, { ...good, round: '15' }, { id: 'gp:2026:1:x' }];
  assert.deepEqual(sanitizeTrophies(raw), [good]);
  assert.deepEqual(sanitizeTrophies(undefined), []);
  assert.deepEqual(sanitizeTrophies({ not: 'an array' }), []);
});

test('badge registry has unique ids and includes the existing purple badge', () => {
  const ids = BADGES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(BADGE_EVERYTHING_IS_PURPLE));
  assert.equal(BADGE_EVERYTHING_IS_PURPLE, 'everything-is-purple');
  for (const badge of BADGES) {
    assert.ok(badge.label.length > 0 && badge.blurb.length > 0 && badge.glyph.length > 0, `${badge.id} has copy`);
  }
});

test('seasonSlots lists every round of the season with its trophy, if any', () => {
  const baku = trophy();
  const madrid = trophy({ id: trophyId(2026, 14, 'madrid'), round: 14, circuitId: 'madrid', name: 'MADRID', tier: 'gold' });
  const lastYear = trophy({ id: trophyId(2025, 15, 'baku'), season: 2025 });
  const slots = seasonSlots([baku, lastYear, madrid], 2026, SEASON_ROUNDS);
  assert.equal(slots.length, SEASON_ROUNDS);
  assert.deepEqual(slots[0], { round: 1, trophy: undefined });
  assert.deepEqual(slots[13], { round: 14, trophy: madrid });
  assert.deepEqual(slots[14], { round: 15, trophy: baku });
  assert.ok(!slots.some((s) => s.trophy === lastYear), 'another season is not shown');
});

function ctx(extra: Partial<MilestoneContext> = {}): MilestoneContext {
  return { totalLaps: 0, racesWon: 0, dailyStreak: 0, factsMastered: 0, allPurpleRaceDay: false, superlicence: false, ...extra };
}

test('milestones fire exactly at their thresholds', () => {
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 99 }), []), []);
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 100 }), []), ['laps-100']);
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 1000 }), []), ['laps-100', 'laps-1000']);
  assert.deepEqual(evaluateMilestones(ctx({ racesWon: 1 }), []), ['first-win']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 6 }), []), []);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 7 }), []), ['streak-7']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 13 }), []), ['streak-7']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 14 }), []), ['streak-7', 'streak-14']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 30 }), []), ['streak-7', 'streak-14', 'streak-30']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 49 }), []), ['streak-7', 'streak-14', 'streak-30']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 50 }), []), ['streak-7', 'streak-14', 'streak-30', 'streak-50']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 99 }), []), ['streak-7', 'streak-14', 'streak-30', 'streak-50']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 100 }), []), ['streak-7', 'streak-14', 'streak-30', 'streak-50', 'streak-100']);
  assert.deepEqual(evaluateMilestones(ctx({ factsMastered: 50 }), []), ['facts-50']);
  assert.deepEqual(evaluateMilestones(ctx({ allPurpleRaceDay: true }), []), ['gp-all-purple']);
  assert.deepEqual(evaluateMilestones(ctx({ superlicence: true }), []), ['superlicence']);
});

test('milestones come back in badge-registry order, and each one has a badge', () => {
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 100, racesWon: 1 }), []), ['first-win', 'laps-100']);
  const all = evaluateMilestones(ctx({ totalLaps: 1000, racesWon: 1, dailyStreak: 100, factsMastered: 50, allPurpleRaceDay: true, superlicence: true }), []);
  assert.deepEqual(all, BADGES.map((b) => b.id).filter((id) => all.includes(id)));
  assert.deepEqual(
    BADGES.map((b) => b.id).filter((id) => !all.includes(id)),
    [BADGE_EVERYTHING_IS_PURPLE],
    'every badge except the Free Practice purple lap is a milestone',
  );
});

test('milestones already earned are not returned again', () => {
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 1000, racesWon: 3 }), ['laps-100', 'first-win']), ['laps-1000']);
});

test('streak badges run 7, 14, 30, 50 and 100 days, together in the registry', () => {
  assert.deepEqual([...STREAK_BADGE_DAYS], [7, 14, 30, 50, 100]);
  const streakBadges = BADGES.filter((b) => b.id.startsWith('streak-'));
  assert.deepEqual(streakBadges.map((b) => b.id), ['streak-7', 'streak-14', 'streak-30', 'streak-50', 'streak-100']);
  assert.deepEqual(streakBadges.map((b) => b.glyph), ['7', '14', '30', '50', '100']);
  assert.equal(streakBadges[1].label, '14-Day Streak');
  const ids = BADGES.map((b) => b.id);
  assert.equal(ids.indexOf('streak-100') - ids.indexOf('streak-7'), 4, 'no other badge between them');
});

test('nextStreakGoal names the next level or unearned streak badge', () => {
  assert.equal(nextStreakGoal(3, []), '4 days to bronze and the 7-day badge');
  assert.equal(nextStreakGoal(9, ['streak-7', 'streak-14']), '5 days to silver', 'the 14-day badge is already earned');
  assert.equal(nextStreakGoal(16, ['streak-7', 'streak-14']), '14 days to gold and the 30-day badge');
  assert.equal(nextStreakGoal(35, ['streak-7', 'streak-14', 'streak-30']), '15 days to the 50-day badge');
  assert.equal(nextStreakGoal(29, ['streak-30']), '1 day to gold');
  assert.equal(nextStreakGoal(60, ['streak-100']), '40 days to purple');
  assert.equal(nextStreakGoal(100, []), null, 'nothing left after purple');
});

test('rewardToast puts everything a session earned into one toast', () => {
  assert.equal(rewardToast({ badges: [] }), null);
  assert.deepEqual(rewardToast({ badges: ['first-win'] }), { title: 'Badge unlocked', description: 'First Win' });
  assert.deepEqual(rewardToast({ badges: ['first-win', 'laps-100', 'streak-7'], pitStopEarned: true }), {
    title: '3 badges unlocked',
    description: 'First Win · 100 Laps · 7-Day Streak · Pit stop earned',
  });
  assert.deepEqual(rewardToast({ badges: [], saved: ['2026-09-18'] }), { title: 'A pit stop saved your streak' });
  assert.deepEqual(rewardToast({ badges: [], saved: ['2026-09-17', '2026-09-18'], pitStopEarned: true }), {
    title: '2 pit stops saved your streak',
    description: 'Pit stop earned',
  });
  assert.deepEqual(rewardToast({ badges: [], pitStopEarned: true }), { title: 'Pit stop earned' });
});
