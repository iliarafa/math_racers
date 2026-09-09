import { Capacitor } from '@capacitor/core';
import { DRIVING_SCHOOL_STAGES, loadHighestClearedStage } from '@/lib/drivingSchool';

/**
 * Driving School licence path: flashcards → reaction test → lane racer.
 * Grand Prix stays locked until all three are done (`hasSuperlicence`).
 * Race Now and Free Practice stay open.
 */

/** Best reaction time must beat this to pass the licence step. */
export const REACTION_LICENCE_MS = 400;

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

/**
 * One-time "Superlicence granted" celebration (SuperlicenceSplash).
 * Values: unset = never initialised, '0' = armed (not yet shown), '1' = shown.
 */
const CELEBRATED_KEY = 'superlicenceCelebrated';

/**
 * Run once at app boot, before any page renders. On the first launch with this feature a
 * player who already holds the licence is marked as shown, so nobody gets a retroactive
 * splash; everyone else is armed. Later launches leave the value alone, so a licence
 * completed in a previous session still celebrates on the next Hub visit.
 */
export function initSuperlicenceCelebration(): void {
  try {
    if (localStorage.getItem(CELEBRATED_KEY) !== null) return;
    localStorage.setItem(CELEBRATED_KEY, hasSuperlicence() ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function shouldCelebrateSuperlicence(): boolean {
  try {
    return hasSuperlicence() && localStorage.getItem(CELEBRATED_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markSuperlicenceCelebrated(): void {
  try {
    localStorage.setItem(CELEBRATED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Dev-only bypass so the Grand Prix screens can be reviewed on the Vite dev server without
 * grinding Driving School. Never true in a built bundle, so the shipped app (native or web)
 * keeps the Superlicence lock. Note the Capacitor app also serves from a `localhost` origin,
 * which is why a hostname check is not used here.
 */
export function grandPrixDevBypass(): boolean {
  return Boolean(import.meta.env.DEV) && !Capacitor.isNativePlatform();
}
