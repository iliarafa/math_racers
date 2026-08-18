import { DRIVING_SCHOOL_STAGES, loadHighestClearedStage } from '@/lib/drivingSchool';

/**
 * Driving School licence path: flashcards → reaction test → lane racer.
 * Grand Prix stays locked until all three are done (`hasSuperlicence`).
 * Race Now and Free Practice stay open.
 */

/** Best reaction time must beat this to pass the licence step. */
export const REACTION_LICENCE_MS = 330;

const REACTION_BEST_KEY = 'reactionBestMs';
const LANE_RACER_WIN_KEY = 'laneRacerP1Win';

export function loadReactionBestMs(): number | null {
  try {
    const raw = localStorage.getItem(REACTION_BEST_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Record a valid (non-jumpstart) reaction time; keeps the minimum. Returns the new best. */
export function saveReactionTimeMs(ms: number): number {
  const rounded = Math.round(ms);
  const prev = loadReactionBestMs();
  const best = prev === null ? rounded : Math.min(prev, rounded);
  try {
    localStorage.setItem(REACTION_BEST_KEY, String(best));
  } catch {
    /* ignore */
  }
  return best;
}

export function hasLaneRacerWin(): boolean {
  try {
    return localStorage.getItem(LANE_RACER_WIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveLaneRacerWin(): void {
  try {
    localStorage.setItem(LANE_RACER_WIN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export type LicenceStatus = {
  flashcards: boolean;
  reaction: boolean;
  laneRacer: boolean;
  complete: boolean;
};

export function getLicenceStatus(): LicenceStatus {
  const flashcards = loadHighestClearedStage() >= DRIVING_SCHOOL_STAGES.length;
  const best = loadReactionBestMs();
  const reaction = best !== null && best < REACTION_LICENCE_MS;
  const laneRacer = hasLaneRacerWin();
  return { flashcards, reaction, laneRacer, complete: flashcards && reaction && laneRacer };
}

export function hasSuperlicence(): boolean {
  return getLicenceStatus().complete;
}
