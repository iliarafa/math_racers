import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyBadge,
  applyDailyStreak,
  applyFactResults,
  applyRewardsSeen,
  applyWeekendTrophy,
  loadGameState,
  mutateGameState,
  resetGameState,
  subscribeGameState,
} from './gameLogic.ts';
import { EMPTY_STREAK } from './dailyStreak.ts';
import { trophyId, type Trophy } from './trophies.ts';

type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function memoryStorage(): Store {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
    clear: () => { data.clear(); },
  };
}

function withStorage(store: Store, run: () => void) {
  const globalObj = globalThis as { localStorage?: Store };
  const previous = globalObj.localStorage;
  globalObj.localStorage = store;
  try {
    resetGameState();
    run();
  } finally {
    if (previous === undefined) delete globalObj.localStorage;
    else globalObj.localStorage = previous;
  }
}

test('a mutation is applied to the saved state, not to a stale copy', () => {
  withStorage(memoryStorage(), () => {
    // What a long-lived hook instance (MenuMusic in App.tsx) holds after mount.
    const stale = loadGameState();

    // Game.tsx finishes a race and records a win.
    mutateGameState((s) => ({ ...s, racesWon: s.racesWon + 1 }));

    // The mute button is tapped: it only knows the field it changes.
    const returned = mutateGameState((s) => ({ ...s, soundEnabled: !stale.soundEnabled }));

    const saved = loadGameState();
    assert.equal(saved.racesWon, 1, 'the win must survive the sound toggle');
    assert.equal(saved.soundEnabled, false);
    assert.deepEqual(returned, saved, 'mutateGameState returns exactly what it saved');
  });
});

test('consecutive mutations in one handler compose', () => {
  withStorage(memoryStorage(), () => {
    mutateGameState((s) => ({ ...s, coins: s.coins + 10 }));
    mutateGameState((s) => ({ ...s, totalLaps: s.totalLaps + 1 }));
    const saved = loadGameState();
    assert.equal(saved.coins, 10);
    assert.equal(saved.totalLaps, 1);
  });
});

test('loadGameState returns defaults when nothing is saved', () => {
  withStorage(memoryStorage(), () => {
    const fresh = loadGameState();
    assert.equal(fresh.soundEnabled, true);
    assert.equal(fresh.racesWon, 0);
    assert.deepEqual(fresh.localBests, {});
    assert.deepEqual(fresh.earnedBadges, []);
  });
});

test('every hook instance is told about a saved state', () => {
  withStorage(memoryStorage(), () => {
    const seen: number[] = [];
    const unsubscribe = subscribeGameState((s) => { seen.push(s.racesWon); });
    mutateGameState((s) => ({ ...s, racesWon: 1 }));
    mutateGameState((s) => ({ ...s, racesWon: 2 }));
    unsubscribe();
    mutateGameState((s) => ({ ...s, racesWon: 3 }));
    assert.deepEqual(seen, [1, 2], 'notified on each save until unsubscribed');
  });
});

test('reward fields default when missing and drop junk on load', () => {
  const store = memoryStorage();
  withStorage(store, () => {
    store.setItem('f1-math-racer-state', JSON.stringify({
      trophies: [{ id: 'bad' }, 'x'],
      dailyStreak: { count: 'three' },
      factStats: { '7x8': { seen: 'many' } },
      unseenRewards: ['gp:2026:15:baku', 42, null],
    }));
    const loaded = loadGameState();
    assert.deepEqual(loaded.trophies, []);
    assert.deepEqual(loaded.dailyStreak, EMPTY_STREAK);
    assert.deepEqual(loaded.factStats, {});
    assert.deepEqual(loaded.unseenRewards, ['gp:2026:15:baku']);
  });
});

function bakuTrophy(extra: Partial<Trophy> = {}): Trophy {
  return { id: trophyId(2026, 15, 'baku'), season: 2026, round: 15, circuitId: 'baku', name: 'BAKU', tier: 'bronze', operation: 'Addition', at: 10, ...extra };
}

test('a weekend trophy is added, upgraded but never downgraded, and flagged as unseen', () => {
  withStorage(memoryStorage(), () => {
    const first = applyWeekendTrophy(loadGameState(), bakuTrophy());
    assert.equal(first.status, 'new');
    assert.deepEqual(first.state.trophies, [bakuTrophy()]);
    assert.deepEqual(first.state.unseenRewards, [bakuTrophy().id]);

    const second = applyWeekendTrophy(first.state, bakuTrophy({ tier: 'gold', at: 20 }));
    assert.equal(second.status, 'upgraded');
    assert.equal(second.state.trophies.length, 1);
    assert.equal(second.state.trophies[0].tier, 'gold');
    assert.equal(second.state.trophies[0].at, 10);
    assert.deepEqual(second.state.unseenRewards, [bakuTrophy().id], 'not listed twice');

    const third = applyWeekendTrophy(second.state, bakuTrophy({ tier: 'silver', at: 30 }));
    assert.equal(third.status, 'unchanged');
    assert.equal(third.state.trophies[0].tier, 'gold');
  });
});

test('the daily streak counts once per day', () => {
  withStorage(memoryStorage(), () => {
    const first = applyDailyStreak(loadGameState(), '2026-09-18');
    assert.equal(first.change, 'started');
    assert.equal(first.state.dailyStreak.count, 1);
    const again = applyDailyStreak(first.state, '2026-09-18');
    assert.equal(again.change, 'same');
    assert.equal(again.state.dailyStreak.count, 1);
    const next = applyDailyStreak(again.state, '2026-09-19');
    assert.equal(next.change, 'incremented');
    assert.equal(next.state.dailyStreak.count, 2);
  });
});

test('fact results are folded into factStats', () => {
  withStorage(memoryStorage(), () => {
    const result = applyFactResults(loadGameState(), [{ fact: '7x8', responseTime: 3000, result: 'correct' }], 5);
    assert.equal(result.state.factStats['7x8'].seen, 1);
    assert.equal(result.state.factStats['7x8'].lastAt, 5);
    assert.deepEqual(result.improved, []);
  });
});

test('a newly earned badge is flagged as unseen; an old one is not', () => {
  withStorage(memoryStorage(), () => {
    const first = applyBadge(loadGameState(), 'first-win');
    assert.equal(first.newlyEarned, true);
    assert.deepEqual(first.state.earnedBadges, ['first-win']);
    assert.deepEqual(first.state.unseenRewards, ['first-win']);
    const again = applyBadge(first.state, 'first-win');
    assert.equal(again.newlyEarned, false);
    assert.deepEqual(again.state.unseenRewards, ['first-win']);
  });
});

test('marking rewards seen clears the unseen list and nothing else', () => {
  withStorage(memoryStorage(), () => {
    const withRewards = applyBadge(applyWeekendTrophy(loadGameState(), bakuTrophy()).state, 'first-win').state;
    const seen = applyRewardsSeen(withRewards);
    assert.deepEqual(seen.unseenRewards, []);
    assert.equal(seen.trophies.length, 1);
    assert.deepEqual(seen.earnedBadges, ['first-win']);
  });
});

test('progress survives a storage that refuses writes', () => {
  const readOnly: Store = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
  const originalError = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => { logged.push(args[0]); };
  try {
    withStorage(readOnly, () => {
      mutateGameState((s) => ({ ...s, racesWon: 1 }));
      mutateGameState((s) => ({ ...s, totalLaps: 5 }));
      const current = loadGameState();
      assert.equal(current.racesWon, 1, 'an earlier mutation is not lost when the disk cannot be written');
      assert.equal(current.totalLaps, 5);
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 2, 'each refused write is reported once');
});
