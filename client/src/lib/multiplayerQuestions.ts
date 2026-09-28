/**
 * The race's questions, dealt by the host at each start and sent to the guest.
 *
 * Dealing them (rather than each device generating its own from a shared seed) is what keeps
 * "both players get the same questions" true when the two devices run different app builds:
 * a seed only reproduces a sequence while mathEngine's ranges and random draws match exactly.
 */
import { generateQuestion, type Question } from '@shared/mathEngine';
import type { BankQuestion, Level, MathOp } from './multiplayerProtocol';

export type QuestionGenerator = typeof generateQuestion;

export interface QuestionBank {
  raceId: number;
  level: Level;
  op: MathOp;
  questions: BankQuestion[];
}

export function mintQuestionBank(
  { raceId, level, op, circuitId, laps }: { raceId: number; level: Level; op: MathOp; circuitId: string; laps: number },
  gen: QuestionGenerator = generateQuestion,
): QuestionBank {
  const questions: BankQuestion[] = [];
  let previous: string | undefined;
  for (let lap = 0; lap < laps; lap++) {
    const question = gen(circuitId, level, false, 0, previous, op);
    questions.push(toBankQuestion(question));
    previous = question.display;
  }
  return { raceId, level, op, questions };
}

/** botTime stays behind: multiplayer colours sectors against the rival, not the bot. */
function toBankQuestion({ display, answer, num1, num2 }: Question): BankQuestion {
  return num1 === undefined || num2 === undefined ? { display, answer } : { display, answer, num1, num2 };
}
