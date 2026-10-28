import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CURRENT_ROUND,
  MAP_REGIONS,
  SEASON_CALENDAR,
  formatRaceDate,
  isRoundOpen,
  openRounds,
  parseMapRegion,
  parseWeekendRound,
  regionSpec,
  roundsInRegion,
} from './seasonCalendar.ts';
import { SEASON_ROUNDS, TROPHY_CODES } from './trophies.ts';
import { SIM_LAP_COUNTS } from './gameLogic.ts';

test('the calendar has one row per round of the season, numbered in order', () => {
  assert.equal(SEASON_CALENDAR.length, SEASON_ROUNDS);
  SEASON_CALENDAR.forEach((row, i) => assert.equal(row.round, i + 1));
  const ids = SEASON_CALENDAR.map((r) => r.circuitId);
  assert.equal(new Set(ids).size, ids.length, 'no circuit appears twice');
});

test('every round has a trophy code, and every open round can be raced', () => {
  for (const row of SEASON_CALENDAR) {
    assert.ok(TROPHY_CODES[row.circuitId], `${row.circuitId} has a TROPHY_CODES row`);
  }
  for (const row of openRounds()) {
    assert.ok(row.weekend, `round ${row.round} has its weekend settings`);
    assert.equal(SIM_LAP_COUNTS[row.circuitId], row.weekend.simLapCount, `${row.circuitId} lap count matches SIM_LAP_COUNTS`);
  }
});

test('rounds up to this week are open; later ones wait for their rotation and carry a race date', () => {
  assert.equal(isRoundOpen(CURRENT_ROUND), true);
  assert.equal(openRounds().length, CURRENT_ROUND);
  for (const row of SEASON_CALENDAR.filter((r) => r.round > CURRENT_ROUND)) {
    assert.equal(isRoundOpen(row.round), false);
    assert.match(row.raceDate ?? '', /^\d{4}-\d{2}-\d{2}$/, `round ${row.round} shows its date`);
  }
  assert.equal(isRoundOpen(0), false);
  assert.equal(isRoundOpen(99), false);
});

test('every region holds rounds, and every pin sits inside its region', () => {
  const placed = MAP_REGIONS.flatMap((region) => {
    const rows = roundsInRegion(region.id);
    assert.ok(rows.length > 0, `${region.id} is not empty`);
    for (const row of rows) {
      const { west, east, south, north } = regionSpec(row.region).bounds;
      assert.ok(row.lng > west && row.lng < east && row.lat > south && row.lat < north, `${row.circuitId} lies inside ${row.region}`);
    }
    return rows;
  });
  assert.equal(placed.length, SEASON_CALENDAR.length);
});

test('the weekend round comes from ?round= and only names a real round', () => {
  assert.equal(parseWeekendRound('?round=9'), 9);
  assert.equal(parseWeekendRound('round=23'), 23);
  assert.equal(parseWeekendRound(''), null);
  assert.equal(parseWeekendRound('?round=0'), null);
  assert.equal(parseWeekendRound('?round=24'), null);
  assert.equal(parseWeekendRound('?round=9abc'), null);
  assert.equal(parseWeekendRound('?round=-3'), null);
  assert.equal(parseWeekendRound('?mode=race'), null);
});

test('the map region comes from ?region= and only names a real region', () => {
  assert.equal(parseMapRegion('?region=europe'), 'europe');
  assert.equal(parseMapRegion('?region=asia-pacific'), 'asia-pacific');
  assert.equal(parseMapRegion('?region=mars'), null);
  assert.equal(parseMapRegion(''), null);
});

test('a race date reads as day and month, as written', () => {
  assert.equal(formatRaceDate('2026-11-08'), '8 NOV');
  assert.equal(formatRaceDate('2026-12-06'), '6 DEC');
});
