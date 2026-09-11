import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DESKTOP_MIN_WIDTH, detectLayoutMode, markDesktopDocument, type LayoutInputs } from './layoutMode.ts';

const desktop: LayoutInputs = { native: false, ipadScaled: false, finePointer: true, innerWidth: 1440 };

test('a wide browser with a mouse is desktop', () => {
  assert.equal(detectLayoutMode(desktop), 'desktop');
  assert.equal(detectLayoutMode({ ...desktop, innerWidth: DESKTOP_MIN_WIDTH }), 'desktop');
});

test('just under the minimum width falls back to the phone stack', () => {
  assert.equal(detectLayoutMode({ ...desktop, innerWidth: DESKTOP_MIN_WIDTH - 1 }), 'phone');
});

test('a touch laptop or phone browser without a fine pointer is phone', () => {
  assert.equal(detectLayoutMode({ ...desktop, finePointer: false }), 'phone');
  assert.equal(detectLayoutMode({ native: false, ipadScaled: false, finePointer: false, innerWidth: 390 }), 'phone');
});

test('the native iPhone app is phone even if the WebView reports a fine pointer', () => {
  assert.equal(detectLayoutMode({ ...desktop, native: true }), 'phone');
});

test('the iPad flag wins over everything, in the app and in iPad Safari', () => {
  assert.equal(detectLayoutMode({ native: true, ipadScaled: true, finePointer: false, innerWidth: 1366 }), 'ipad');
  assert.equal(detectLayoutMode({ native: false, ipadScaled: true, finePointer: true, innerWidth: 1366 }), 'ipad');
});

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name: string, value: string) => { attrs.set(name, value); },
    removeAttribute: (name: string) => { attrs.delete(name); },
  };
}

test('markDesktopDocument stamps data-desktop only for the desktop mode', () => {
  const root = fakeRoot();
  assert.equal(markDesktopDocument(root, 'desktop'), true);
  assert.deepEqual([...root.attrs.entries()], [['data-desktop', '']]);
  assert.equal(markDesktopDocument(root, 'phone'), false);
  assert.deepEqual([...root.attrs.entries()], []);
  assert.equal(markDesktopDocument(root, 'ipad'), false);
  assert.deepEqual([...root.attrs.entries()], []);
});

test('markDesktopDocument without a document root does nothing', () => {
  assert.equal(markDesktopDocument(undefined, 'desktop'), false);
});
