import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadGameState, mutateGameState, resetGameState, subscribeGameState } from './gameLogic.ts';

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
