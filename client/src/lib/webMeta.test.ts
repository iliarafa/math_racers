import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_NAME, DARK_THEME_COLOR, LIGHT_THEME_COLOR, pageMetaFor } from './webMeta.ts';

test('landing page uses the bare app name and a light toolbar', () => {
  assert.deepEqual(pageMetaFor('/'), { title: APP_NAME, themeColor: LIGHT_THEME_COLOR });
});

test('menu pages are named after the screen and use the dark toolbar', () => {
  assert.equal(pageMetaFor('/hub').title, 'Paddock · Math Racer');
  assert.equal(pageMetaFor('/leaderboard').title, 'Leaderboard · Math Racer');
  assert.equal(pageMetaFor('/hub').themeColor, DARK_THEME_COLOR);
});

test('game routes are named after the mode', () => {
  assert.equal(pageMetaFor('/game/quick-race').title, 'Quick Race · Math Racer');
  assert.equal(pageMetaFor('/game/grand-prix').title, 'Grand Prix · Math Racer');
  assert.equal(pageMetaFor('/game').title, 'Free Practice · Math Racer');
  assert.equal(pageMetaFor('/game/unknown-mode').title, 'Race · Math Racer');
});

test('trailing slashes and query strings do not change the page', () => {
  assert.equal(pageMetaFor('/garage/').title, 'Garage · Math Racer');
  assert.equal(pageMetaFor('/garage?tab=stats').title, 'Garage · Math Racer');
});

test('unknown routes are titled as not found', () => {
  assert.equal(pageMetaFor('/some-old-link').title, 'Page not found · Math Racer');
  assert.equal(pageMetaFor('/some-old-link').themeColor, DARK_THEME_COLOR);
});
