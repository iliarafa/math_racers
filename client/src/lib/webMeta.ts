import { Capacitor } from '@capacitor/core';

/**
 * Browser-only page chrome: the tab title, the toolbar tint (`theme-color`) and the
 * `data-web` marker that gates the mouse hover layer in `index.css`.
 *
 * None of it may reach the iPhone/iPad app, so `applyPageMeta` and `markWebDocument`
 * return early on native. WKWebView has no tab bar and ignores theme-color anyway.
 */

export const APP_NAME = 'Math Racer';

/** Toolbar tint: the white Welcome screen gets a white bar, everything else black. */
export const LIGHT_THEME_COLOR = '#ffffff';
export const DARK_THEME_COLOR = '#000000';

interface PageEntry {
  /** Page name shown before the app name in the tab. Empty for the landing page. */
  page: string;
  /** Light pages tint the browser toolbar white. */
  light?: boolean;
}

const PAGES: Record<string, PageEntry> = {
  '/': { page: '', light: true },
  '/hub': { page: 'Paddock' },
  '/game': { page: 'Free Practice' },
  '/game/quick-race': { page: 'Quick Race' },
  '/game/free-practice': { page: 'Free Practice' },
  '/game/grand-prix': { page: 'Grand Prix' },
  '/garage': { page: 'Garage' },
  '/strategy': { page: 'Strategy Guide' },
  '/grand-prix': { page: 'Weekend Briefing' },
  '/driving-school': { page: 'Flashcards' },
  '/reaction': { page: 'Reaction Test' },
  '/multiplayer': { page: 'Multiplayer' },
  '/regulations': { page: 'Regulations' },
  '/racer-log': { page: 'Racer Log' },
  '/leaderboard': { page: 'Leaderboard' },
  '/lane-racer': { page: 'Lane Racer' },
  '/dev/circuit-maps': { page: 'Circuit Maps' },
};

const RACE: PageEntry = { page: 'Race' };
const NOT_FOUND: PageEntry = { page: 'Page not found' };

export interface PageMeta {
  title: string;
  themeColor: string;
}

/** Tab title and toolbar tint for a wouter location (query string and trailing slash ignored). */
export function pageMetaFor(location: string): PageMeta {
  const path = location.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  const entry = PAGES[path] ?? (path.startsWith('/game/') ? RACE : NOT_FOUND);
  return {
    title: entry.page ? `${entry.page} · ${APP_NAME}` : APP_NAME,
    themeColor: entry.light ? LIGHT_THEME_COLOR : DARK_THEME_COLOR,
  };
}

/** Apply the page meta to the document. No-op inside the native app. */
export function applyPageMeta(location: string): void {
  if (Capacitor.isNativePlatform()) return;
  const { title, themeColor } = pageMetaFor(location);
  document.title = title;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
}

/**
 * Stamp `data-web` on <html> in browser builds. It gates the web-only mouse hover layer
 * at the end of `index.css`, so it must never be set inside the native app, where it
 * would switch hover on for an iPad with a trackpad. Returns whether it stamped.
 * `root` and `native` are injectable for tests.
 */
export function markWebDocument(
  root: Pick<Element, 'setAttribute'> | undefined = globalThis.document?.documentElement,
  native: boolean = Capacitor.isNativePlatform(),
): boolean {
  if (native || !root) return false;
  root.setAttribute('data-web', '');
  return true;
}
