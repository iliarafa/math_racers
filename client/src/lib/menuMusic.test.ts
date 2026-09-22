import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isMenuMusicRoute } from './menuMusic.ts';

test('the setup screens under /game keep the menu music playing', () => {
  // Game pauses the music itself once the red lights start (racingStateChange).
  assert.equal(isMenuMusicRoute('/game/grand-prix'), true);
  assert.equal(isMenuMusicRoute('/game/free-practice'), true);
  assert.equal(isMenuMusicRoute('/game/quick-race'), true);
});

test('menu pages play the music and other pages do not', () => {
  assert.equal(isMenuMusicRoute('/'), true);
  assert.equal(isMenuMusicRoute('/hub'), true);
  assert.equal(isMenuMusicRoute('/game'), true);
  assert.equal(isMenuMusicRoute('/trophies'), true);
  assert.equal(isMenuMusicRoute('/dev/circuit-maps'), false);
  assert.equal(isMenuMusicRoute('/gamer'), false);
});
