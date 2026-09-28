import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { QuestionBank } from './multiplayerQuestions.ts';
import {
  currentQuestion,
  retireRacer,
  sectorColors,
  startRacer,
  submitAnswer,
  toWire,
  type RacerState,
} from './multiplayerRaceState.ts';

const bank: QuestionBank = {
  raceId: 2,
  level: 'easy',
  op: 'Multiplication',
  questions: [
    { display: '7 × 8', answer: 56, num1: 7, num2: 8 },
    { display: '3 × 4', answer: 12, num1: 3, num2: 4 },
    { display: '9 × 2', answer: 18, num1: 9, num2: 2 },
  ],
};

/** Answer in order; each entry is [value, responseMs, raceMsNow]. */
function play(s: RacerState, answers: Array<[number, number, number]>) {
  const outcomes: string[] = [];
  for (const [value, rt, now] of answers) {
    const r = submitAnswer(s, bank, value, rt, now);
    s = r.state;
    outcomes.push(r.outcome);
  }
  return { s, outcomes };
}

test('a racer starts on the first question of its race', () => {
  const s = startRacer(2, 3);
  assert.equal(currentQuestion(s, bank)?.display, '7 × 8');
  assert.equal(s.status, 'racing');
});

test('there is no question until the bank for this race has arrived', () => {
  assert.equal(currentQuestion(startRacer(3, 3), bank), null);
  const { state, outcome } = submitAnswer(startRacer(3, 3), bank, 56, 1000, 1000);
  assert.equal(outcome, 'ignored');
  assert.deepEqual(state, startRacer(3, 3));
});

test('a correct answer completes the lap and moves on to the next question', () => {
  const { s, outcomes } = play(startRacer(2, 3), [[56, 2100, 2100]]);
  assert.deepEqual(outcomes, ['correct']);
  assert.equal(currentQuestion(s, bank)?.display, '3 × 4');
  assert.deepEqual(s.done, [{ display: '7 × 8', answer: 56, responseTime: 2100, wrongAttempts: [], fact: '7x8' }]);
});

test('a wrong answer keeps the question, counts a warning, and the retried lap records the wrong tries', () => {
  const { s, outcomes } = play(startRacer(2, 3), [[54, 1500, 1500], [55, 2500, 2500], [56, 3600, 3600]]);
  assert.deepEqual(outcomes, ['wrong', 'wrong', 'correct']);
  assert.equal(s.warnings, 2);
  assert.equal(s.attempts, 0);
  assert.deepEqual(s.done[0].wrongAttempts, [54, 55]);
  assert.equal(s.done[0].responseTime, 3600);
});

test('the fourth wrong try on one question is a crash, and a crashed racer takes no more answers', () => {
  const { s, outcomes } = play(startRacer(2, 3), [[1, 900, 900], [2, 1800, 1800], [3, 2700, 2700], [4, 3600, 3600]]);
  assert.deepEqual(outcomes, ['wrong', 'wrong', 'wrong', 'crash']);
  assert.equal(s.status, 'crashed');
  assert.equal(s.raceMs, 3600);
  assert.equal(submitAnswer(s, bank, 56, 100, 3700).outcome, 'ignored');
});

test('three wrong tries on one question and three on the next are not a crash', () => {
  const { s, outcomes } = play(startRacer(2, 3), [[1, 1, 1], [2, 2, 2], [3, 3, 3], [56, 4, 4], [1, 5, 5], [2, 6, 6], [3, 7, 7]]);
  assert.deepEqual(outcomes, ['wrong', 'wrong', 'wrong', 'correct', 'wrong', 'wrong', 'wrong']);
  assert.equal(s.status, 'racing');
  assert.equal(s.warnings, 6);
});

test('answering the last question finishes the race at the given race time', () => {
  const { s, outcomes } = play(startRacer(2, 3), [[56, 2000, 2000], [12, 1500, 4100], [18, 1800, 6500]]);
  assert.deepEqual(outcomes, ['correct', 'correct', 'finish']);
  assert.equal(s.status, 'finished');
  assert.equal(s.raceMs, 6500);
  assert.equal(currentQuestion(s, bank), null);
});

test('retiring stops the racer at the given race time; a finished racer cannot retire', () => {
  const retired = retireRacer(startRacer(2, 3), 4200);
  assert.deepEqual([retired.status, retired.raceMs], ['retired', 4200]);
  const finished = play(startRacer(2, 3), [[56, 1, 1], [12, 1, 2], [18, 1, 3]]).s;
  assert.deepEqual(retireRacer(finished, 9000), finished);
});

test('the wire form carries lap times, red laps, the current attempt and the status', () => {
  const { s } = play(startRacer(2, 3), [[56, 2000, 2000], [11, 900, 2900], [12, 1500, 3500], [17, 700, 4200]]);
  assert.deepEqual(toWire(s), {
    raceId: 2,
    laps: [{ t: 2000, r: false }, { t: 1500, r: true }],
    att: 1,
    warn: 2,
    st: 'racing',
    ms: null,
  });
});

test('sector colours: the faster clean time is purple, within 1.5x is green, slower is yellow', () => {
  assert.deepEqual(
    sectorColors(
      [{ t: 2000, r: false }, { t: 4000, r: false }, { t: 3000, r: false }],
      [{ t: 1500, r: false }, { t: 2000, r: false }, { t: 2000, r: false }],
    ),
    { mine: ['green', 'yellow', 'green'], rival: ['purple', 'purple', 'purple'] },
  );
});

test('sector colours: a lap that needed a retry is red and does not hold the fastest time', () => {
  assert.deepEqual(
    sectorColors([{ t: 1000, r: true }], [{ t: 3000, r: false }]),
    { mine: ['red'], rival: ['purple'] },
  );
});

test('sector colours: the first car through a sector is purple until the other beats it; a tie is purple for both', () => {
  assert.deepEqual(sectorColors([{ t: 2000, r: false }, { t: 2500, r: false }], [{ t: 2500, r: false }]), {
    mine: ['purple', 'purple'],
    rival: ['green'],
  });
  assert.deepEqual(sectorColors([{ t: 2000, r: false }], [{ t: 2000, r: false }]), { mine: ['purple'], rival: ['purple'] });
});
