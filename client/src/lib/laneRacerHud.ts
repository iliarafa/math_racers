// Pure, deterministic helpers for Lane Racer speed feel.
// Kept separate from the canvas engine so they are unit-testable and portable.

import type { Difficulty } from './gameLogic';

export const BASE_SPEED = 3;
export const MAX_SPEED = 7.5;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Symmetric, streak-graduated speed model, capped at the 2nd level.
// Recovery (consecutive correct) ramps per difficulty: same MAX_SPEED ceiling for
// all levels, but the climb to it is gentlest for Karting and steepest for F1.
// Penalty (consecutive wrong) is difficulty-independent: 1st -25% (x0.75), 2nd+ -50% (x0.5).
const RAMP_BY_DIFFICULTY: Record<Difficulty, { first: number; sustained: number }> = {
  beginner: { first: 1.03, sustained: 1.06 }, // Karting — gentlest (~17 correct to max)
  easy:     { first: 1.05, sustained: 1.10 }, // F3        (~11)
  medium:   { first: 1.07, sustained: 1.14 }, // F2        (~8)
  hard:     { first: 1.10, sustained: 1.20 }, // F1 — steepest (~6)
};

export function correctSpeedMultiplier(correctStreak: number, difficulty: Difficulty): number {
  const r = RAMP_BY_DIFFICULTY[difficulty];
  return correctStreak <= 1 ? r.first : r.sustained;
}

export function wrongSpeedMultiplier(wrongStreak: number): number {
  return wrongStreak <= 1 ? 0.75 : 0.5;
}

export function speedAfterCorrect(speed: number, correctStreak: number, difficulty: Difficulty): number {
  return Math.min(speed * correctSpeedMultiplier(correctStreak, difficulty), MAX_SPEED);
}

export function speedAfterWrong(speed: number, wrongStreak: number): number {
  return Math.max(speed * wrongSpeedMultiplier(wrongStreak), BASE_SPEED);
}

// Cosmetic km/h readout: maps BASE_SPEED..MAX_SPEED to 120..340.
export function speedToKmh(speed: number): number {
  const t = (clamp(speed, BASE_SPEED, MAX_SPEED) - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
  return Math.round(120 + t * (340 - 120));
}
