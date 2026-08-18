import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRIVING_SCHOOL_STAGES } from './drivingSchool.ts';
import { getLicenceStatus, hasSuperlicence, REACTION_LICENCE_MS } from './drivingSchoolLicence.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => { data.clear(); },
  };
}

test('Grand Prix stays locked until every licence step is done', () => {
  const store = memoryStorage();
  const globalObj = globalThis as { localStorage?: ReturnType<typeof memoryStorage> };
  const previous = globalObj.localStorage;
  globalObj.localStorage = store;

  try {
    assert.equal(hasSuperlicence(), false);
    assert.equal(getLicenceStatus().complete, false);

    store.setItem('drivingSchoolHighestCleared', String(DRIVING_SCHOOL_STAGES.length));
    assert.equal(getLicenceStatus().flashcards, true);
    assert.equal(hasSuperlicence(), false);

    store.setItem('reactionBestMs', String(REACTION_LICENCE_MS - 1));
    assert.equal(getLicenceStatus().reaction, true);
    assert.equal(hasSuperlicence(), false);

    store.setItem('laneRacerP1Win', '1');
    assert.equal(hasSuperlicence(), true);
  } finally {
    if (previous === undefined) delete globalObj.localStorage;
    else globalObj.localStorage = previous;
  }
});
