import { useState, useEffect } from 'react';

export type Operation = '+' | '-' | 'x' | '÷' | 'var';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  display: string;
  answer: number;
}

export interface Driver {
  id: string;
  name: string;
  difficulty: Difficulty;
  label: string;
}

export interface Circuit {
  id: string;
  name: string;
  type: string;
  description: string;
  mapUrl: string;
  pathData: string;
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
}

export const TEAM_COLORS = [
  { id: 'ferrari', name: 'Ferrari', hex: '#ff2800' },
  { id: 'mclaren', name: 'McLaren', hex: '#ff8000' },
  { id: 'redbull', name: 'Red Bull', hex: '#0600ef' },
  { id: 'mercedes', name: 'Mercedes', hex: '#00d2be' },
];

export const RACE_LENGTH = 20;

export const DRIVERS: Driver[] = [
  { id: "kimi", name: "Kimi Antonelli", difficulty: "easy", label: "Rookie (Age 8)" },
  { id: "lando", name: "Lando Norris", difficulty: "medium", label: "Pro (Age 9)" },
  { id: "max", name: "Max Verstappen", difficulty: "hard", label: "Champion (Age 10)" }
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
    id: "monza",
    name: "Monza",
    type: "Multiplication",
    description: "",
    mapUrl: "",
    pathData: "M 200 130 L 70 130 L 60 120 L 50 130 Q 30 130 30 90 Q 30 60 80 50 L 90 45 L 100 50 L 120 45 Q 140 20 150 45 L 160 85 L 170 95 L 180 85 L 250 85 Q 290 85 290 110 Q 290 130 250 130 Z"
  },
  {
    id: "spa",
    name: "Spa",
    type: "Addition",
    description: "",
    mapUrl: "",
    pathData: "M 90 120 L 50 135 L 40 125 Q 60 110 80 100 L 200 30 L 220 30 L 230 40 Q 260 50 260 80 L 230 100 L 270 120 Q 180 150 110 130 L 100 125 L 90 120 Z"
  },
  {
    id: "monaco",
    name: "Monaco",
    type: "Subtraction",
    description: "",
    mapUrl: "",
    pathData: "M 20 100 L 20 50 L 80 50 L 80 20 L 150 20 L 150 80 L 200 80 L 200 120 L 100 120 L 100 140 L 20 140 Z"
  },
  {
    id: "suzuka",
    name: "Suzuka",
    type: "Division",
    description: "",
    mapUrl: "",
    pathData: "M 250 125 L 180 125 Q 160 125 155 105 Q 150 85 180 75 Q 210 65 210 45 Q 210 25 180 25 L 140 25 L 120 35 L 110 55 Q 100 85 70 85 L 50 85 Q 20 85 20 60 L 20 50 Q 20 20 50 20 L 100 20 L 130 30 L 160 35 L 190 35 L 250 35 Q 280 35 280 80 Q 280 125 250 125 Z"
  },
  {
    id: "silverstone",
    name: "Silverstone",
    type: "Variables",
    description: "",
    mapUrl: "",
    pathData: "M 50 100 L 50 50 L 100 20 L 200 20 L 250 50 L 250 100 L 200 130 L 100 130 Z"
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

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
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
      };
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('f1-math-racer-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.style.setProperty('--team-color', state.teamColor);
  }, [state.teamColor]);

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

  const incrementLaps = () => {
    setState(prev => ({ ...prev, totalLaps: prev.totalLaps + 1 }));
  };

  const addCareerPoints = (points: number) => {
    setState(prev => ({ ...prev, careerPoints: prev.careerPoints + points }));
  };

  const incrementRacesWon = () => {
    setState(prev => ({ ...prev, racesWon: prev.racesWon + 1 }));
  };

  const resetAllData = () => {
    localStorage.removeItem('f1-math-racer-state');
    setState(INITIAL_STATE);
  };

  return {
    state,
    addCoins,
    incrementStreak,
    resetStreak,
    buyItem,
    equipItem,
    setTeamColor,
    toggleSound,
    incrementLaps,
    addCareerPoints,
    incrementRacesWon,
    resetAllData
  };
}

export function generateQuestion(circuitId: string, difficulty: Difficulty = 'easy'): Question {
  const circuit = CIRCUITS.find(c => c.id === circuitId) || CIRCUITS[0];
  
  // Difficulty multipliers: easy = smaller numbers, hard = larger numbers
  const range = difficulty === 'easy' ? { min: 2, max: 10 } : difficulty === 'medium' ? { min: 5, max: 15 } : { min: 10, max: 20 };
  
  let num1: number, num2: number, display: string, answer: number;
  
  switch (circuit.type) {
    case "Multiplication":
      num1 = Math.floor(Math.random() * (range.max - range.min)) + range.min;
      num2 = Math.floor(Math.random() * (range.max - range.min)) + range.min;
      display = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
      
    case "Addition":
      num1 = Math.floor(Math.random() * (range.max * 3)) + range.min;
      num2 = Math.floor(Math.random() * (range.max * 3)) + range.min;
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
      
    case "Subtraction":
      num1 = Math.floor(Math.random() * (range.max * 3)) + range.max;
      num2 = Math.floor(Math.random() * (num1 - 5)) + 1;
      display = `${num1} − ${num2}`;
      answer = num1 - num2;
      break;
      
    case "Division":
      answer = Math.floor(Math.random() * range.max) + 2;
      num2 = Math.floor(Math.random() * range.max) + 2;
      num1 = answer * num2;
      display = `${num1} ÷ ${num2}`;
      break;
      
    case "Variables":
      const varType = Math.floor(Math.random() * 3);
      if (varType === 0) {
        answer = Math.floor(Math.random() * range.max) + 2;
        const a = Math.floor(Math.random() * range.max) + 2;
        const b = answer + a;
        display = `x + ${a} = ${b}, x = ?`;
      } else if (varType === 1) {
        answer = Math.floor(Math.random() * range.max) + 2;
        const b = Math.floor(Math.random() * range.max) + 2;
        const a = b + answer;
        display = `${a} − x = ${b}, x = ?`;
      } else {
        answer = Math.floor(Math.random() * range.max) + 2;
        const a = Math.floor(Math.random() * 5) + 2;
        const b = a * answer;
        display = `${a}x = ${b}, x = ?`;
      }
      break;
      
    default:
      num1 = Math.floor(Math.random() * range.max) + 1;
      num2 = Math.floor(Math.random() * range.max) + 1;
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
  }
  
  return { display, answer };
}
