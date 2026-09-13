import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareLocalBest,
  fpSessionForLaps,
  globalHint,
  isGlobalSession,
  localBestKey,
  localTierNote,
  parseLocalBestKey,
  sanitizeLocalBests,
  selectLocalBests,
  sessionLabel,
  type LocalBestEntry,
} from './localBests.ts';

function entry(score: number, extra: Partial<LocalBestEntry> = {}): LocalBestEntry {
  return {
    score,
    totalTime: 60000,
    mistakes: 0,
    accuracy: 100,
    difficultyAchieved: 'easy',
    laps: 25,
    at: 1,
    ...extra,
  };
}

test('key builds and parses round-trip', () => {
  const key = localBestKey('fp', 'zandvoort', 'Addition', '25');
  assert.equal(key, 'fp:zandvoort:Addition:25');
  assert.deepEqual(parseLocalBestKey(key), {
    board: 'fp',
    circuitId: 'zandvoort',
    operation: 'Addition',
    session: '25',
  });
  assert.deepEqual(parseLocalBestKey('gp:monza:Division:race'), {
    board: 'gp',
    circuitId: 'monza',
    operation: 'Division',
    session: 'race',
  });
  assert.deepEqual(parseLocalBestKey('qr:madrid:Addition:race'), {
    board: 'qr',
    circuitId: 'madrid',
    operation: 'Addition',
    session: 'race',
  });
  assert.equal(parseLocalBestKey('qr:madrid:Addition:25'), null);
});

test('key parser rejects malformed keys', () => {
  assert.equal(parseLocalBestKey('fp:zandvoort:Addition'), null);
  assert.equal(parseLocalBestKey('lane:zandvoort:Addition:25'), null);
  assert.equal(parseLocalBestKey('fp:zandvoort:Addition:race'), null);
  assert.equal(parseLocalBestKey('gp:zandvoort:Addition:25'), null);
  assert.equal(parseLocalBestKey(''), null);
});

test('only 25, 50 and 100 laps are Free Practice sessions', () => {
  assert.equal(fpSessionForLaps(25), '25');
  assert.equal(fpSessionForLaps(50), '50');
  assert.equal(fpSessionForLaps(100), '100');
  assert.equal(fpSessionForLaps(30), null);
  assert.equal(fpSessionForLaps(0), null);
  assert.equal(fpSessionForLaps(99), null);
});

test('higher score replaces, equal keeps', () => {
  assert.equal(compareLocalBest(undefined, entry(100)), true);
  assert.equal(compareLocalBest(entry(100), entry(101)), true);
  assert.equal(compareLocalBest(entry(100), entry(100)), false);
  assert.equal(compareLocalBest(entry(100), entry(99)), false);
});

test('session labels and global tier detection', () => {
  assert.equal(sessionLabel('fp', '25'), '25 laps');
  assert.equal(sessionLabel('fp', '50'), '50 laps');
  assert.equal(sessionLabel('fp', '100'), '100 laps');
  assert.equal(sessionLabel('gp', 'practice'), 'Practice');
  assert.equal(sessionLabel('gp', 'qualifying'), 'Qualifying');
  assert.equal(sessionLabel('gp', 'race'), 'Race Day');
  assert.equal(sessionLabel('qr', 'race'), 'Quick Race');

  assert.equal(isGlobalSession('fp', '100'), true);
  assert.equal(isGlobalSession('gp', 'race'), true);
  assert.equal(isGlobalSession('qr', 'race'), true);
  assert.equal(isGlobalSession('fp', '25'), false);
  assert.equal(isGlobalSession('fp', '50'), false);
  assert.equal(isGlobalSession('gp', 'practice'), false);
  assert.equal(isGlobalSession('gp', 'qualifying'), false);
});

test('tier notes and hints', () => {
  assert.equal(localTierNote('fp', '100'), null);
  assert.equal(localTierNote('gp', 'race'), null);
  assert.equal(localTierNote('qr', 'race'), null);
  assert.equal(localTierNote('fp', '25'), 'Local best · Record 100 laps to post to the global board');
  assert.equal(localTierNote('gp', 'practice'), 'Local best · Finish Race Day to post globally');
  assert.equal(globalHint('fp'), 'Record 100 laps to post to the global board');
  assert.equal(globalHint('gp'), 'Finish Race Day to post to the global board');
  assert.equal(globalHint('qr'), 'Finish a Quick Race to post to the global board');
});

test('selectLocalBests filters by board, operation and circuit', () => {
  const bests = {
    'fp:zandvoort:Addition:25': entry(500),
    'fp:zandvoort:Subtraction:25': entry(900),
    'gp:zandvoort:Addition:practice': entry(700),
    'fp:monza:Addition:25': entry(650),
  };
  const zandvoort = selectLocalBests(bests, { board: 'fp', operation: 'Addition', circuitId: 'zandvoort' });
  assert.deepEqual(zandvoort, [{ session: '25', circuitId: 'zandvoort', entry: entry(500) }]);

  const gp = selectLocalBests(bests, { board: 'gp', operation: 'Addition', circuitId: 'zandvoort' });
  assert.deepEqual(gp, [{ session: 'practice', circuitId: 'zandvoort', entry: entry(700) }]);

  assert.deepEqual(selectLocalBests(bests, { board: 'fp', operation: 'Division', circuitId: 'zandvoort' }), []);
});

test('selectLocalBests across all circuits keeps the higher score and names its circuit', () => {
  const bests = {
    'fp:zandvoort:Addition:25': entry(500),
    'fp:monza:Addition:25': entry(650),
    'fp:monza:Addition:100': entry(300),
  };
  const all = selectLocalBests(bests, { board: 'fp', operation: 'Addition', circuitId: 'all' });
  assert.deepEqual(all, [
    { session: '25', circuitId: 'monza', entry: entry(650) },
    { session: '100', circuitId: 'monza', entry: entry(300) },
  ]);
});

test('selectLocalBests orders sessions and skips malformed keys', () => {
  const fp = selectLocalBests(
    {
      'fp:z:Addition:100': entry(1),
      'fp:z:Addition:25': entry(2),
      'fp:z:Addition:50': entry(3),
      'junk': entry(9),
      'fp:z:Addition:race': entry(9),
    },
    { board: 'fp', operation: 'Addition', circuitId: 'z' },
  );
  assert.deepEqual(fp.map((b) => b.session), ['25', '50', '100']);

  const gp = selectLocalBests(
    {
      'gp:z:Addition:race': entry(1),
      'gp:z:Addition:qualifying': entry(2),
      'gp:z:Addition:practice': entry(3),
    },
    { board: 'gp', operation: 'Addition', circuitId: 'z' },
  );
  assert.deepEqual(gp.map((b) => b.session), ['practice', 'qualifying', 'race']);
});

test('sanitizeLocalBests drops anything that is not a valid entry', () => {
  assert.deepEqual(sanitizeLocalBests(null), {});
  assert.deepEqual(sanitizeLocalBests('x'), {});
  assert.deepEqual(sanitizeLocalBests([]), {});
  assert.deepEqual(sanitizeLocalBests({ 'fp:z:Addition:25': { score: 'high', totalTime: 1 } }), {});
  assert.deepEqual(sanitizeLocalBests({ 'bad key': entry(1) }), {});
  const valid = { 'fp:z:Addition:25': entry(42) };
  assert.deepEqual(sanitizeLocalBests(valid), valid);
});
