import { useState, useEffect } from 'react';

export type Operation = '+' | '-' | 'x' | '÷' | 'var';

export interface Question {
  display: string;
  answer: number;
}

export interface Circuit {
  id: string;
  name: string;
  type: string;
  description: string;
  mapUrl: string;
}

export interface GameState {
  coins: number;
  unlockedItems: string[];
  equippedLivery: string;
  equippedTires: string;
  streak: number;
}

export const RACE_LENGTH = 20;

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
    name: "Monza (Italy)",
    type: "Multiplication",
    description: "The Temple of Speed",
    mapUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Monza_track_map.svg"
  },
  {
    id: "spa",
    name: "Spa (Belgium)",
    type: "Addition",
    description: "The Longest Lap",
    mapUrl: "https://upload.wikimedia.org/wikipedia/commons/5/54/Spa-Francorchamps_of_Belgium.svg"
  },
  {
    id: "monaco",
    name: "Monaco",
    type: "Subtraction",
    description: "Street Circuit",
    mapUrl: "https://upload.wikimedia.org/wikipedia/commons/3/36/Monte_Carlo_Formula_1_track_map.svg"
  },
  {
    id: "suzuka",
    name: "Suzuka (Japan)",
    type: "Division",
    description: "Figure-8 Track",
    mapUrl: "https://upload.wikimedia.org/wikipedia/commons/4/40/Suzuka_circuit_map_2005.svg"
  },
  {
    id: "silverstone",
    name: "Silverstone (UK)",
    type: "Variables",
    description: "Home of F1",
    mapUrl: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Silverstone_Circuit_2020.svg"
  }
];

const INITIAL_STATE: GameState = {
  coins: 0,
  unlockedItems: ['red-livery', 'hard-tires'],
  equippedLivery: 'red-livery',
  equippedTires: 'hard-tires',
  streak: 0,
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
      // Migrate old state format - ensure all required fields exist
      return {
        coins: parsed.coins ?? 0,
        unlockedItems: parsed.unlockedItems ?? ['red-livery', 'hard-tires'],
        equippedLivery: parsed.equippedLivery ?? 'red-livery',
        equippedTires: parsed.equippedTires ?? 'hard-tires',
        streak: parsed.streak ?? 0,
      };
    }
    return INITIAL_STATE;
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
    buyItem,
    equipItem
  };
}

export function generateQuestion(circuitId: string): Question {
  const circuit = CIRCUITS.find(c => c.id === circuitId) || CIRCUITS[0];
  
  let num1: number, num2: number, display: string, answer: number;
  
  switch (circuit.type) {
    case "Multiplication":
      num1 = Math.floor(Math.random() * 10) + 2; // 2-11
      num2 = Math.floor(Math.random() * 10) + 2; // 2-11
      display = `${num1} × ${num2}`;
      answer = num1 * num2;
      break;
      
    case "Addition":
      num1 = Math.floor(Math.random() * 50) + 10; // 10-59
      num2 = Math.floor(Math.random() * 50) + 10; // 10-59
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
      break;
      
    case "Subtraction":
      num1 = Math.floor(Math.random() * 50) + 20; // 20-69
      num2 = Math.floor(Math.random() * (num1 - 5)) + 1; // Ensure positive result
      display = `${num1} − ${num2}`;
      answer = num1 - num2;
      break;
      
    case "Division":
      // Generate division with whole number results
      answer = Math.floor(Math.random() * 10) + 2; // 2-11
      num2 = Math.floor(Math.random() * 10) + 2; // 2-11
      num1 = answer * num2;
      display = `${num1} ÷ ${num2}`;
      break;
      
    case "Variables":
      // Simple algebra: x + a = b or a - x = b or ax = b
      const varType = Math.floor(Math.random() * 3);
      if (varType === 0) {
        // x + a = b
        answer = Math.floor(Math.random() * 15) + 3;
        const a = Math.floor(Math.random() * 10) + 2;
        const b = answer + a;
        display = `x + ${a} = ${b}, x = ?`;
      } else if (varType === 1) {
        // a - x = b
        answer = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 10) + 2;
        const a = b + answer;
        display = `${a} − x = ${b}, x = ?`;
      } else {
        // ax = b
        answer = Math.floor(Math.random() * 10) + 2;
        const a = Math.floor(Math.random() * 5) + 2; // 2-6
        const b = a * answer;
        display = `${a}x = ${b}, x = ?`;
      }
      break;
      
    default:
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      display = `${num1} + ${num2}`;
      answer = num1 + num2;
  }
  
  return { display, answer };
}
