import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Question } from '../../../shared/mathEngine.ts';
import { mintQuestionBank, type QuestionGenerator } from './multiplayerQuestions.ts';

/** A generator that returns the scripted questions in order and records how it was called. */
function scripted(questions: Question[]) {
  const calls: Parameters<QuestionGenerator>[] = [];
  let i = 0;
  const gen: QuestionGenerator = (...args) => {
    calls.push(args);
    return questions[i++ % questions.length];
  };
  return { gen, calls };
}

const q = (display: string, answer: number, num1?: number, num2?: number): Question =>
  ({ display, answer, botTime: 1234, num1, num2, operation: 'Addition' });

test('deals one question per lap, all at the room level and operation', () => {
  const { gen, calls } = scripted([q('1 + 2', 3), q('2 + 2', 4), q('3 + 4', 7)]);
  const bank = mintQuestionBank({ raceId: 3, level: 'medium', op: 'Multiplication', circuitId: 'malaysia', laps: 3 }, gen);
  assert.equal(bank.questions.length, 3);
  assert.deepEqual(
    calls.map(([circuitId, level, wet, boost, , op]) => [circuitId, level, wet, boost, op]),
    [
      ['malaysia', 'medium', false, 0, 'Multiplication'],
      ['malaysia', 'medium', false, 0, 'Multiplication'],
      ['malaysia', 'medium', false, 0, 'Multiplication'],
    ],
  );
  assert.deepEqual([bank.raceId, bank.level, bank.op], [3, 'medium', 'Multiplication']);
});

test('hands the generator the previous question so it can avoid a back-to-back repeat', () => {
  const { gen, calls } = scripted([q('1 + 2', 3), q('2 + 2', 4), q('3 + 4', 7)]);
  mintQuestionBank({ raceId: 1, level: 'easy', op: 'Addition', circuitId: 'spa', laps: 3 }, gen);
  assert.deepEqual(calls.map((c) => c[4]), [undefined, '1 + 2', '2 + 2']);
});

test('keeps the display, the answer and the operands, and drops the bot timing', () => {
  const { gen } = scripted([q('7 + 8', 15, 7, 8), q('x + 3 = 5', 2)]);
  const bank = mintQuestionBank({ raceId: 1, level: 'easy', op: 'Addition', circuitId: 'spa', laps: 2 }, gen);
  assert.deepEqual(bank.questions, [
    { display: '7 + 8', answer: 15, num1: 7, num2: 8 },
    { display: 'x + 3 = 5', answer: 2 },
  ]);
});

test('with the real generator every question uses the room operation, not the circuit default', () => {
  // An unknown circuit id falls back to Addition, so a dropped operation would show up here.
  const bank = mintQuestionBank({ raceId: 1, level: 'easy', op: 'Multiplication', circuitId: 'malaysia', laps: 20 });
  assert.equal(bank.questions.length, 20);
  for (const question of bank.questions) {
    assert.match(question.display, /^\d+ × \d+$/);
    assert.equal(question.answer, question.num1! * question.num2!);
  }
});
