/**
 * Team radio: a wrong answer that teaches. The first miss on a question is a free retry (a typo).
 * The second miss reveals the answer as ghost digits inside the answer element and holds the keys
 * for RADIO_HOLD_MS; the kid types over the ghost to go on. The revealed question comes back
 * REASK_AFTER questions later in the same session. Pure; Game.tsx and DrivingSchool.tsx render it.
 */

/** The miss that brings the radio on. */
export const REVEAL_AFTER_MISSES = 2;
/** How long the keypad and keyboard stay locked once the answer is on screen. */
export const RADIO_HOLD_MS = 1500;
/** A revealed question is asked again this many questions later: two fresh ones in between. */
export const REASK_AFTER = 3;

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

type QuestionLike = { display: string };

export type Reask<Q extends QuestionLike> = { question: Q; due: number };

/**
 * Queue a revealed question to come back REASK_AFTER questions after the one it was revealed on
 * (`serial`, counted from the session's first question). One entry per display, so a question
 * revealed again moves to its new slot.
 */
export function queueReask<Q extends QuestionLike>(queue: readonly Reask<Q>[], question: Q, serial: number): Reask<Q>[] {
  return [...queue.filter((r) => r.question.display !== question.display), { question, due: serial + REASK_AFTER }];
}

/**
 * The re-ask to serve as question `serial`, if one is due: the earliest due first. Nothing is
 * served while a power-up asks for a harder question (the re-ask waits for the next normal one),
 * or when it would repeat the question just asked.
 */
export function takeReask<Q extends QuestionLike>(
  queue: readonly Reask<Q>[],
  serial: number,
  opts: { harder: boolean; previousDisplay?: string },
): { question: Q | null; queue: Reask<Q>[] } {
  let pick = -1;
  if (!opts.harder) {
    queue.forEach((r, i) => {
      if (r.due > serial || r.question.display === opts.previousDisplay) return;
      if (pick === -1 || r.due < queue[pick].due) pick = i;
    });
  }
  if (pick === -1) return { question: null, queue: [...queue] };
  return { question: queue[pick].question, queue: queue.filter((_, i) => i !== pick) };
}
