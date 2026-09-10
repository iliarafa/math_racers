import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_NAME, DARK_THEME_COLOR, LIGHT_THEME_COLOR, markWebDocument, pageMetaFor } from './webMeta.ts';

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

function fakeRoot() {
  const calls: Array<[string, string]> = [];
  return { calls, setAttribute: (name: string, value: string) => { calls.push([name, value]); } };
}

test('markWebDocument never stamps data-web inside the native app', () => {
  const root = fakeRoot();
  assert.equal(markWebDocument(root, true), false);
  assert.deepEqual(root.calls, []);
});

test('markWebDocument stamps data-web once in a browser', () => {
  const root = fakeRoot();
  assert.equal(markWebDocument(root, false), true);
  assert.deepEqual(root.calls, [['data-web', '']]);
});

test('markWebDocument without a document root does nothing', () => {
  assert.equal(markWebDocument(undefined, false), false);
});

test('real platform detection: an iOS Capacitor bridge means native, so nothing is stamped', (t) => {
  const g = globalThis as unknown as { webkit?: unknown };
  g.webkit = { messageHandlers: { bridge: {} } };
  t.after(() => { delete g.webkit; });
  const root = fakeRoot();
  assert.equal(markWebDocument(root), false);
  assert.deepEqual(root.calls, []);
});

test('real platform detection: no bridge means web, so data-web is stamped', () => {
  const root = fakeRoot();
  assert.equal(markWebDocument(root), true);
  assert.deepEqual(root.calls, [['data-web', '']]);
});
