/**
 * Pure key mapping for the desktop key strip and its key echo.
 *
 * The desktop race screens are keyboard-first. The strip under the answer is a compact,
 * clickable legend of the keys that matter, and each key lights briefly when its physical
 * key is pressed. These helpers turn `KeyboardEvent.key` into the strip's own key ids and
 * mirror the shortcuts the pages already handle (`Game.tsx` keydown effect, `LaneRacer.tsx`).
 */

export const KEY_STRIP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Backspace', 'Enter'] as const;
export type KeyStripKey = (typeof KEY_STRIP_KEYS)[number];

export type PowerKey = 'aero' | 'overtake';
export type LaneKey = 'left' | 'right';
export type EchoKey = KeyStripKey | PowerKey | LaneKey;

/** How long a strip key stays lit after its physical key is pressed (matches the `key-flash` animation in index.css). */
export const KEY_ECHO_MS = 260;

/** What `useKeyEcho` reports: the lit key and a counter that bumps on every press so repeats re-flash. */
export interface KeyEcho {
  key: EchoKey | null;
  seq: number;
}

export function keyForEvent(key: string): KeyStripKey | null {
  if (key.length === 1 && key >= '0' && key <= '9') return key as KeyStripKey;
  if (key === 'Backspace') return 'Backspace';
  if (key === 'Enter' || key === 'NumpadEnter') return 'Enter';
  return null;
}

/** `-` / Clear fires ACTIVE AERO, `+` / `=` / `\` fires OVERTAKE (same as the race keydown handler). */
export function powerKeyForEvent(key: string): PowerKey | null {
  if (key === '-' || key === 'Clear') return 'aero';
  if (key === '+' || key === '=' || key === '\\') return 'overtake';
  return null;
}

/** Lane Racer steering: arrows or A / D. */
export function laneKeyForEvent(key: string): LaneKey | null {
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
  return null;
}

export function keyLabel(key: KeyStripKey): string {
  if (key === 'Backspace') return '⌫';
  if (key === 'Enter') return '↵';
  return key;
}
