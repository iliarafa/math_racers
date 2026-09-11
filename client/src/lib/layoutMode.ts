import { Capacitor } from '@capacitor/core';

/**
 * Which racing layout a device gets.
 *
 * - `phone`: the stacked HUD with the on-screen keypad. iPhone app, phone browsers, small
 *   or touch-only browser windows.
 * - `ipad`: the phone stack scaled by `client/index.html` (`data-ipad-scale`), split into two
 *   panes in landscape by `index.css`. Set both inside the iPad app and in iPad Safari, and it
 *   always wins here so an iPad with a keyboard and trackpad never turns into a desktop.
 * - `desktop`: laptop and desktop browsers. Wide window, fine pointer with hover, physical
 *   keyboard. Renders the desktop race components instead of the phone JSX.
 *
 * Never `desktop` inside the native app, so the iOS build is untouched by anything gated here.
 */
export type LayoutMode = 'phone' | 'ipad' | 'desktop';

export const DESKTOP_MIN_WIDTH = 900;

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
  if (input.finePointer && input.innerWidth >= DESKTOP_MIN_WIDTH) return 'desktop';
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
