import { Capacitor } from '@capacitor/core';

/**
 * Which racing layout a device gets.
 *
 * - `phone`: the stacked HUD with the on-screen keypad. iPhone app, phone browsers and
 *   touch-only browser windows.
 * - `ipad`: the phone stack scaled by `client/index.html` (`data-ipad-scale`), split into two
 *   panes in landscape by `index.css`. Set both inside the iPad app and in iPad Safari, and it
 *   always wins here so an iPad with a keyboard and trackpad never turns into a desktop.
 * - `desktop`: laptop and desktop browsers. Fine pointer with hover, physical keyboard, at
 *   any window size. Renders the desktop race components instead of the phone JSX; below
 *   the stage floor the whole app is scaled down to fit (`desktopStage`).
 *
 * Never `desktop` inside the native app, so the iOS build is untouched by anything gated here.
 */
export type LayoutMode = 'phone' | 'ipad' | 'desktop';

/**
 * The desktop stage never lays out smaller than this; a smaller window scales it down.
 * 720 tall is what the Free Practice / Grand Prix setup card needs (about 717 px).
 */
export const DESKTOP_MIN_WIDTH = 900;
export const DESKTOP_MIN_HEIGHT = 720;

export interface LayoutInputs {
  native: boolean;
  ipadScaled: boolean;
  finePointer: boolean;
  innerWidth: number;
}

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/** Read the live inputs. Safe without a window (returns phone-ish values). */
export function readLayoutInputs(): LayoutInputs {
  if (typeof window === 'undefined') {
    return { native: false, ipadScaled: false, finePointer: false, innerWidth: 0 };
  }
  return {
    native: Capacitor.isNativePlatform(),
    ipadScaled: document.documentElement.hasAttribute('data-ipad-scale'),
    finePointer: window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false,
    innerWidth: window.innerWidth,
  };
}

export function detectLayoutMode(input: LayoutInputs = readLayoutInputs()): LayoutMode {
  if (input.ipadScaled) return 'ipad';
  if (input.native) return 'phone';
  if (input.finePointer) return 'desktop';
  return 'phone';
}

/** The media query the hook listens to for pointer changes (docking a mouse, etc.). */
export const FINE_POINTER_MEDIA_QUERY = FINE_POINTER_QUERY;

/**
 * Keep `data-desktop` on <html> in step with the layout mode so CSS can scope to it.
 * Returns whether the attribute is present afterwards. `root` and `mode` are injectable.
 */
export function markDesktopDocument(
  root: Pick<Element, 'setAttribute' | 'removeAttribute'> | undefined = globalThis.document?.documentElement,
  mode: LayoutMode = detectLayoutMode(),
): boolean {
  if (!root) return false;
  if (mode === 'desktop') {
    root.setAttribute('data-desktop', '');
    return true;
  }
  root.removeAttribute('data-desktop');
  return false;
}

export interface DesktopStage {
  /** Zoom applied to #root: 1 at or above the floor, smaller below it. */
  scale: number;
  /** Layout size in CSS px before the zoom; at least the floor in both directions. */
  width: number;
  height: number;
}

/**
 * Size of the desktop stage for a window. Above the floor the stage is the window. Below it
 * the stage grows to the floor along the tighter side and keeps the window's shape, so once
 * scaled by `scale` it fills the window exactly, with no scroll and no letterbox.
 */
export function desktopStage(innerWidth: number, innerHeight: number): DesktopStage {
  const scale = Math.min(1, innerWidth / DESKTOP_MIN_WIDTH, innerHeight / DESKTOP_MIN_HEIGHT);
  if (!(scale > 0)) return { scale: 1, width: innerWidth, height: innerHeight };
  return { scale, width: innerWidth / scale, height: innerHeight / scale };
}

type StyleTarget = { style: { setProperty(name: string, value: string): void; removeProperty(name: string): string } };

/**
 * Size the desktop stage: `--stage-w` / `--stage-h` on <html> (read by the desktop layout in
 * place of `vw` / `dvh`) and `zoom` on #root. Zoom goes on #root, not <html>, so what
 * attaches to <body> (confetti, the Select popup) keeps its own size. Every other mode clears
 * all three, so phones and the iPad keep the CSS defaults (`100vw` / `100dvh`).
 * Returns the stage applied, or null when cleared.
 */
export function applyDesktopStage(
  html: StyleTarget | undefined = globalThis.document?.documentElement,
  root: StyleTarget | null | undefined = globalThis.document?.getElementById('root'),
  mode: LayoutMode = detectLayoutMode(),
  size: { innerWidth: number; innerHeight: number } = globalThis.window ?? { innerWidth: 0, innerHeight: 0 },
): DesktopStage | null {
  if (!html) return null;
  if (mode !== 'desktop') {
    html.style.removeProperty('--stage-w');
    html.style.removeProperty('--stage-h');
    root?.style.removeProperty('zoom');
    return null;
  }
  const stage = desktopStage(size.innerWidth, size.innerHeight);
  html.style.setProperty('--stage-w', `${stage.width}px`);
  html.style.setProperty('--stage-h', `${stage.height}px`);
  if (stage.scale < 1) root?.style.setProperty('zoom', String(stage.scale));
  else root?.style.removeProperty('zoom');
  return stage;
}
