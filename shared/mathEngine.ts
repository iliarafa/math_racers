// Pure, React-free math engine shared between the client (gameLogic.ts re-exports)
// and the server (multiplayer WebSocket dynamic difficulty). Do not import React
// or browser-only APIs (localStorage/sessionStorage) here.

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'pro';

/** Ordered ladder; Adaptive soft-caps at hard (F1). Pro is Locked-only. */
export const DIFFICULTY_LEVELS: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'pro'];

function difficultyIndex(d: Difficulty): number {
  return DIFFICULTY_LEVELS.indexOf(d);
}

function clampDifficulty(d: Difficulty, max: Difficulty): Difficulty {
  return difficultyIndex(d) <= difficultyIndex(max) ? d : max;
}

export interface Question {
  display: string;
  answer: number;
  botTime: number; // Bot's response time in ms for this question
  num1?: number;      // First operand (for complexity calculation)
  num2?: number;      // Second operand (for complexity calculation)
  operation?: string; // Operation type
}

// circuitId → default operation type (Addition | Subtraction | …), used only
// when generateQuestion is called without an explicit operationOverride.
export const CIRCUIT_OPERATION_TYPES: Record<string, string> = {
  spa: 'Addition',
  monaco: 'Subtraction',
  monza: 'Multiplication',
  suzuka: 'Division',
  silverstone: 'Variables',
  canada: 'Addition',
  miami: 'Multiplication',
  barcelona: 'Variables',
  austria: 'Variables',
};

// Count carries/borrows for addition or subtraction
function countCarries(num1: number, num2: number, operation: string): number {
  let carry = 0;
  let carryCount = 0;
  const str1 = Math.abs(num1).toString();
  const str2 = Math.abs(num2).toString();
  const len = Math.max(str1.length, str2.length);

  for (let i = 0; i < len; i++) {
    const d1 = parseInt(str1[str1.length - 1 - i] || '0');
    const d2 = parseInt(str2[str2.length - 1 - i] || '0');

    if (operation === 'Addition') {
      const sum = d1 + d2 + carry;
      if (sum >= 10) carryCount++;
      carry = sum >= 10 ? 1 : 0;
    } else {
      // Subtraction (borrow)
      const diff = d1 - d2 - carry;
      if (diff < 0) carryCount++;
      carry = diff < 0 ? 1 : 0;
    }
  }
  return carryCount;
}

// Calculate complexity multiplier based on the actual numbers involved
function calculateComplexity(num1: number, num2: number, operation: string): number {
  if (operation === 'Addition' || operation === 'Subtraction') {
    // Count carries/borrows
    const carries = countCarries(num1, num2, operation);
    // No carries: 1.0x, 1 carry: 1.3x, 2 carries: 1.6x, 3+ carries: 2.0x
    const carryFactor = 1.0 + Math.min(carries, 3) * 0.3 + (carries > 3 ? 0.1 : 0);

    // Add operand magnitude bonus for larger numbers (affects F2/F1)
    const maxOperand = Math.max(num1, num2);
    const sizeFactor = maxOperand >= 100 ? 1.15 : (maxOperand >= 50 ? 1.1 : 1.0);

    return carryFactor * sizeFactor;
  }

  if (operation === 'Multiplication') {
    const maxOperand = Math.max(num1, num2);
    const minOperand = Math.min(num1, num2);

    // Base complexity by max operand
    let complexity = 1.0;
    if (maxOperand >= 10) complexity = 1.4;      // 2-digit max
    if (maxOperand >= 13) complexity = 1.6;      // Harder 2-digit

    // Bonus if BOTH operands are 2-digit (e.g., 12×14 is much harder than 12×5)
    if (minOperand >= 10) complexity += 0.4;     // Both 2-digit = 2.0x

    return complexity;
  }

  if (operation === 'Division') {
    const dividendDigits = num1.toString().length;
    const divisor = num2;

    // Base: larger dividends take longer
    let complexity = 1.0 + (dividendDigits - 1) * 0.2;

    // 2-digit divisors require long division mental model
    if (divisor >= 10) complexity += 0.4;
    // Even 1-digit divisors 7-9 are harder than 2-5
    else if (divisor >= 7) complexity += 0.15;

    return complexity;
  }

  if (operation === 'Variables') {
    // Variables have num1=answer, num2=coefficient for ax=b format
    // For x+a=b format, num2 is the constant
    const coefficient = num2;

    // Larger coefficients = harder mental division
    if (coefficient >= 10) return 1.6;   // 13x = 195 → 195÷13
    if (coefficient >= 7) return 1.35;   // 8x = 64 → 64÷8
    if (coefficient >= 5) return 1.2;    // 5x = 30 → 30÷5
    return 1.0;  // Small coefficients or x+a=b format
  }

  return 1.0;
}

// Calculate bot's response time based on difficulty, operation type, complexity, and randomness
function calculateBotTime(
  difficulty: Difficulty,
  operationType: string,
  num1?: number,
  num2?: number,
  isWet: boolean = false
): number {
  // Base times in milliseconds by difficulty (exponential scaling)
  // Gap between levels increases as difficulty rises to match exponential difficulty increase
  let baseTime: number;
  if (difficulty === 'beginner') {
    baseTime = 2500; // Karting
  } else if (difficulty === 'easy') {
    baseTime = 3500; // F3
  } else if (difficulty === 'medium') {
    baseTime = 4500; // F2
  } else if (difficulty === 'hard') {
    baseTime = 6000; // F1
  } else {
    baseTime = 6500; // Pro — slightly above F1 (pace/facts, not bigger digits)
  }

  // Wet mode adds half the gap to next difficulty level (250ms)
  // This makes wet = level + 0.5 for bot timing
  if (isWet) {
    baseTime += 250;
  }

  // Operation type modifier - multiplication/division takes longer
  let operationModifier = 1.0;
  switch (operationType) {
    case "Addition":
      operationModifier = 0.85; // Fastest
      break;
    case "Subtraction":
      operationModifier = 0.95;
      break;
    case "Multiplication":
      operationModifier = 1.15;
      break;
    case "Division":
      operationModifier = 1.20;
      break;
    case "Variables":
      operationModifier = 1.25; // Slowest
      break;
  }

  // Complexity modifier based on actual numbers
  const complexityModifier = (num1 !== undefined && num2 !== undefined)
    ? calculateComplexity(num1, num2, operationType)
    : 1.0;

  // Apply modifiers and add randomness (±25%)
  const modifiedTime = baseTime * operationModifier * complexityModifier;
  const randomFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25

  return Math.round(modifiedTime * randomFactor);
}

// Operation-specific ranges by difficulty
// Karting (beginner): Ages 6-8, basic math
// F3 (easy): Ages 8-10
// F2 (medium): Ages 10-12
// F1 (hard): Ages 12+
interface OperationRanges {
  addition: { min: number; max: number };
  subtraction: { min: number; max: number };
  multiplication: { min: number; max: number };
  division: { min: number; max: number };
  variables: { min: number; max: number };
}

// Kid-facing bands: Karting→F1 stay grade-school sized. Pro reuses F1 digit budget.
const BASE_RANGES: Record<Difficulty, OperationRanges> = {
  beginner: {
    // Karting
    addition: { min: 1, max: 10 },
    subtraction: { min: 1, max: 10 },
    multiplication: { min: 1, max: 5 },
    division: { min: 1, max: 5 },
    variables: { min: 1, max: 5 },
  },
  easy: {
    // F3
    addition: { min: 1, max: 20 },
    subtraction: { min: 1, max: 20 },
    multiplication: { min: 2, max: 8 },
    division: { min: 2, max: 8 },
    variables: { min: 2, max: 10 },
  },
  medium: {
    // F2
    addition: { min: 5, max: 30 },
    subtraction: { min: 5, max: 30 },
    multiplication: { min: 2, max: 10 },
    division: { min: 2, max: 10 },
    variables: { min: 3, max: 12 },
  },
  hard: {
    // F1 — kid-reachable summit
    addition: { min: 10, max: 50 },
    subtraction: { min: 10, max: 50 },
    multiplication: { min: 3, max: 12 },
    division: { min: 3, max: 12 },
    variables: { min: 3, max: 15 },
  },
  pro: {
    // Same digit budget as F1; hardness comes from pace/facts elsewhere
    addition: { min: 10, max: 50 },
    subtraction: { min: 10, max: 50 },
    multiplication: { min: 3, max: 12 },
    division: { min: 3, max: 12 },
    variables: { min: 3, max: 15 },
  },
};

// Get the next difficulty level for wet/OVERTAKE interpolation (numbers only).
// F1→Pro and Pro→Pro keep the same ranges (no adult digit inflation).
function getNextDifficulty(difficulty: Difficulty): Difficulty {
  switch (difficulty) {
    case 'beginner': return 'easy';
    case 'easy': return 'medium';
    case 'medium': return 'hard';
    case 'hard': return 'pro';
    case 'pro': return 'pro';
  }
}

// Interpolate between two range values
function interpolateRange(
  current: { min: number; max: number },
  next: { min: number; max: number },
  factor: number
): { min: number; max: number } {
  return {
    min: Math.round(current.min + (next.min - current.min) * factor),
    max: Math.round(current.max + (next.max - current.max) * factor),
  };
}

function getOperationRanges(difficulty: Difficulty, isWet: boolean, boostFactor: number = 0): OperationRanges {
  const baseRanges = BASE_RANGES[difficulty];
  const nextRanges = BASE_RANGES[getNextDifficulty(difficulty)];

  // Calculate combined factor: wet adds 0.5, boost adds its value (e.g., 0.5 for OVERTAKE)
  const wetFactor = isWet ? 0.5 : 0;
  const totalFactor = Math.min(wetFactor + boostFactor, 1.0); // Cap at 1.0 (next difficulty level)

  // Same-range steps (F1↔Pro) are a no-op for numbers — Pro hardness is pace/facts.
  if (totalFactor === 0) {
    return baseRanges;
  }

  return {
    addition: interpolateRange(baseRanges.addition, nextRanges.addition, totalFactor),
    subtraction: interpolateRange(baseRanges.subtraction, nextRanges.subtraction, totalFactor),
    multiplication: interpolateRange(baseRanges.multiplication, nextRanges.multiplication, totalFactor),
    division: interpolateRange(baseRanges.division, nextRanges.division, totalFactor),
    variables: interpolateRange(baseRanges.variables, nextRanges.variables, totalFactor),
  };
}

// Expected solve times in milliseconds by difficulty and operation type
// Used for AERO energy harvesting calculation
const EXPECTED_TIMES: Record<Difficulty, Record<string, number>> = {
  beginner: {
    Addition: 4000,
    Subtraction: 4500,
    Multiplication: 5000,
    Division: 5500,
    Variables: 6000,
  },
  easy: {
    Addition: 5000,
    Subtraction: 5500,
    Multiplication: 6000,
    Division: 6500,
    Variables: 7000,
  },
  medium: {
    Addition: 6000,
    Subtraction: 6500,
    Multiplication: 7000,
    Division: 7500,
    Variables: 8000,
  },
  hard: {
    Addition: 7000,
    Subtraction: 7500,
    Multiplication: 8000,
    Division: 8500,
    Variables: 9000,
  },
  // Pro ≈ 77% of F1 — snappier “fast” bar, same digit size
  pro: {
    Addition: 5400,
    Subtraction: 5800,
    Multiplication: 6150,
    Division: 6550,
    Variables: 6900,
  },
};

// Get expected time for a question based on difficulty and operation type
export function getExpectedTime(difficulty: Difficulty, operationType: string): number {
  return EXPECTED_TIMES[difficulty]?.[operationType] ?? 6000;
}

// Calculate AERO energy harvested based on answer speed
// Returns energy percentage (0-30) based on how fast the answer was
export function calculateEnergyHarvest(
  responseTime: number,
  difficulty: Difficulty,
  operationType: string
): number {
  const expectedTime = getExpectedTime(difficulty, operationType);
  // harvestRate = expectedTime / actualTime, capped at 2.0
  const harvestRate = Math.min(expectedTime / responseTime, 2.0);
  // Base gain is 15% per question, multiplied by harvest rate
  const baseGain = 15;
  return Math.round(baseGain * harvestRate);
}

// Get a harder difficulty level for AERO mode questions (bumps to next level)
export function getHarderDifficulty(current: Difficulty): Difficulty {
  const idx = difficultyIndex(current);
  return DIFFICULTY_LEVELS[Math.min(idx + 1, DIFFICULTY_LEVELS.length - 1)];
}

// Get an easier difficulty level (drops to previous level)
export function getEasierDifficulty(current: Difficulty): Difficulty {
  return DIFFICULTY_LEVELS[Math.max(difficultyIndex(current) - 1, 0)];
}

// Dynamic difficulty state for Grand Prix practice
export interface DynamicDifficultyState {
  currentDifficulty: Difficulty;
  rollingScore: number; // resets on level change
  consecutiveSlowSectors: number; // tracks consecutive sectors where player was slower than bot
}

export function initDynamicDifficulty(start: Difficulty): DynamicDifficultyState {
  return { currentDifficulty: start, rollingScore: 0, consecutiveSlowSectors: 0 };
}

export function updateDynamicDifficulty(
  state: DynamicDifficultyState,
  correct: boolean,
  responseTime: number,
  operationType: string,
  slowerThanBot: boolean = false,
  /**
   * Ceiling for adaptive promotion. Required on purpose — adaptive callers pass 'hard'
   * so Pro stays reachable only by picking it explicitly. This used to default to 'pro'
   * (i.e. uncapped), which meant forgetting the argument silently let Pro leak into the
   * adaptive ladder. Keeping it required makes that a compile error instead.
   */
  maxDifficulty: Difficulty
): DynamicDifficultyState {
  const expectedTime = getExpectedTime(state.currentDifficulty, operationType);
  const fast = responseTime < expectedTime;
  const delta = correct ? (fast ? 1 : 0) : -1;
  const newScore = state.rollingScore + delta;

  // Track consecutive sectors where player was slower than bot
  let slowSectors = state.consecutiveSlowSectors;
  if (correct) {
    slowSectors = slowerThanBot ? slowSectors + 1 : 0;
  } else {
    slowSectors = 0; // wrong answers already penalize via rolling score
  }

  // Drop difficulty if player was slower than bot for 2 consecutive sectors
  if (slowSectors >= 2) {
    const easier = getEasierDifficulty(state.currentDifficulty);
    if (easier !== state.currentDifficulty) {
      return { currentDifficulty: easier, rollingScore: 0, consecutiveSlowSectors: 0 };
    }
    // Already at easiest — just cap the counter
    return { ...state, rollingScore: newScore, consecutiveSlowSectors: 2 };
  }

  if (newScore >= 3) {
    const harder = clampDifficulty(getHarderDifficulty(state.currentDifficulty), maxDifficulty);
    return harder !== state.currentDifficulty
      ? { currentDifficulty: harder, rollingScore: 0, consecutiveSlowSectors: slowSectors }
      : { ...state, rollingScore: 3, consecutiveSlowSectors: slowSectors };
  }
  if (newScore <= -3) {
    const easier = getEasierDifficulty(state.currentDifficulty);
    return easier !== state.currentDifficulty
      ? { currentDifficulty: easier, rollingScore: 0, consecutiveSlowSectors: 0 }
      : { ...state, rollingScore: -3, consecutiveSlowSectors: slowSectors };
  }
  return { ...state, rollingScore: newScore, consecutiveSlowSectors: slowSectors };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Uniform sample in [min, max], or upper-half bias when Pro. */
function sampleInRange(min: number, max: number, proBias: boolean): number {
  if (!proBias || max <= min) return randInt(min, max);
  const mid = Math.ceil((min + max) / 2);
  return randInt(Math.max(min, mid), max);
}

/** Mult/div factors: Pro prefers 6–12 within the allowed range. */
function sampleFactor(min: number, max: number, proBias: boolean): number {
  if (!proBias) return randInt(min, max);
  const hardMin = Math.max(min, 6);
  const hardMax = Math.min(max, 12);
  if (hardMin <= hardMax) return randInt(hardMin, hardMax);
  return sampleInRange(min, max, true);
}

// Generate a math question based on circuit, difficulty, and optional modifiers
// - isWet: adds 0.5 boost factor (1.5x harder)
// - boostFactor: additional difficulty boost (0-1), e.g., 0.5 for OVERTAKE (1.5x harder)
// - Factors stack: wet (0.5) + OVERTAKE (0.5) = 1.0 (next difficulty level), capped at 1.0
// - previousDisplay: if provided, ensures the new question is different (avoids back-to-back duplicates)
// - Pro: same digit ranges as F1, with upper-half / harder-fact bias
export function generateQuestion(circuitId: string, difficulty: Difficulty = 'easy', isWet: boolean = false, boostFactor: number = 0, previousDisplay?: string, operationOverride?: string): Question {
  const effectiveType =
    operationOverride ||
    CIRCUIT_OPERATION_TYPES[circuitId] ||
    CIRCUIT_OPERATION_TYPES.spa;
  const ranges = getOperationRanges(difficulty, isWet, boostFactor);
  const proBias = difficulty === 'pro';

  let num1: number = 0, num2: number = 0, display: string, answer: number;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    attempts++;

  switch (effectiveType) {
    case "Multiplication": {
      const range = ranges.multiplication;
      num1 = sampleFactor(range.min, range.max, proBias);
      num2 = sampleFactor(range.min, range.max, proBias);
      display = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
    }

    case "Addition": {
      const range = ranges.addition;
      num1 = sampleInRange(range.min, range.max, proBias);
      num2 = sampleInRange(range.min, range.max, proBias);
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
    }

    case "Subtraction": {
      const range = ranges.subtraction;
      // Ensure num1 > num2 for positive results
      num1 = sampleInRange(range.min, range.max, proBias);
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      display = `${num1} − ${num2}`;
      answer = num1 - num2;
      break;
    }

    case "Division": {
      const range = ranges.division;
      // Generate clean division (no remainders)
      answer = sampleFactor(2, range.max, proBias);
      num2 = sampleFactor(2, range.max, proBias);
      num1 = answer * num2;
      display = `${num1} ÷ ${num2}`;
      break;
    }

    case "Variables": {
      const range = ranges.variables;
      // For Karting, only use simple x + a = b format
      const varType = difficulty === 'beginner' ? 0 : Math.floor(Math.random() * 3);

      if (varType === 0) {
        // x + a = b
        answer = sampleInRange(1, range.max, proBias);
        num2 = sampleInRange(1, range.max, proBias);
        num1 = answer + num2;
        display = `x + ${num2} = ${num1}`;
      } else if (varType === 1) {
        // a − x = b
        answer = sampleInRange(1, range.max, proBias);
        num2 = sampleInRange(1, range.max, proBias);
        num1 = num2 + answer;
        display = `${num1} − x = ${num2}`;
      } else {
        // ax = b
        answer = sampleInRange(2, range.max, proBias);
        num2 = proBias ? sampleFactor(2, Math.min(12, range.max), true) : randInt(2, 6);
        num1 = num2 * answer;
        display = `${num2}x = ${num1}`;
      }
      break;
    }

    default: {
      const range = ranges.addition;
      num1 = sampleInRange(range.min, range.max, proBias);
      num2 = sampleInRange(range.min, range.max, proBias);
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
    }
  }

  // Retry if we got the same question as before (avoid back-to-back duplicates)
  } while (previousDisplay && display === previousDisplay && attempts < maxAttempts);

  // Calculate bot's time for this question with complexity consideration
  const botTime = calculateBotTime(difficulty, effectiveType, num1, num2, isWet);

  return { display, answer, botTime, num1, num2, operation: effectiveType };
}
