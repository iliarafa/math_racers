import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSessionAeroZones } from './gameLogic.ts';

// The flags Game.tsx passes for each session. Power-ups are Grand Prix only, and the
// Grand Prix and Free Practice force sim mode on.
const quickRace = { powerUpsEnabled: false, practice: false, simMode: false };
const freePractice = { powerUpsEnabled: false, practice: true, simMode: true };
const gpPractice = { powerUpsEnabled: true, practice: true, simMode: true };
const gpQualifyingOrRace = { powerUpsEnabled: true, practice: false, simMode: true };

test('Quick Race gets no AERO zones', () => {
  assert.deepEqual(getSessionAeroZones(20, quickRace), []);
});

test('Free Practice gets no AERO zones at any session length', () => {
  assert.deepEqual(getSessionAeroZones(25, freePractice), []);
  assert.deepEqual(getSessionAeroZones(50, freePractice), []);
  assert.deepEqual(getSessionAeroZones(100, freePractice), []);
});

test('Grand Prix Practice keeps one zone per 10 laps, evenly spaced', () => {
  assert.deepEqual(getSessionAeroZones(30, gpPractice), [7, 15, 22]);
});

test('Grand Prix Qualifying and Race Day keep the five sim-mode zones', () => {
  assert.deepEqual(getSessionAeroZones(20, gpQualifyingOrRace), [3, 6, 10, 14, 17]);
  assert.deepEqual(getSessionAeroZones(51, gpQualifyingOrRace), [7, 15, 25, 35, 43]);
});
