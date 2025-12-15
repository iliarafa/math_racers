import { useState, useEffect } from 'react';

export type Operation = '+' | '-' | 'x';

export interface Question {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
}

export interface GameState {
  coins: number;
  currentTrack: number; // 1, 2, 3 (Difficulty)
  unlockedItems: string[];
  equippedLivery: string;
  equippedTires: string;
  streak: number;
}

export const RACE_LENGTH = 20;

export const DRIVERS_2025 = [
  "Max Verstappen",      // 1st (0-1 mistakes)
  "Lando Norris",        // 2nd
  "Charles Leclerc",     // 3rd
  "Lewis Hamilton",      // 4th
  "Oscar Piastri",       // 5th
  "George Russell",      // 6th
  "Carlos Sainz",        // 7th
  "Fernando Alonso",     // 8th
  "Yuki Tsunoda",        // 9th
  "Pierre Gasly",        // 10th
  "Nico Hulkenberg",     // 11th
  "Alex Albon",          // 12th
  "Esteban Ocon",        // 13th
  "Lance Stroll",        // 14th
  "Liam Lawson",         // 15th
  "Franco Colapinto",    // 16th
  "Oliver Bearman",      // 17th
  "Kimi Antonelli",      // 18th
  "Gabriel Bortoleto",   // 19th
  "Isack Hadjar"         // 20th
];

const INITIAL_STATE: GameState = {
  coins: 0,
  currentTrack: 1,
  unlockedItems: ['red-livery', 'hard-tires'],
  equippedLivery: 'red-livery',
  equippedTires: 'hard-tires',
  streak: 0,
};

export const TRACKS = [
  { id: 1, name: "Karting Track", description: "Basic Addition (1-20)", winCondition: 20 },
  { id: 2, name: "City Circuit", description: "Add (1-50) & Sub", winCondition: 20 },
  { id: 3, name: "Grand Prix", description: "Add/Sub (1-100) & Mult", winCondition: 20 },
];

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
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('f1-math-racer-state', JSON.stringify(state));
  }, [state]);

  const addCoins = (amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }));
  };

  const incrementStreak = () => {
    setState(prev => ({ ...prev, streak: prev.streak + 1 }));
  };

  const resetStreak = () => {
    setState(prev => ({ ...prev, streak: 0 }));
  };

  const nextTrack = () => {
    if (state.currentTrack < 3) {
      setState(prev => ({ ...prev, currentTrack: prev.currentTrack + 1 }));
    }
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

  return {
    state,
    addCoins,
    incrementStreak,
    resetStreak,
    nextTrack,
    buyItem,
    equipItem
  };
}

export function generateQuestion(trackLevel: number): Question {
  let num1, num2, operation: Operation = '+';
  
  // Track 1: Addition 1-20
  if (trackLevel === 1) {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    operation = '+';
  } 
  // Track 2: Addition 1-50 & Subtraction
  else if (trackLevel === 2) {
    const isAdd = Math.random() > 0.5;
    if (isAdd) {
      num1 = Math.floor(Math.random() * 25) + 1;
      num2 = Math.floor(Math.random() * 25) + 1;
      operation = '+';
    } else {
      num1 = Math.floor(Math.random() * 50) + 10;
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // Ensure positive result
      operation = '-';
    }
  } 
  // Track 3: Add/Sub 1-100 & Mult (2-10)
  else {
    const type = Math.random();
    if (type < 0.4) { // Addition
      num1 = Math.floor(Math.random() * 50) + 10;
      num2 = Math.floor(Math.random() * 50) + 10;
      operation = '+';
    } else if (type < 0.7) { // Subtraction
      num1 = Math.floor(Math.random() * 100) + 20;
      num2 = Math.floor(Math.random() * (num1 - 10)) + 1;
      operation = '-';
    } else { // Multiplication
      num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
      num2 = Math.floor(Math.random() * 9) + 2;
      operation = 'x';
    }
  }

  let answer = 0;
  if (operation === '+') answer = num1 + num2;
  if (operation === '-') answer = num1 - num2;
  if (operation === 'x') answer = num1 * num2;

  return { num1, num2, operation, answer };
}
