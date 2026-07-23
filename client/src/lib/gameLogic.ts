import { useState, useEffect } from 'react';
import type { Difficulty, Question } from '@shared/mathEngine';

export type { Difficulty, Question, DynamicDifficultyState } from '@shared/mathEngine';
export {
  initDynamicDifficulty,
  updateDynamicDifficulty,
  getHarderDifficulty,
  getEasierDifficulty,
  getExpectedTime,
  calculateEnergyHarvest,
  generateQuestion,
} from '@shared/mathEngine';

export type Operation = '+' | '-' | 'x' | '÷' | 'var';

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

/** Race HUD progress: circuit silhouette vs classic sector squares */
export type RaceMapView = 'track' | 'sectors';

/** Setup weather choice. 'random' resolves per-circuit at the countdown. */
export type Weather = 'dry' | 'wet' | 'random';

export interface GameState {
  coins: number;
  unlockedItems: string[];
  equippedLivery: string;
  equippedTires: string;
  streak: number;
  totalLaps: number;
  careerPoints: number;
  racesWon: number;
  /** Persistent achievement ids (e.g. Free Practice purple lap). */
  earnedBadges: string[];

  soundEnabled: boolean;
  simMode: boolean;
  powerUpsEnabled: boolean;
  raceMapView: RaceMapView;
  personalBests: { [circuitId: string]: number };
  lapHistory: LapEntry[];
  playerName: string;
  playerId: string;
}

/** Free Practice: complete a full circuit tour with every sector purple. */
export const BADGE_EVERYTHING_IS_PURPLE = 'everything-is-purple';

export const TEAM_COLORS = [
  { id: 'ferrari', name: 'Scuderia Racing', hex: '#ff2800' },
  { id: 'mclaren', name: 'Papaya Racing', hex: '#ff8000' },
  { id: 'redbull', name: 'Red Bulls', hex: '#0600ef' },
  { id: 'mercedes', name: 'Silver Arrows Racing', hex: '#00d2be' },
];

export const RACE_LENGTH = 20;
export const GRAND_PRIX_PRACTICE_LENGTH = 30;

export const SIM_LAP_COUNTS: { [circuitId: string]: number } = {
  suzuka: 53,
  monaco: 78,
  spa: 44,
  silverstone: 52,
  monza: 53,
  melbourne: 58,
  china: 56,
  bahrain: 57,
  canada: 70,
  miami: 57,
  barcelona: 66,
  austria: 70,
  hungary: 70,
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
  { id: "f1", name: "F1", difficulty: "hard", label: "Formula 1" },
  { id: "pro", name: "Pro", difficulty: "pro", label: "Pro" },
];

/** Parse a stored difficulty string; unknown values fall back to beginner. */
export function parseDifficulty(v: string | null | undefined): Difficulty | null {
  if (v === 'beginner' || v === 'easy' || v === 'medium' || v === 'hard' || v === 'pro') return v;
  return null;
}

/** Solo setup: Adaptive (live) vs Locked (fixed series for the race). GP is always adaptive. */
export type DifficultyMode = 'adaptive' | 'locked';

/**
 * Difficulty prefs bound to a pair of localStorage keys.
 *
 * Each game keeps its own namespace on purpose — picking a level in Lane Racer must not
 * move Free Practice's. One implementation, several namespaces.
 */
export function createDifficultyPrefs(modeKey: string, lockedKey: string) {
  return {
    loadMode(): DifficultyMode {
      try {
        return localStorage.getItem(modeKey) === 'locked' ? 'locked' : 'adaptive';
      } catch {
        return 'adaptive';
      }
    },
    loadLocked(): Difficulty {
      try {
        return parseDifficulty(localStorage.getItem(lockedKey)) ?? 'beginner';
      } catch { /* ignore */ }
      return 'beginner';
    },
    save(mode: DifficultyMode, locked: Difficulty) {
      try {
        localStorage.setItem(modeKey, mode);
        localStorage.setItem(lockedKey, locked);
      } catch { /* ignore */ }
    },
  };
}

/** Free Practice / Grand Prix / Multiplayer namespace. */
const soloDifficultyPrefs = createDifficultyPrefs('difficultyMode', 'lockedDifficulty');

export function loadDifficultyMode(): DifficultyMode {
  return soloDifficultyPrefs.loadMode();
}

export function loadLockedDifficulty(): Difficulty {
  return soloDifficultyPrefs.loadLocked();
}

export function saveDifficultyPrefs(mode: DifficultyMode, locked: Difficulty) {
  soloDifficultyPrefs.save(mode, locked);
}

export function driverForDifficulty(difficulty: Difficulty): Driver {
  return DRIVERS.find(d => d.difficulty === difficulty) ?? DRIVERS[0];
}

/** Setup selection text colors (active = highlighted text, no pill backgrounds). */
export const DIFFICULTY_MODE_COLORS = {
  adaptive: '#22c55e',
  locked: '#a855f7',
} as const;

export const LOCKED_LEVEL_COLORS: Record<Difficulty, string> = {
  beginner: '#00e5ff', // Karting — electric blue
  easy: '#ec4899',     // F3 — magenta; readable on both the light race HUD and the dark setup drums (was #000000)
  medium: '#38bdf8',   // F2 — light blue
  hard: '#ef4444',     // F1 — red
  pro: '#f59e0b',      // Pro — amber (distinct from F1 red)
};

export const SETUP_INACTIVE_TEXT = 'rgba(255,255,255,0.35)';
export const CHASE_CAM_ACTIVE_COLOR = '#ff2800';

export interface DifficultyDrumOption {
  id: string;
  label: string;
  mode: DifficultyMode;
  locked: Difficulty | null;
}

/**
 * The setup drum: Adaptive first, then one entry per series.
 *
 * Derived from DRIVERS rather than hand-listed so the two can't drift apart. The
 * underlying state is still the mode/locked pair — this is only how it's presented.
 */
export const DIFFICULTY_DRUM_OPTIONS: DifficultyDrumOption[] = [
  { id: 'adaptive', label: 'Adaptive', mode: 'adaptive', locked: null },
  ...DRIVERS.map((d) => ({
    id: d.id,
    label: d.name,
    mode: 'locked' as const,
    locked: d.difficulty,
  })),
];

/** Maps the stored mode/locked pair onto a drum index. */
export function difficultyDrumIndex(mode: DifficultyMode, locked: Difficulty): number {
  if (mode !== 'locked') return 0;
  const i = DIFFICULTY_DRUM_OPTIONS.findIndex((o) => o.mode === 'locked' && o.locked === locked);
  return i >= 0 ? i : 1;
}

export function difficultyDrumColor(opt: DifficultyDrumOption): string {
  if (opt.mode === 'adaptive') return DIFFICULTY_MODE_COLORS.adaptive;
  return LOCKED_LEVEL_COLORS[opt.locked!];
}

export const POSITION_POINTS: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1
};


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
  },
  {
    id: "canada",
    name: "CANADA",
    type: "Addition",
    description: "Circuit Gilles-Villeneuve",
    mapUrl: "",
    paths: { s1: "", s2: "", s3: "" }
  },
  {
    id: "miami",
    name: "MIAMI",
    type: "Multiplication",
    description: "Miami International Autodrome",
    mapUrl: "",
    paths: { s1: "", s2: "", s3: "" }
  },
  {
    id: "barcelona",
    name: "BARCELONA",
    type: "Variables",
    description: "Circuit de Barcelona-Catalunya",
    mapUrl: "",
    paths: { s1: "", s2: "", s3: "" }
  },
  {
    id: "austria",
    name: "AUSTRIA",
    type: "Variables",
    description: "Red Bull Ring, Spielberg",
    mapUrl: "",
    paths: { s1: "", s2: "", s3: "" }
  },
  {
    id: "hungary",
    name: "HUNGARY",
    type: "Variables",
    description: "Hungaroring, Mogyoród",
    mapUrl: "",
    paths: { s1: "", s2: "", s3: "" }
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
  earnedBadges: [],

  soundEnabled: true,
  simMode: false,
  powerUpsEnabled: true,
  raceMapView: 'track',
  personalBests: {},
  lapHistory: [],
  playerName: '',
  playerId: '',
};

function parseRaceMapView(value: unknown): RaceMapView {
  return value === 'sectors' ? 'sectors' : 'track';
}

export function parseWeather(value: unknown): Weather | null {
  if (value === 'dry' || value === 'wet' || value === 'random') return value;
  return null;
}

/**
 * Setup weather lives under its own key rather than in the GameState blob.
 *
 * The blob is rewritten wholesale by whichever `useGameState` copy saves last, and
 * `MenuMusic` holds a second copy mounted app-wide — so a value written here would be
 * liable to get clobbered by a stale one. A standalone key sidesteps that.
 */
const SETUP_WEATHER_KEY = 'setupWeather';

export function loadSetupWeather(): Weather {
  try {
    return parseWeather(localStorage.getItem(SETUP_WEATHER_KEY)) ?? 'dry';
  } catch { /* ignore */ }
  return 'dry';
}

export function saveSetupWeather(weather: Weather) {
  try {
    localStorage.setItem(SETUP_WEATHER_KEY, weather);
  } catch { /* ignore */ }
}

/** Maths type, persisted for the same reason weather is — see above. */
const SETUP_OPERATION_KEY = 'setupOperation';

const OPERATIONS = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'];

export function loadSetupOperation(): string {
  try {
    const stored = localStorage.getItem(SETUP_OPERATION_KEY);
    if (stored && OPERATIONS.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'Addition';
}

export function saveSetupOperation(operation: string) {
  try {
    localStorage.setItem(SETUP_OPERATION_KEY, operation);
  } catch { /* ignore */ }
}

export const SHOP_ITEMS = [
  { id: 'red-livery', name: 'Scuderia Red', type: 'livery', cost: 0, color: 'bg-red-600' },
  { id: 'blue-livery', name: 'Racing Blue', type: 'livery', cost: 100, color: 'bg-blue-600' },
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
          earnedBadges: Array.isArray(parsed.earnedBadges) ? parsed.earnedBadges.filter((b: unknown) => typeof b === 'string') : [],

          soundEnabled: parsed.soundEnabled ?? true,
          simMode: parsed.simMode ?? false,
          powerUpsEnabled: parsed.powerUpsEnabled ?? true,
          raceMapView: parseRaceMapView(parsed.raceMapView),
          personalBests: parsed.personalBests ?? {},
          lapHistory: parsed.lapHistory ?? [],
          playerName: parsed.playerName ?? '',
          playerId: parsed.playerId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)),
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

  const toggleSound = () => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleSimMode = () => {
    setState(prev => ({ ...prev, simMode: !prev.simMode }));
  };

  const togglePowerUps = () => {
    setState(prev => ({ ...prev, powerUpsEnabled: !prev.powerUpsEnabled }));
  };

  const toggleRaceMapView = () => {
    setState(prev => ({
      ...prev,
      raceMapView: prev.raceMapView === 'track' ? 'sectors' : 'track',
    }));
  };

  const setRaceMapView = (raceMapView: RaceMapView) => {
    setState(prev => ({ ...prev, raceMapView }));
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

  /** Returns true only when the badge was newly earned. */
  const earnBadge = (id: string): boolean => {
    let newlyEarned = false;
    setState(prev => {
      if (prev.earnedBadges.includes(id)) return prev;
      newlyEarned = true;
      return { ...prev, earnedBadges: [...prev.earnedBadges, id] };
    });
    return newlyEarned;
  };

  const updatePersonalBest = (circuitId: string, time: number, difficulty?: Difficulty) => {
    setState(prev => {
      const key = difficulty ? `${circuitId}:${difficulty}` : circuitId;
      const currentBest = prev.personalBests[key];
      if (!currentBest || time < currentBest) {
        return {
          ...prev,
          personalBests: { ...prev.personalBests, [key]: time }
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

  const setPlayerName = (name: string) => {
    setState(prev => ({ ...prev, playerName: name }));
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

    toggleSound,
    toggleSimMode,
    togglePowerUps,
    toggleRaceMapView,
    setRaceMapView,
    incrementLaps,
    addCareerPoints,
    incrementRacesWon,
    earnBadge,
    updatePersonalBest,
    resetAllData,
    recordLapTime,
    getTopLapTimes,
    getLapHistory,
    setPlayerName
  };
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

export function generateWrongAnswers(correctAnswer: number, count: number): number[] {
  const results: number[] = [];
  const maxRange = correctAnswer <= 5 ? 3 : correctAnswer <= 20 ? 5 : Math.min(Math.ceil(correctAnswer * 0.3), 20);

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let wrong: number;
    do {
      const offset = Math.floor(Math.random() * maxRange) + 1;
      wrong = correctAnswer + (Math.random() < 0.5 ? offset : -offset);
      if (wrong < 1) wrong = correctAnswer + offset;
      attempts++;
    } while ((wrong === correctAnswer || results.includes(wrong) || wrong < 1) && attempts < 20);
    results.push(wrong);
  }
  return results;
}

// Calculate composite PST score
// score = (lapCount / timeInSeconds) * (correctAnswers / lapCount) * difficultyMultiplier * 1000
export function calculatePSTScore(
  totalTimeMs: number,
  mistakes: number,
  difficultyAchieved: Difficulty,
  lapCount: number = 57
): number {
  if (totalTimeMs <= 0 || lapCount <= 0) return 0;
  const timeInSeconds = totalTimeMs / 1000;
  const correctAnswers = Math.max(0, lapCount - mistakes);
  const difficultyMultipliers: Record<Difficulty, number> = {
    beginner: 1.0,
    easy: 1.5,
    medium: 2.0,
    hard: 3.0,
    pro: 3.5,
  };
  const multiplier = difficultyMultipliers[difficultyAchieved] ?? 1.0;
  const score = (lapCount / timeInSeconds) * (correctAnswers / lapCount) * multiplier * 1000;
  return Math.min(Math.round(score), 100000);
}

// Calculate Grand Prix score: Race Day result via the shared formula, x1.25 if pole.
export function calculateGPScore(
  totalTimeMs: number,
  mistakes: number,
  difficultyAchieved: Difficulty,
  raceLength: number,
  polePosition: boolean
): number {
  if (totalTimeMs <= 0 || raceLength <= 0) return 0;
  const timeInSeconds = totalTimeMs / 1000;
  const correctAnswers = Math.max(0, raceLength - mistakes);
  const difficultyMultipliers: Record<Difficulty, number> = {
    beginner: 1.0,
    easy: 1.5,
    medium: 2.0,
    hard: 3.0,
    pro: 3.5,
  };
  const multiplier = difficultyMultipliers[difficultyAchieved] ?? 1.0;
  let score = (raceLength / timeInSeconds) * (correctAnswers / raceLength) * multiplier * 1000;
  if (polePosition) score *= 1.25;
  return Math.min(Math.round(score), 100000);
}

// Calculate Lane Racer score (same formula as PST)
export function calculateLaneRacerScore(
  totalTimeMs: number,
  correctCount: number,
  raceLength: number,
  difficultyAchieved: Difficulty
): number {
  if (totalTimeMs <= 0 || raceLength <= 0) return 0;
  const timeInSeconds = totalTimeMs / 1000;
  const difficultyMultipliers: Record<Difficulty, number> = {
    beginner: 1.0,
    easy: 1.5,
    medium: 2.0,
    hard: 3.0,
    pro: 3.5,
  };
  const multiplier = difficultyMultipliers[difficultyAchieved] ?? 1.0;
  const score = (raceLength / timeInSeconds) * (correctCount / raceLength) * multiplier * 1000;
  return Math.min(Math.round(score), 100000);
}

// --- Rival pacing (Lane Racer "sense of racing") -------------------------
// Deterministic per-question bot time (no randomness/complexity) used only to
// pace the on-screen rival marker. Mirrors the base + operation modifier used
// in calculateBotTime so the rival feels consistent with the difficulty.
export function estimateBotQuestionMs(difficulty: Difficulty, operation: string): number {
  const base: Record<Difficulty, number> = {
    beginner: 2500,
    easy: 3500,
    medium: 4500,
    hard: 6000,
    pro: 6500,
  };
  const opMod: Record<string, number> = {
    Addition: 0.85,
    Subtraction: 0.95,
    Multiplication: 1.15,
    Division: 1.20,
    Variables: 1.25,
  };
  return Math.round(base[difficulty] * (opMod[operation] ?? 1.0));
}

export function estimateRivalRaceTimeMs(
  raceLength: number,
  difficulty: Difficulty,
  operation: string,
): number {
  return raceLength * estimateBotQuestionMs(difficulty, operation);
}

export function rivalProgress(elapsedMs: number, rivalTargetMs: number): number {
  if (rivalTargetMs <= 0) return 0;
  return Math.max(0, Math.min(1, elapsedMs / rivalTargetMs));
}

// 1 (ahead/tied) or 2 (behind) relative to the rival.
export function rivalPosition(playerProgress: number, rivalProg: number): 1 | 2 {
  return playerProgress >= rivalProg ? 1 : 2;
}
