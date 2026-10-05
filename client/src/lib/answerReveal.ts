/**
 * Team radio: a wrong answer that teaches. The first miss on a question is a free retry (a typo).
 * The second miss reveals the answer as ghost digits inside the answer element and holds the keys
 * for RADIO_HOLD_MS; the kid types over the ghost to go on. Bringing a missed question back later
 * is lib/questionPicker.ts's job, for every miss, radio or not. Pure; Game.tsx and DrivingSchool.tsx
 * render it.
 */

/** The miss that brings the radio on. */
export const REVEAL_AFTER_MISSES = 2;
/** How long the keypad and keyboard stay locked once the answer is on screen. */
export const RADIO_HOLD_MS = 1500;

/**
 * True only on the revealing miss; later misses leave the answer up without another hold.
 * `radioOn` is the player's Team Radio switch in the Garage (GameState.teamRadioEnabled).
 */
export function revealsOnMiss(missesOnQuestion: number, radioOn: boolean): boolean {
  return radioOn && missesOnQuestion === REVEAL_AFTER_MISSES;
}

export type GhostDigits = { typed: string; ghost: string };

/** The answer element while a revealed answer is up: typed digits replace ghost digits from the left. */
export function ghostDigits(typed: string, answer: string): GhostDigits {
  return { typed, ghost: answer.slice(typed.length) };
}
