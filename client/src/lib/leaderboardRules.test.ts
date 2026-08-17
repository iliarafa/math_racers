import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  circuitPickerIds,
  leaderboardEmptyMessage,
  resolveLeaderboardView,
  shouldReplaceBest,
} from './leaderboardRules.ts';

test('replace only when incoming score is strictly higher', () => {
  assert.equal(shouldReplaceBest(null, 100), true);
  assert.equal(shouldReplaceBest(100, 101), true);
  assert.equal(shouldReplaceBest(100, 100), false);
  assert.equal(shouldReplaceBest(100, 99), false);
});

test('defaults to current circuit, persisted operation, Free Practice', () => {
  const view = resolveLeaderboardView({
    search: '',
    currentCircuitId: 'zandvoort',
    persistedOperation: 'Division',
  });
  assert.deepEqual(view, {
    tab: 'free-practice',
    circuitId: 'zandvoort',
    operation: 'Division',
  });
});

test('maps old mode query values', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=pst',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'free-practice',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=lane-racer',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'free-practice',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=grand-prix&circuit=hungary&operation=Multiplication',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'grand-prix',
  );
});

test('unknown operation falls back to persisted, then Addition', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?operation=Algebra',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Subtraction',
    }).operation,
    'Subtraction',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?operation=Algebra',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Nope',
    }).operation,
    'Addition',
  );
});

test('circuit=all is kept; missing circuit uses current', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?circuit=all',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).circuitId,
    'all',
  );
});

test('empty copy names the session and circuit', () => {
  assert.equal(
    leaderboardEmptyMessage('free-practice', 'Addition', 'Zandvoort'),
    'No 100-lap Addition times at Zandvoort yet',
  );
  assert.equal(
    leaderboardEmptyMessage('grand-prix', 'Multiplication', 'Monza'),
    'No Race Day Multiplication times at Monza yet',
  );
  assert.equal(
    leaderboardEmptyMessage('free-practice', 'Addition', 'all'),
    'No 100-lap Addition times yet',
  );
  assert.equal(
    leaderboardEmptyMessage('grand-prix', 'Division', 'all'),
    'No Race Day Division times yet',
  );
});

test('circuit picker puts current first and does not duplicate it', () => {
  assert.deepEqual(
    circuitPickerIds('zandvoort', ['spa', 'zandvoort', 'hungary']),
    ['zandvoort', 'spa', 'hungary'],
  );
});
