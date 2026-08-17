import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateGPScore, calculateLaneRacerScore, calculatePSTScore } from './gameLogic.ts';

const TIME_MS = 100_000;
const LAPS = 100;
const MISTAKES = 0;

test('F1 and Pro produce the same PST score', () => {
  const f1 = calculatePSTScore(TIME_MS, MISTAKES, 'hard', LAPS);
  const pro = calculatePSTScore(TIME_MS, MISTAKES, 'pro', LAPS);
  assert.equal(f1, pro);
  assert.equal(f1, 3000);
});

test('F1 and Pro produce the same GP score without pole', () => {
  const f1 = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, false);
  const pro = calculateGPScore(TIME_MS, MISTAKES, 'pro', 72, false);
  assert.equal(f1, pro);
});

test('pole still multiplies GP score by 1.25', () => {
  const base = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, false);
  const pole = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, true);
  assert.equal(pole, Math.min(Math.round(base * 1.25), 100000));
});

test('Lane Racer Pro matches F1', () => {
  assert.equal(
    calculateLaneRacerScore(TIME_MS, LAPS, LAPS, 'hard'),
    calculateLaneRacerScore(TIME_MS, LAPS, LAPS, 'pro'),
  );
});
