import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  KEY_STRIP_KEYS,
  keyForEvent,
  keyLabel,
  laneKeyForEvent,
  powerKeyForEvent,
} from './keyStrip.ts';

test('the strip lists the digits in keyboard row order, then backspace and enter', () => {
  assert.deepEqual([...KEY_STRIP_KEYS], ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Backspace', 'Enter']);
});

test('digit keys map to themselves', () => {
  for (const d of ['0', '1', '5', '9']) assert.equal(keyForEvent(d), d);
});

test('Backspace and both Enter variants map to the strip keys', () => {
  assert.equal(keyForEvent('Backspace'), 'Backspace');
  assert.equal(keyForEvent('Enter'), 'Enter');
  assert.equal(keyForEvent('NumpadEnter'), 'Enter');
});

test('other keys are not strip keys', () => {
  for (const k of ['a', ' ', 'Delete', 'Tab', '-', '+', 'ArrowLeft', '']) assert.equal(keyForEvent(k), null);
});

test('power-up shortcuts mirror the race keyboard handler', () => {
  assert.equal(powerKeyForEvent('-'), 'aero');
  assert.equal(powerKeyForEvent('Clear'), 'aero');
  assert.equal(powerKeyForEvent('+'), 'overtake');
  assert.equal(powerKeyForEvent('='), 'overtake');
  assert.equal(powerKeyForEvent('\\'), 'overtake');
  assert.equal(powerKeyForEvent('7'), null);
  assert.equal(powerKeyForEvent('Enter'), null);
});

test('lane steering keys mirror the Lane Racer keyboard handler', () => {
  for (const k of ['ArrowLeft', 'a', 'A']) assert.equal(laneKeyForEvent(k), 'left');
  for (const k of ['ArrowRight', 'd', 'D']) assert.equal(laneKeyForEvent(k), 'right');
  assert.equal(laneKeyForEvent('ArrowUp'), null);
  assert.equal(laneKeyForEvent('s'), null);
});

test('labels keep digits as-is and use glyphs for the two control keys', () => {
  assert.equal(keyLabel('4'), '4');
  assert.equal(keyLabel('Backspace'), '⌫');
  assert.equal(keyLabel('Enter'), '↵');
});
