import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BADGES,
  BADGE_EVERYTHING_IS_PURPLE,
  SEASON_ROUNDS,
  evaluateMilestones,
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
  return { totalLaps: 0, racesWon: 0, dailyStreak: 0, factsMastered: 0, allPurpleRaceDay: false, ...extra };
}

test('milestones fire exactly at their thresholds', () => {
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 99 }), []), []);
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 100 }), []), ['laps-100']);
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 1000 }), []), ['laps-100', 'laps-1000']);
  assert.deepEqual(evaluateMilestones(ctx({ racesWon: 1 }), []), ['first-win']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 7 }), []), ['streak-7']);
  assert.deepEqual(evaluateMilestones(ctx({ dailyStreak: 30 }), []), ['streak-7', 'streak-30']);
  assert.deepEqual(evaluateMilestones(ctx({ factsMastered: 50 }), []), ['facts-50']);
  assert.deepEqual(evaluateMilestones(ctx({ allPurpleRaceDay: true }), []), ['gp-all-purple']);
});

test('milestones come back in badge-registry order, and each one has a badge', () => {
  assert.deepEqual(evaluateMilestones(ctx({ totalLaps: 100, racesWon: 1 }), []), ['first-win', 'laps-100']);
  const all = evaluateMilestones(ctx({ totalLaps: 1000, racesWon: 1, dailyStreak: 30, factsMastered: 50, allPurpleRaceDay: true }), []);
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
