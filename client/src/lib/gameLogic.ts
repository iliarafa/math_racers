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
  flag: string;
  mapUrl: string;
  paths: CircuitPaths;
  drsZones: number[];
}

export interface LapEntry {
  time: number;
  trackName: string;
  timestamp: number;
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
  { id: "rookie", name: "Rookie", difficulty: "easy", label: "Rookie" },
  { id: "pro", name: "Pro", difficulty: "medium", label: "Pro" },
  { id: "champion", name: "Champion", difficulty: "hard", label: "Champion" }
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
    name: "MONZA",
    type: "Multiplication",
    description: "The Temple of Speed",
    flag: "🇮🇹",
    mapUrl: "",
    paths: {
      s1: "M 200 130 L 70 130 L 60 120 L 50 130 Q 30 130 30 90 Q 30 60 80 50 L 90 45",
      s2: "M 90 45 L 100 50 L 120 45 Q 140 20 150 45 L 160 85 L 170 95 L 180 85",
      s3: "M 180 85 L 250 85 Q 290 85 290 110 Q 290 130 250 130 L 200 130"
    },
    drsZones: [2, 8]
  },
  {
    id: "spa",
    name: "SPA",
    type: "Addition",
    description: "The Longest Lap",
    flag: "🇧🇪",
    mapUrl: "",
    paths: {
      s1: "M 90 120 L 50 135 L 40 125 Q 60 110 80 100 L 200 30 L 220 30",
      s2: "M 220 30 L 230 40 Q 260 50 260 80 L 230 100 L 270 120",
      s3: "M 270 120 Q 180 150 110 130 L 100 125 L 90 120"
    },
    drsZones: [2, 8]
  },
  {
    id: "monaco",
    name: "MONACO",
    type: "Subtraction",
    description: "Street Circuit",
    flag: "🇲🇨",
    mapUrl: "",
    paths: {
      s1: "M 40 125 L 80 120 L 90 105 Q 120 70 160 50 L 200 40",
      s2: "M 200 40 L 220 55 L 240 55 L 235 65 L 240 80 Q 200 100 150 100 L 140 105",
      s3: "M 140 105 L 110 100 L 90 105 L 70 105 Q 40 105 40 120 L 40 125"
    },
    drsZones: [0, 5]
  },
  {
    id: "suzuka",
    name: "SUZUKA",
    type: "Division",
    description: "Figure-8 Track",
    flag: "🇯🇵",
    mapUrl: "",
    paths: {
      s1: "M 250 125 L 180 125 Q 160 125 155 105 Q 150 85 180 75 Q 210 65 210 45 Q 210 25 180 25 L 140 25 L 120 35",
      s2: "M 120 35 L 110 55 Q 100 85 70 85 L 50 85 Q 20 85 20 60 L 20 50 Q 20 20 50 20 L 100 20 L 130 30 L 160 35",
      s3: "M 160 35 L 190 35 L 250 35 Q 280 35 280 80 Q 280 125 250 125"
    },
    drsZones: [0, 7]
  },
  {
    id: "silverstone",
    name: "SILVERSTONE",
    type: "Variables",
    description: "Home of F1",
    flag: "🇬🇧",
    mapUrl: "",
    paths: {
      s1: "M 145 25 L 190 15 Q 210 15 215 35 L 200 70 L 180 100 Q 170 120 145 125 L 135 120 L 125 130 Q 110 145 90 145 L 70 145 Q 50 145 50 125 L 55 115 L 80 60 L 85 50 Q 95 35 75 35",
      s2: "M 75 35 Q 55 35 55 65 Q 55 95 80 95 L 100 95 L 120 70 L 140 25 Q 150 5 170 5 L 200 5 Q 225 5 230 25 L 230 40 Q 230 60 250 65 L 265 60 Q 285 55 285 85 L 285 115",
      s3: "M 285 115 Q 285 140 255 140 L 220 140 L 200 115 L 190 125 L 175 125 Q 155 125 150 105 L 145 25"
    },
    drsZones: [3, 7]
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

  const recordLapTime = (time: number, trackName?: string) => {
    const newTimes = [...sessionLapTimes, time].sort((a, b) => a - b).slice(0, 10);
    setSessionLapTimes(newTimes);
    saveSessionLapTimes(newTimes);
    
    if (trackName) {
      const newLapEntry: LapEntry = {
        time,
        trackName,
        timestamp: Date.now()
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

export function generateQuestion(circuitId: string, difficulty: Difficulty = 'easy', isWet: boolean = false): Question {
  const circuit = CIRCUITS.find(c => c.id === circuitId) || CIRCUITS[0];
  
  // Difficulty multipliers: easy = smaller numbers, hard = larger numbers
  // Wet weather increases number ranges proportionally
  let range: { min: number; max: number };
  if (difficulty === 'easy') {
    range = isWet ? { min: 2, max: 15 } : { min: 2, max: 10 };
  } else if (difficulty === 'medium') {
    range = isWet ? { min: 5, max: 25 } : { min: 5, max: 15 };
  } else {
    range = isWet ? { min: 10, max: 30 } : { min: 10, max: 20 };
  }
  
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
