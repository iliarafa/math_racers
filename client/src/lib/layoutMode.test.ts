import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDesktopStage, DESKTOP_MIN_HEIGHT, DESKTOP_MIN_WIDTH, desktopStage, detectLayoutMode, markDesktopDocument, type LayoutInputs } from './layoutMode.ts';

const desktop: LayoutInputs = { native: false, ipadScaled: false, finePointer: true, innerWidth: 1440 };

test('a wide browser with a mouse is desktop', () => {
  assert.equal(detectLayoutMode(desktop), 'desktop');
  assert.equal(detectLayoutMode({ ...desktop, innerWidth: DESKTOP_MIN_WIDTH }), 'desktop');
});

test('a narrow window with a mouse stays desktop (the stage scales down instead)', () => {
  assert.equal(detectLayoutMode({ ...desktop, innerWidth: DESKTOP_MIN_WIDTH - 1 }), 'desktop');
  assert.equal(detectLayoutMode({ ...desktop, innerWidth: 500 }), 'desktop');
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

test('desktopStage is the window at or above the floor', () => {
  assert.deepEqual(desktopStage(1440, 900), { scale: 1, width: 1440, height: 900 });
  assert.deepEqual(desktopStage(DESKTOP_MIN_WIDTH, DESKTOP_MIN_HEIGHT), { scale: 1, width: 900, height: 720 });
});

test('desktopStage below the floor scales down and keeps the window shape', () => {
  const stage = desktopStage(766, 490);
  assert.ok(Math.abs(stage.scale - 490 / 720) < 1e-9);
  assert.ok(Math.abs(stage.height - 720) < 1e-9);
  assert.ok(Math.abs(stage.width - 766 * 720 / 490) < 1e-9);
  assert.ok(stage.width >= DESKTOP_MIN_WIDTH);
  // Height-bound and width-bound windows.
  assert.ok(Math.abs(desktopStage(900, 400).height - DESKTOP_MIN_HEIGHT) < 1e-9);
  const tall = desktopStage(600, 900);
  assert.ok(Math.abs(tall.width - DESKTOP_MIN_WIDTH) < 1e-9);
  assert.ok(tall.height >= DESKTOP_MIN_HEIGHT);
});

test('desktopStage with no window size leaves it unscaled', () => {
  assert.deepEqual(desktopStage(0, 0), { scale: 1, width: 0, height: 0 });
});

function fakeStyled() {
  const props = new Map<string, string>();
  return {
    props,
    style: {
      setProperty: (name: string, value: string) => { props.set(name, value); },
      removeProperty: (name: string) => { const v = props.get(name) ?? ''; props.delete(name); return v; },
    },
  };
}

test('applyDesktopStage sets the stage size and zooms #root only below the floor', () => {
  const html = fakeStyled();
  const root = fakeStyled();
  applyDesktopStage(html, root, 'desktop', { innerWidth: 1440, innerHeight: 900 });
  assert.equal(html.props.get('--stage-w'), '1440px');
  assert.equal(html.props.get('--stage-h'), '900px');
  assert.equal(root.props.has('zoom'), false);

  applyDesktopStage(html, root, 'desktop', { innerWidth: 450, innerHeight: 360 });
  assert.equal(html.props.get('--stage-w'), '900px');
  assert.equal(html.props.get('--stage-h'), '720px');
  assert.equal(root.props.get('zoom'), '0.5');
});

test('applyDesktopStage clears everything outside desktop mode', () => {
  const html = fakeStyled();
  const root = fakeStyled();
  applyDesktopStage(html, root, 'desktop', { innerWidth: 450, innerHeight: 320 });
  assert.equal(applyDesktopStage(html, root, 'phone', { innerWidth: 390, innerHeight: 844 }), null);
  assert.equal(html.props.size, 0);
  assert.equal(root.props.size, 0);
});
