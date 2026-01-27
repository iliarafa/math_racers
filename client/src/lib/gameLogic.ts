import { useState, useEffect } from 'react';

export type Operation = '+' | '-' | 'x' | '÷' | 'var';
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard';

export interface Question {
  display: string;
  answer: number;
  botTime: number; // Bot's response time in ms for this question
  num1?: number;      // First operand (for complexity calculation)
  num2?: number;      // Second operand (for complexity calculation)
  operation?: string; // Operation type
}

export interface Driver {
  id: string;
  name: string;
  difficulty: Difficulty;
  label: string;
}

export interface CircuitPaths {
  s1: string;
  s2: string;
  s3: string;
}

export interface Circuit {
  id: string;
  name: string;
  type: string;
  description: string;
  mapUrl: string;
  paths: CircuitPaths;
}

export interface LapEntry {
  time: number;
  trackName: string;
  timestamp: number;
  series?: string;  // 'karting' | 'f3' | 'f2' | 'f1' - optional for backwards compatibility
}

export interface GameState {
  coins: number;
  unlockedItems: string[];
  equippedLivery: string;
  equippedTires: string;
  streak: number;
  totalLaps: number;
  careerPoints: number;
  racesWon: number;
  teamColor: string;
  soundEnabled: boolean;
  simMode: boolean;
  personalBests: { [circuitId: string]: number };
  lapHistory: LapEntry[];
}

export const TEAM_COLORS = [
  { id: 'ferrari', name: 'Ferrari', hex: '#ff2800' },
  { id: 'mclaren', name: 'McLaren', hex: '#ff8000' },
  { id: 'redbull', name: 'Red Bull', hex: '#0600ef' },
  { id: 'mercedes', name: 'Mercedes', hex: '#00d2be' },
];

export const RACE_LENGTH = 20;

export const SIM_LAP_COUNTS: { [circuitId: string]: number } = {
  suzuka: 53,
  monaco: 78,
  spa: 44,
  silverstone: 52,
  monza: 53
};

export const getRaceLength = (circuitId: string, simMode: boolean): number => {
  if (simMode && SIM_LAP_COUNTS[circuitId]) {
    return SIM_LAP_COUNTS[circuitId];
  }
  return RACE_LENGTH;
};

export const DRIVERS: Driver[] = [
  { id: "karting", name: "Karting", difficulty: "beginner", label: "Karting" },
  { id: "f3", name: "F3", difficulty: "easy", label: "Formula 3" },
  { id: "f2", name: "F2", difficulty: "medium", label: "Formula 2" },
  { id: "f1", name: "F1", difficulty: "hard", label: "Formula 1" }
];

export const DRIVERS_2025 = [
  "Lando Norris",        // 1st - World Champion (0-1 mistakes)
  "Max Verstappen",      // 2nd
  "Oscar Piastri",       // 3rd
  "George Russell",      // 4th
  "Charles Leclerc",     // 5th
  "Lewis Hamilton",      // 6th
  "Kimi Antonelli",      // 7th
  "Alexander Albon",     // 8th
  "Carlos Sainz",        // 9th
  "Fernando Alonso",     // 10th
  "Yuki Tsunoda",        // 11th
  "Pierre Gasly",        // 12th
  "Nico Hulkenberg",     // 13th
  "Esteban Ocon",        // 14th
  "Lance Stroll",        // 15th
  "Liam Lawson",         // 16th
  "Franco Colapinto",    // 17th
  "Oliver Bearman",      // 18th
  "Gabriel Bortoleto",   // 19th
  "Isack Hadjar"         // 20th
];

export const CIRCUITS: Circuit[] = [
  {
    id: "spa",
    name: "SPA",
    type: "Addition",
    description: "The Longest Lap",
    mapUrl: "",
    paths: {
      s1: "M 90 120 L 50 135 L 40 125 Q 60 110 80 100 L 200 30 L 220 30",
      s2: "M 220 30 L 230 40 Q 260 50 260 80 L 230 100 L 270 120",
      s3: "M 270 120 Q 180 150 110 130 L 100 125 L 90 120"
    }
  },
  {
    id: "monaco",
    name: "MONACO",
    type: "Subtraction",
    description: "Street Circuit",
    mapUrl: "",
    paths: {
      s1: "M 40 125 L 80 120 L 90 105 Q 120 70 160 50 L 200 40",
      s2: "M 200 40 L 220 55 L 240 55 L 235 65 L 240 80 Q 200 100 150 100 L 140 105",
      s3: "M 140 105 L 110 100 L 90 105 L 70 105 Q 40 105 40 120 L 40 125"
    }
  },
  {
    id: "monza",
    name: "MONZA",
    type: "Multiplication",
    description: "The Temple of Speed",
    mapUrl: "",
    paths: {
      s1: "M 200 130 L 70 130 L 60 120 L 50 130 Q 30 130 30 90 Q 30 60 80 50 L 90 45",
      s2: "M 90 45 L 100 50 L 120 45 Q 140 20 150 45 L 160 85 L 170 95 L 180 85",
      s3: "M 180 85 L 250 85 Q 290 85 290 110 Q 290 130 250 130 L 200 130"
    }
  },
  {
    id: "suzuka",
    name: "SUZUKA",
    type: "Division",
    description: "Figure-8 Track",
    mapUrl: "",
    paths: {
      s1: "M 250 125 L 180 125 Q 160 125 155 105 Q 150 85 180 75 Q 210 65 210 45 Q 210 25 180 25 L 140 25 L 120 35",
      s2: "M 120 35 L 110 55 Q 100 85 70 85 L 50 85 Q 20 85 20 60 L 20 50 Q 20 20 50 20 L 100 20 L 130 30 L 160 35",
      s3: "M 160 35 L 190 35 L 250 35 Q 280 35 280 80 Q 280 125 250 125"
    }
  },
  {
    id: "silverstone",
    name: "SILVERSTONE",
    type: "Variables",
    description: "Home of F1",
    mapUrl: "",
    paths: {
      s1: "M 145 25 L 190 15 Q 210 15 215 35 L 200 70 L 180 100 Q 170 120 145 125 L 135 120 L 125 130 Q 110 145 90 145 L 70 145 Q 50 145 50 125 L 55 115 L 80 60 L 85 50 Q 95 35 75 35",
      s2: "M 75 35 Q 55 35 55 65 Q 55 95 80 95 L 100 95 L 120 70 L 140 25 Q 150 5 170 5 L 200 5 Q 225 5 230 25 L 230 40 Q 230 60 250 65 L 265 60 Q 285 55 285 85 L 285 115",
      s3: "M 285 115 Q 285 140 255 140 L 220 140 L 200 115 L 190 125 L 175 125 Q 155 125 150 105 L 145 25"
    }
  }
];

const INITIAL_STATE: GameState = {
  coins: 0,
  unlockedItems: ['red-livery', 'hard-tires'],
  equippedLivery: 'red-livery',
  equippedTires: 'hard-tires',
  streak: 0,
  totalLaps: 0,
  careerPoints: 0,
  racesWon: 0,
  teamColor: '#ff2800',
  soundEnabled: true,
  simMode: false,
  personalBests: {},
  lapHistory: [],
};

export const SHOP_ITEMS = [
  { id: 'red-livery', name: 'Ferrari Red', type: 'livery', cost: 0, color: 'bg-red-600' },
  { id: 'blue-livery', name: 'Alpine Blue', type: 'livery', cost: 100, color: 'bg-blue-600' },
  { id: 'orange-livery', name: 'Papaya Orange', type: 'livery', cost: 200, color: 'bg-orange-500' },
  { id: 'silver-livery', name: 'Silver Arrow', type: 'livery', cost: 300, color: 'bg-slate-400' },
  { id: 'hard-tires', name: 'Hard Tires (White)', type: 'tires', cost: 0, color: 'border-white' },
  { id: 'medium-tires', name: 'Medium Tires (Yellow)', type: 'tires', cost: 150, color: 'border-yellow-400' },
  { id: 'soft-tires', name: 'Soft Tires (Red)', type: 'tires', cost: 250, color: 'border-red-600' },
];

const getSessionLapTimes = (): number[] => {
  try {
    const saved = sessionStorage.getItem('f1-session-lap-times');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveSessionLapTimes = (times: number[]) => {
  try {
    sessionStorage.setItem('f1-session-lap-times', JSON.stringify(times));
  } catch {
    // Silent fail
  }
};

export function useGameState() {
  const [sessionLapTimes, setSessionLapTimes] = useState<number[]>(getSessionLapTimes);
  
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem('f1-math-racer-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: parsed.coins ?? 0,
          unlockedItems: parsed.unlockedItems ?? ['red-livery', 'hard-tires'],
          equippedLivery: parsed.equippedLivery ?? 'red-livery',
          equippedTires: parsed.equippedTires ?? 'hard-tires',
          streak: parsed.streak ?? 0,
          totalLaps: parsed.totalLaps ?? 0,
          careerPoints: parsed.careerPoints ?? 0,
          racesWon: parsed.racesWon ?? 0,
          teamColor: parsed.teamColor ?? '#ff2800',
          soundEnabled: parsed.soundEnabled ?? true,
          simMode: parsed.simMode ?? false,
          personalBests: parsed.personalBests ?? {},
          lapHistory: parsed.lapHistory ?? [],
        };
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem('f1-math-racer-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
      // Could show a toast notification here if needed
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.style.setProperty('--team-color', state.teamColor);
  }, [state.teamColor]);

  // Sync session lap times from sessionStorage on mount (for cross-component sharing)
  useEffect(() => {
    setSessionLapTimes(getSessionLapTimes());
  }, []);

  const addCoins = (amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }));
  };

  const incrementStreak = () => {
    setState(prev => ({ ...prev, streak: prev.streak + 1 }));
  };

  const resetStreak = () => {
    setState(prev => ({ ...prev, streak: 0 }));
  };

  const buyItem = (itemId: string, cost: number) => {
    if (state.coins >= cost && !state.unlockedItems.includes(itemId)) {
      setState(prev => ({
        ...prev,
        coins: prev.coins - cost,
        unlockedItems: [...prev.unlockedItems, itemId]
      }));
      return true;
    }
    return false;
  };

  const equipItem = (itemId: string, type: 'livery' | 'tires') => {
    if (state.unlockedItems.includes(itemId)) {
      setState(prev => ({
        ...prev,
        [type === 'livery' ? 'equippedLivery' : 'equippedTires']: itemId
      }));
    }
  };

  const setTeamColor = (color: string) => {
    setState(prev => ({ ...prev, teamColor: color }));
  };

  const toggleSound = () => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleSimMode = () => {
    setState(prev => ({ ...prev, simMode: !prev.simMode }));
  };

  const incrementLaps = () => {
    setState(prev => ({ ...prev, totalLaps: prev.totalLaps + 1 }));
  };

  const addCareerPoints = (points: number) => {
    setState(prev => ({ ...prev, careerPoints: prev.careerPoints + points }));
  };

  const incrementRacesWon = () => {
    setState(prev => ({ ...prev, racesWon: prev.racesWon + 1 }));
  };

  const updatePersonalBest = (circuitId: string, time: number) => {
    setState(prev => {
      const currentBest = prev.personalBests[circuitId];
      if (!currentBest || time < currentBest) {
        return {
          ...prev,
          personalBests: { ...prev.personalBests, [circuitId]: time }
        };
      }
      return prev;
    });
  };

  const resetAllData = () => {
    try {
      localStorage.removeItem('f1-math-racer-state');
      sessionStorage.removeItem('f1-session-lap-times');
      setState(INITIAL_STATE);
      setSessionLapTimes([]);
    } catch (error) {
      console.error('Failed to reset data:', error);
      setState(INITIAL_STATE);
      setSessionLapTimes([]);
    }
  };

  const recordLapTime = (time: number, trackName?: string, series?: string) => {
    const newTimes = [...sessionLapTimes, time].sort((a, b) => a - b).slice(0, 10);
    setSessionLapTimes(newTimes);
    saveSessionLapTimes(newTimes);

    if (trackName) {
      const newLapEntry: LapEntry = {
        time,
        trackName,
        timestamp: Date.now(),
        series
      };
      setState(prev => ({
        ...prev,
        lapHistory: [newLapEntry, ...prev.lapHistory].slice(0, 100)
      }));
    }
  };

  const getTopLapTimes = (count: number = 3) => {
    return getSessionLapTimes().slice(0, count);
  };

  const getLapHistory = (count: number = 20): LapEntry[] => {
    return state.lapHistory.slice(0, count);
  };

  return {
    state,
    sessionLapTimes,
    addCoins,
    incrementStreak,
    resetStreak,
    buyItem,
    equipItem,
    setTeamColor,
    toggleSound,
    toggleSimMode,
    incrementLaps,
    addCareerPoints,
    incrementRacesWon,
    updatePersonalBest,
    resetAllData,
    recordLapTime,
    getTopLapTimes,
    getLapHistory
  };
}

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
    return 1.0 + Math.min(carries, 3) * 0.3 + (carries > 3 ? 0.1 : 0);
  }

  if (operation === 'Multiplication') {
    // Based on digit count of the larger operand
    const digits = Math.max(num1.toString().length, num2.toString().length);
    // 1 digit: 1.0x, 2 digits: 1.5x
    return digits === 1 ? 1.0 : 1.5;
  }

  if (operation === 'Division') {
    // Based on dividend size
    const digits = num1.toString().length;
    // 1 digit: 1.0x, 2 digits: 1.25x, 3 digits: 1.5x
    return 1.0 + (digits - 1) * 0.25;
  }

  // Variables - use base time (complexity handled by operation modifier)
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
  // Base times in milliseconds by difficulty (slightly increased)
  let baseTime: number;
  if (difficulty === 'beginner') {
    baseTime = 2500; // 2.5 seconds base for beginner (Karting)
  } else if (difficulty === 'easy') {
    baseTime = 3000; // 3 seconds base for easy (F3)
  } else if (difficulty === 'medium') {
    baseTime = 3500; // 3.5 seconds base for medium (F2)
  } else {
    baseTime = 4000; // 4 seconds base for hard (F1)
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

// Base operation ranges for each difficulty level
const BASE_RANGES: Record<Difficulty, OperationRanges> = {
  beginner: {
    // Karting: Ages 6-8
    addition: { min: 1, max: 10 },
    subtraction: { min: 1, max: 10 },
    multiplication: { min: 1, max: 5 },
    division: { min: 1, max: 5 },
    variables: { min: 1, max: 5 },
  },
  easy: {
    // F3: Ages 8-10
    addition: { min: 10, max: 50 },
    subtraction: { min: 10, max: 50 },
    multiplication: { min: 2, max: 10 },
    division: { min: 2, max: 10 },
    variables: { min: 2, max: 12 },
  },
  medium: {
    // F2: Ages 10-12
    addition: { min: 20, max: 100 },
    subtraction: { min: 20, max: 100 },
    multiplication: { min: 3, max: 12 },
    division: { min: 3, max: 12 },
    variables: { min: 3, max: 15 },
  },
  hard: {
    // F1: Ages 12+
    addition: { min: 50, max: 200 },
    subtraction: { min: 50, max: 200 },
    multiplication: { min: 5, max: 15 },
    division: { min: 5, max: 15 },
    variables: { min: 5, max: 20 },
  },
};

// Get the next difficulty level for wet interpolation
function getNextDifficulty(difficulty: Difficulty): Difficulty {
  switch (difficulty) {
    case 'beginner': return 'easy';
    case 'easy': return 'medium';
    case 'medium': return 'hard';
    case 'hard': return 'hard'; // Cap at hard
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
  const nextDifficulty = getNextDifficulty(difficulty);
  const nextRanges = BASE_RANGES[nextDifficulty];

  // Calculate combined factor: wet adds 0.5, boost adds its value (e.g., 0.5 for OVERTAKE)
  const wetFactor = isWet ? 0.5 : 0;
  const totalFactor = Math.min(wetFactor + boostFactor, 1.0); // Cap at 1.0 (next difficulty level)

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

// Get AERO zones based on race length and sim mode
// Normal mode: 2 zones (at 25% and 65%)
// Realism mode: 5 zones evenly distributed (at 15%, 30%, 50%, 70%, 85%)
export function getAeroZones(raceLength: number, simMode: boolean): number[] {
  if (simMode) {
    // 5 zones evenly distributed
    return [0.15, 0.30, 0.50, 0.70, 0.85].map(p => Math.floor(raceLength * p));
  }
  // Normal: 2 zones
  return [0.25, 0.65].map(p => Math.floor(raceLength * p));
}

// Check if current progress is within an AERO zone
// Each zone lasts for 3 questions
export function isInAeroZone(progress: number, zones: number[], zoneWindow: number = 3): boolean {
  return zones.some(zone => progress >= zone && progress < zone + zoneWindow);
}

// Get the current zone start position (if in a zone)
export function getCurrentAeroZone(progress: number, zones: number[], zoneWindow: number = 3): number | undefined {
  return zones.find(zone => progress >= zone && progress < zone + zoneWindow);
}

// Get a harder difficulty level for AERO mode questions (bumps to next level)
export function getHarderDifficulty(current: Difficulty): Difficulty {
  const levels: Difficulty[] = ['beginner', 'easy', 'medium', 'hard'];
  const idx = levels.indexOf(current);
  return levels[Math.min(idx + 1, levels.length - 1)];
}

// Generate a math question based on circuit, difficulty, and optional modifiers
// - isWet: adds 0.5 boost factor (1.5x harder)
// - boostFactor: additional difficulty boost (0-1), e.g., 0.5 for OVERTAKE (1.5x harder)
// - Factors stack: wet (0.5) + OVERTAKE (0.5) = 1.0 (next difficulty level), capped at 1.0
export function generateQuestion(circuitId: string, difficulty: Difficulty = 'easy', isWet: boolean = false, boostFactor: number = 0): Question {
  const circuit = CIRCUITS.find(c => c.id === circuitId) || CIRCUITS[0];
  const ranges = getOperationRanges(difficulty, isWet, boostFactor);

  let num1: number = 0, num2: number = 0, display: string, answer: number;

  switch (circuit.type) {
    case "Multiplication": {
      const range = ranges.multiplication;
      num1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      num2 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      display = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
    }

    case "Addition": {
      const range = ranges.addition;
      num1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      num2 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
    }

    case "Subtraction": {
      const range = ranges.subtraction;
      // Ensure num1 > num2 for positive results
      num1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
      display = `${num1} − ${num2}`;
      answer = num1 - num2;
      break;
    }

    case "Division": {
      const range = ranges.division;
      // Generate clean division (no remainders)
      answer = Math.floor(Math.random() * (range.max - 1)) + 2;
      num2 = Math.floor(Math.random() * (range.max - 1)) + 2;
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
        answer = Math.floor(Math.random() * (range.max - 1)) + 1;
        num2 = Math.floor(Math.random() * (range.max - 1)) + 1;
        num1 = answer + num2;
        display = `x + ${num2} = ${num1}, x = ?`;
      } else if (varType === 1) {
        // a − x = b
        answer = Math.floor(Math.random() * (range.max - 1)) + 1;
        num2 = Math.floor(Math.random() * (range.max - 1)) + 1;
        num1 = num2 + answer;
        display = `${num1} − x = ${num2}, x = ?`;
      } else {
        // ax = b
        answer = Math.floor(Math.random() * (range.max - 1)) + 2;
        num2 = Math.floor(Math.random() * 5) + 2;
        num1 = num2 * answer;
        display = `${num2}x = ${num1}, x = ?`;
      }
      break;
    }

    default: {
      const range = ranges.addition;
      num1 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      num2 = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
    }
  }

  // Calculate bot's time for this question with complexity consideration
  const botTime = calculateBotTime(difficulty, circuit.type, num1, num2, isWet);

  return { display, answer, botTime, num1, num2, operation: circuit.type };
}
