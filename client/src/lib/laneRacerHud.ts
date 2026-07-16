// Pure, deterministic helpers for Lane Racer speed feel.
// Kept separate from the canvas engine so they are unit-testable and portable.

import type { Difficulty } from './gameLogic';

/**
 * Series start/max speeds — ordered Karting < F3 < F2 < F1, Pro = F1.
 *
 * Keep steps small: harder math already raises load, so big speed jumps feel
 * exponential for kids. Karting stays ~3.5s; F1 start ~2.8s (gentle climb).
 */
const SERIES_SPEED_BANDS: Record<'beginner' | 'easy' | 'medium' | 'hard', { base: number; max: number }> = {
  beginner: { base: 3.0, max: 5.4 },  // Karting — classic entry feel
  easy:     { base: 3.25, max: 5.9 }, // F3
  medium:   { base: 3.5, max: 6.4 },  // F2
  hard:     { base: 3.8, max: 7.0 },  // F1 / Pro
};

/** Map Pro → F1 for scroll speed only. */
export function paceDifficultyForSpeed(difficulty: Difficulty): Exclude<Difficulty, 'pro'> {
  return difficulty === 'pro' ? 'hard' : difficulty;
}

export function seriesBaseSpeed(difficulty: Difficulty): number {
  return SERIES_SPEED_BANDS[paceDifficultyForSpeed(difficulty)].base;
}

export function seriesMaxSpeed(difficulty: Difficulty): number {
  return SERIES_SPEED_BANDS[paceDifficultyForSpeed(difficulty)].max;
}

/** Karting base — reference for 3D SCROLL_STEP calibration (~3.5s cross). */
export const BASE_SPEED = SERIES_SPEED_BANDS.beginner.base;
/** Karting max — legacy export; prefer seriesMaxSpeed(difficulty). */
export const MAX_SPEED = SERIES_SPEED_BANDS.beginner.max;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Streak ramp within a series band — nearly flat across series so combo
// doesn't stack another exponential on top of harder questions.
const RAMP_BY_DIFFICULTY: Record<Exclude<Difficulty, 'pro'>, { first: number; sustained: number }> = {
  beginner: { first: 1.015, sustained: 1.03 },
  easy:     { first: 1.02, sustained: 1.035 },
  medium:   { first: 1.025, sustained: 1.04 },
  hard:     { first: 1.03, sustained: 1.045 },
};

export function correctSpeedMultiplier(correctStreak: number, difficulty: Difficulty): number {
  const r = RAMP_BY_DIFFICULTY[paceDifficultyForSpeed(difficulty)];
  return correctStreak <= 1 ? r.first : r.sustained;
}

export function wrongSpeedMultiplier(wrongStreak: number): number {
  return wrongStreak <= 1 ? 0.75 : 0.5;
}

export function speedAfterCorrect(speed: number, correctStreak: number, difficulty: Difficulty): number {
  const max = seriesMaxSpeed(difficulty);
  return Math.min(speed * correctSpeedMultiplier(correctStreak, difficulty), max);
}

export function speedAfterWrong(speed: number, wrongStreak: number, difficulty: Difficulty): number {
  const base = seriesBaseSpeed(difficulty);
  return Math.max(speed * wrongSpeedMultiplier(wrongStreak), base);
}

/** Cosmetic km/h: maps the active series band onto 120..340. */
export function speedToKmh(speed: number, difficulty: Difficulty = 'beginner'): number {
  const base = seriesBaseSpeed(difficulty);
  const max = seriesMaxSpeed(difficulty);
  const span = Math.max(max - base, 0.001);
  const t = (clamp(speed, base, max) - base) / span;
  return Math.round(120 + t * (340 - 120));
}
