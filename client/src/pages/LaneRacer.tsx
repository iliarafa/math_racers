import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import {
  useGameState,
  generateQuestion,
  generateWrongAnswers,
  CIRCUITS,
  RACE_LENGTH,
  SIM_LAP_COUNTS,
  calculateLaneRacerScore,
  estimateRivalRaceTimeMs,
  rivalProgress,
  rivalPosition,
  DRIVERS,
  initDynamicDifficulty,
  updateDynamicDifficulty,
  loadDifficultyMode,
  loadLockedDifficulty,
  saveDifficultyPrefs,
  DIFFICULTY_MODE_COLORS,
  LOCKED_LEVEL_COLORS,
  SETUP_INACTIVE_TEXT,
  CHASE_CAM_ACTIVE_COLOR,
} from "@/lib/gameLogic";
import type { Difficulty, DynamicDifficultyState, DifficultyMode } from "@/lib/gameLogic";
import { submitLaneRacerLeaderboardEntry } from "@/lib/supabase";
import { LaneRacerEngine } from "@/lib/laneRacerEngine";
import type { LaneRacerEngineRef } from "@/lib/laneRacerController3d";
import { FOG_COLOR } from "@/components/lane-racer/atmosphere";
import { TEAMS, TEAM_SVGS, type TeamId } from "@/lib/carSvgs";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import flagItaly from "@/assets/flag_italy.png";
import flagBelgium from "@/assets/flag_belgium.png";
import flagMonaco from "@/assets/flag_monaco.png";
import flagJapan from "@/assets/flag_japan.png";
import flagUK from "@/assets/flag_uk.png";
import circuitMonzaBlack from "@/assets/circuit_monza_black.png";
import circuitSuzukaBlack from "@/assets/circuit_suzuka_black.png";
import circuitMonacoBlack from "@/assets/circuit_monaco_black.png";
import circuitSilverstoneBlack from "@/assets/circuit_silverstone_black.png";
import circuitSpaBlack from "@/assets/circuit_spa_black.png";
import trackMiami from "@/assets/miami_track.png";
import trackCanada from "@/assets/track_canada.png";
import circuitCatalunya from "@/assets/circuit_catalunya.png";
import circuitAustria from "@/assets/circuit_austria.png";
import flagUs from "@/assets/flag_us.jpg";
import flagCanada from "@/assets/flag_canada.png";
import flagSpain from "@/assets/flag_spain.png";
import flagAustria from "@/assets/flag_austria.png";

const LaneRacerCanvas3D = lazy(() =>
  import("@/components/lane-racer/LaneRacerCanvas3D").then(m => ({ default: m.LaneRacerCanvas3D })),
);

function preloadLaneRacer3D() {
  void import("@/components/lane-racer/LaneRacerCanvas3D");
}

const FLAG_IMAGES: { [id: string]: string } = {
  monza: flagItaly, spa: flagBelgium, monaco: flagMonaco, suzuka: flagJapan, silverstone: flagUK, miami: flagUs, canada: flagCanada, barcelona: flagSpain, austria: flagAustria,
};
const CIRCUIT_MAP_IMAGES: { [id: string]: string } = {
  monza: circuitMonzaBlack, spa: circuitSpaBlack, monaco: circuitMonacoBlack, suzuka: circuitSuzukaBlack, silverstone: circuitSilverstoneBlack, miami: trackMiami, canada: trackCanada, barcelona: circuitCatalunya, austria: circuitAustria,
};

type GameStatus = 'setup' | 'countdown' | 'racing' | 'finished';
type RendererMode = '2d' | '3d';

const RENDERER_STORAGE_KEY = 'laneRacerRenderer';

const OPERATION_OPTIONS: { label: string; type: string }[] = [
  { label: '+', type: 'Addition' },
  { label: '−', type: 'Subtraction' },
  { label: '×', type: 'Multiplication' },
  { label: '÷', type: 'Division' },
  { label: 'f(x)', type: 'Variables' },
];

/** Lane Racer difficulty drum: Adaptive + locked series (defaults to Adaptive). */
const DIFFICULTY_DRUM_OPTIONS: {
  id: string;
  label: string;
  mode: DifficultyMode;
  locked: Difficulty | null;
}[] = [
  { id: 'adaptive', label: 'Adaptive', mode: 'adaptive', locked: null },
  { id: 'karting', label: 'Karting', mode: 'locked', locked: 'beginner' },
  { id: 'f3', label: 'F3', mode: 'locked', locked: 'easy' },
  { id: 'f2', label: 'F2', mode: 'locked', locked: 'medium' },
  { id: 'f1', label: 'F1', mode: 'locked', locked: 'hard' },
];

function difficultyDrumIndex(mode: DifficultyMode, locked: Difficulty): number {
  if (mode !== 'locked') return 0;
  const i = DIFFICULTY_DRUM_OPTIONS.findIndex((o) => o.mode === 'locked' && o.locked === locked);
  return i >= 0 ? i : 1;
}

function difficultyDrumColor(opt: (typeof DIFFICULTY_DRUM_OPTIONS)[number]): string {
  if (opt.mode === 'adaptive') return DIFFICULTY_MODE_COLORS.adaptive;
  return LOCKED_LEVEL_COLORS[opt.locked!];
}

// Precompute blob URLs for team car previews (module-level, created once)
const TEAM_PREVIEW_URLS: Record<string, string> = {};
for (const team of TEAMS) {
  TEAM_PREVIEW_URLS[team.id] = URL.createObjectURL(new Blob([TEAM_SVGS[team.id]], { type: 'image/svg+xml' }));
}

const CIRCUIT_OPTIONS = CIRCUITS.map(c => ({
  id: c.id,
  name: c.name,
  type: c.type,
}));

function getWrappedIndex(current: number, offset: number, length: number): number {
  return ((current + offset) % length + length) % length;
}

function HorizontalDrum({
  length,
  currentIndex,
  onPrev,
  onNext,
  renderItem,
  testIdPrefix,
  ariaLabelPrev = 'Previous',
  ariaLabelNext = 'Next',
  itemHeight = 80,
}: {
  length: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  renderItem: (index: number, isActive: boolean) => React.ReactNode;
  testIdPrefix: string;
  ariaLabelPrev?: string;
  ariaLabelNext?: string;
  itemHeight?: number;
}) {
  const swipeStartXRef = useRef<number | null>(null);
  const itemH = itemHeight;

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      swipeStartXRef.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (swipeStartXRef.current === null) return;
      const diff = swipeStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 30) {
        diff > 0 ? onNext() : onPrev();
      }
      swipeStartXRef.current = null;
    },
    onTouchCancel: () => {
      swipeStartXRef.current = null;
    },
  };

  return (
    <div
      className="w-full flex items-center justify-center gap-4 outline-none focus:outline-none"
      style={{ height: itemH, overflow: 'hidden', touchAction: 'none', position: 'relative' }}
      {...swipeHandlers}
      tabIndex={0}
      data-testid={`${testIdPrefix}-drum`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNext();
        }
      }}
      aria-label={`Selection ${currentIndex + 1} of ${length}`}
    >
      <button
        type="button"
        className="shrink-0 p-1.5 text-white/45 outline-none focus:outline-none focus-visible:outline-none"
        aria-label={ariaLabelPrev}
        onClick={onPrev}
        data-testid={`${testIdPrefix}-prev`}
      >
        <ChevronLeft size={20} />
      </button>

      <motion.div
        key={`${testIdPrefix}-${currentIndex}`}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className="w-auto min-w-[5rem] flex items-center justify-center"
        style={{ height: itemH }}
        aria-current={true}
        data-testid={`${testIdPrefix}-slot-0`}
      >
        {renderItem(currentIndex, true)}
      </motion.div>

      <button
        type="button"
        className="shrink-0 p-1.5 text-white/45 outline-none focus:outline-none focus-visible:outline-none"
        aria-label={ariaLabelNext}
        onClick={onNext}
        data-testid={`${testIdPrefix}-next`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// Web Audio helpers
let audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playBeep(freq: number, duration: number, volume = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export default function LaneRacer() {
  const { state, setPlayerName } = useGameState();
  const [, navigate] = useLocation();
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [selectedCircuit, setSelectedCircuit] = useState(CIRCUIT_OPTIONS[0]);
  const [currentCircuitIndex, setCurrentCircuitIndex] = useState(0);
  const dynamicDifficultyRef = useRef<DynamicDifficultyState | null>(null);
  const currentDifficultyRef = useRef<Difficulty>('beginner');
  const questionStartTimeRef = useRef<number>(Date.now());
  const [dynamicDifficultyDisplay, setDynamicDifficultyDisplay] = useState<Difficulty>('beginner');
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>(() => loadDifficultyMode());
  const [lockedDifficulty, setLockedDifficulty] = useState<Difficulty>(() => loadLockedDifficulty());
  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(() =>
    difficultyDrumIndex(loadDifficultyMode(), loadLockedDifficulty()),
  );
  const [currentOpIndex, setCurrentOpIndex] = useState(0);
  const selectedOperation = OPERATION_OPTIONS[currentOpIndex].type;

  const selectDifficultyDrumIndex = (n: number) => {
    const opt = DIFFICULTY_DRUM_OPTIONS[n];
    setCurrentDifficultyIndex(n);
    if (opt.mode === 'adaptive') {
      setDifficultyMode('adaptive');
      saveDifficultyPrefs('adaptive', lockedDifficulty);
    } else {
      setDifficultyMode('locked');
      setLockedDifficulty(opt.locked!);
      saveDifficultyPrefs('locked', opt.locked!);
    }
  };
  const [currentTeamIndex, setCurrentTeamIndex] = useState(() => {
    const saved = localStorage.getItem('lastSelectedTeam');
    const idx = TEAMS.findIndex(t => t.id === saved);
    return idx >= 0 ? idx : 0;
  });
  const [selectedTeam, setSelectedTeam] = useState<TeamId>(() => {
    const saved = localStorage.getItem('lastSelectedTeam');
    return (saved && TEAMS.some(t => t.id === saved) ? saved : 'mercedes') as TeamId;
  });
  const [questionDisplay, setQuestionDisplay] = useState('');
  const [questionNum, setQuestionNum] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lights, setLights] = useState<boolean[]>([false, false, false, false, false]);
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [raceLength, setRaceLength] = useState(RACE_LENGTH);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingSubmission, setPendingSubmission] = useState<{
    playerId: string;
    circuitId: string;
    circuitName: string;
    operation: string;
    score: number;
    totalTime: number;
    mistakes: number;
    accuracy: number;
    difficultyAchieved: string;
  } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [renderMode, setRenderMode] = useState<RendererMode>(() => {
    const saved = localStorage.getItem(RENDERER_STORAGE_KEY);
    return saved === '3d' ? '3d' : '2d';
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LaneRacerEngineRef | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(0);
  const prevDisplayRef = useRef<string | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const difficultyLabel =
    DRIVERS.find(d => d.difficulty === dynamicDifficultyDisplay)?.label || 'Karting';
  const difficultyColor =
    dynamicDifficultyDisplay === 'hard' ? '#ef4444'
      : dynamicDifficultyDisplay === 'medium' ? '#38bdf8'
        : dynamicDifficultyDisplay === 'easy' ? '#e5e5e5'
          : '#22c55e';

  // Auto-submit leaderboard entry when race finishes
  useEffect(() => {
    if (gameStatus !== 'finished' || submitted || showNamePrompt || pendingSubmission) return;

    const accuracy = questionNum > 0 ? Math.round((correctCount / questionNum) * 100) : 0;
    const mistakes = raceLength - correctCount;
    const achieved =
      difficultyMode === 'locked'
        ? lockedDifficulty
        : (dynamicDifficultyRef.current?.currentDifficulty ?? dynamicDifficultyDisplay);
    const score = calculateLaneRacerScore(totalTime, correctCount, raceLength, achieved);

    const submission = {
      playerId: state.playerId,
      circuitId: selectedCircuit.id,
      circuitName: selectedCircuit.name,
      operation: selectedOperation,
      score,
      totalTime,
      mistakes,
      accuracy,
      difficultyAchieved: achieved,
    };

    if (state.playerName) {
      setSubmitted(true);
      submitLaneRacerLeaderboardEntry({
        ...submission,
        playerName: state.playerName,
      }).catch(() => { /* silent */ });
    } else {
      setPendingSubmission(submission);
      setShowNamePrompt(true);
      setNameInput('');
    }
  }, [correctCount, difficultyMode, dynamicDifficultyDisplay, gameStatus, lockedDifficulty, pendingSubmission, questionNum, raceLength, selectedCircuit.id, selectedCircuit.name, selectedOperation, showNamePrompt, state.playerId, state.playerName, submitted, totalTime]);

  const spawnQuestion = useCallback(() => {
    const difficulty = currentDifficultyRef.current;
    const q = generateQuestion(selectedCircuit.id, difficulty, false, 0, prevDisplayRef.current, selectedOperation);
    prevDisplayRef.current = q.display;
    const wrong = generateWrongAnswers(q.answer, 2);
    setQuestionDisplay(q.display);
    setQuestionNum(prev => prev + 1);
    questionStartTimeRef.current = Date.now();
    engineRef.current?.spawnTokens(q.answer, wrong);
  }, [selectedCircuit.id, selectedOperation]);

  const applyDynamicDifficulty = useCallback((correct: boolean) => {
    if (difficultyMode !== 'adaptive' || !dynamicDifficultyRef.current) return;
    const responseTime = Date.now() - questionStartTimeRef.current;
    const updated = updateDynamicDifficulty(
      dynamicDifficultyRef.current,
      correct,
      responseTime,
      selectedOperation,
    );
    dynamicDifficultyRef.current = updated;
    currentDifficultyRef.current = updated.currentDifficulty;
    setDynamicDifficultyDisplay(updated.currentDifficulty);
  }, [difficultyMode, selectedOperation]);

  const handleCorrect = useCallback(() => {
    applyDynamicDifficulty(true);
    setCorrectCount(prev => prev + 1);
    if (state.soundEnabled) playBeep(880, 0.1);
  }, [applyDynamicDifficulty, state.soundEnabled]);

  const handleWrong = useCallback(() => {
    applyDynamicDifficulty(false);
    if (state.soundEnabled) playBeep(220, 0.2);
  }, [applyDynamicDifficulty, state.soundEnabled]);

  const handleMiss = useCallback(() => {
    applyDynamicDifficulty(false);
    if (state.soundEnabled) playBeep(220, 0.2);
  }, [applyDynamicDifficulty, state.soundEnabled]);

  const handleFinished = useCallback(() => {
    setTotalTime(Date.now() - startTimeRef.current);
    setGameStatus('finished');
  }, []);

  // Start the game
  const startGame = () => {
    if (difficultyMode === 'locked') {
      dynamicDifficultyRef.current = null;
      currentDifficultyRef.current = lockedDifficulty;
      setDynamicDifficultyDisplay(lockedDifficulty);
    } else {
      dynamicDifficultyRef.current = initDynamicDifficulty('beginner');
      currentDifficultyRef.current = 'beginner';
      setDynamicDifficultyDisplay('beginner');
    }
    const length = SIM_LAP_COUNTS[selectedCircuit.id] || RACE_LENGTH;
    setRaceLength(length);
    setGameStatus('countdown');
    setLights([false, false, false, false, false]);
    setQuestionNum(0);
    setCorrectCount(0);
    setQuestionDisplay('');
    prevDisplayRef.current = undefined;
  };

  // F1 starting lights sequence
  useEffect(() => {
    if (gameStatus !== 'countdown') return;
    const timeouts: NodeJS.Timeout[] = [];
    // Light up one by one at 1s intervals
    for (let i = 0; i < 5; i++) {
      timeouts.push(setTimeout(() => {
        setLights(prev => prev.map((_, idx) => idx <= i));
        if (state.soundEnabled) playBeep(800, 0.15, 0.3);
      }, 1000 + i * 1000));
    }
    // Lights out + GO after random delay (0.2-1.5s after last light)
    const lightsOutDelay = 6000 + 200 + Math.random() * 1300;
    timeouts.push(setTimeout(() => {
      setLights([false, false, false, false, false]);
      if (state.soundEnabled) playBeep(1200, 0.2, 0.3);
      setTimeout(() => setGameStatus('racing'), 300);
    }, lightsOutDelay));
    return () => timeouts.forEach(clearTimeout);
  }, [gameStatus, state.soundEnabled]);

  // Notify App.tsx when entering/leaving race states (hides video & pauses music)
  useEffect(() => {
    const isRacing = gameStatus === 'countdown' || gameStatus === 'racing' || gameStatus === 'finished';
    window.dispatchEvent(new CustomEvent('racingStateChange', { detail: { racing: isRacing } }));
    return () => {
      window.dispatchEvent(new CustomEvent('racingStateChange', { detail: { racing: false } }));
    };
  }, [gameStatus]);

  const selectRenderMode = (mode: RendererMode) => {
    setRenderMode(mode);
    localStorage.setItem(RENDERER_STORAGE_KEY, mode);
    if (mode === '3d') preloadLaneRacer3D();
  };

  // Warm the 3D chunk when the saved preference is already 3D
  useEffect(() => {
    if (renderMode === '3d') preloadLaneRacer3D();
  }, [renderMode]);

  const engineCallbacks = useMemo(() => ({
    onCorrect: handleCorrect,
    onWrong: handleWrong,
    onMiss: handleMiss,
    onFinished: handleFinished,
  }), [handleCorrect, handleWrong, handleMiss, handleFinished]);

  // Adaptive: rival/engine pace stay beginner-baseline. Locked: pace at locked level.
  const paceDifficulty = difficultyMode === 'locked' ? lockedDifficulty : 'beginner';

  // Initialize 2D canvas engine when racing in classic mode
  useEffect(() => {
    if (gameStatus !== 'racing' || renderMode !== '2d' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;

    const resize = () => {
      if (!wrapper) return;
      const wrapW = wrapper.clientWidth;
      const h = Math.max(wrapper.clientHeight, 300);
      const isTablet = Math.min(window.screen.width, window.screen.height) >= 700;
      let w;
      if (wrapW > wrapper.clientHeight) {
        w = Math.min(wrapW, Math.round(h * 9 / 16));
      } else {
        w = isTablet ? wrapW : Math.min(wrapW, 500);
      }
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    const engine = new LaneRacerEngine(canvas, {
      onCorrect: handleCorrect,
      onWrong: handleWrong,
      onMiss: handleMiss,
      onFinished: handleFinished,
    }, raceLength, selectedTeam, paceDifficulty);

    engineRef.current = engine;
    startTimeRef.current = Date.now();

    const measureSafeBottom = () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom);';
      document.body.appendChild(probe);
      const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
      document.body.removeChild(probe);
      engine.setSafeBottomInset(inset + 28);
    };
    measureSafeBottom();
    engine.start();

    window.addEventListener('resize', resize);
    window.addEventListener('resize', measureSafeBottom);
    const resizeObserver = new ResizeObserver(resize);
    if (wrapper) resizeObserver.observe(wrapper);
    return () => {
      engine.destroy();
      engineRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', measureSafeBottom);
      resizeObserver.disconnect();
    };
  }, [gameStatus, renderMode, raceLength, selectedTeam, paceDifficulty, handleCorrect, handleWrong, handleMiss, handleFinished]);

  // Track race start time for 3D mode (2D sets this in its init effect above)
  useEffect(() => {
    if (gameStatus === 'racing' && renderMode === '3d') {
      startTimeRef.current = Date.now();
    }
    return () => {
      if (gameStatus === 'racing' && renderMode === '3d') {
        engineRef.current?.destroy();
        engineRef.current = null;
      }
    };
  }, [gameStatus, renderMode]);

  // Spawn questions when engine needs them
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    const interval = setInterval(() => {
      if (engineRef.current?.needsTokens() && !engineRef.current.isFinished()) {
        spawnQuestion();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameStatus, spawnQuestion]);

  // Keyboard controls
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        engineRef.current?.moveLeft();
        if (state.soundEnabled) playBeep(600, 0.03, 0.05);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        engineRef.current?.moveRight();
        if (state.soundEnabled) playBeep(600, 0.03, 0.05);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameStatus, state.soundEnabled]);

  // Touch controls
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const start = touchStartRef.current;
      if (!start) {
        // Tap — use left/right half
        const rect = wrapper.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        if (tapX < rect.width / 2) {
          engineRef.current?.moveLeft();
        } else {
          engineRef.current?.moveRight();
        }
        if (state.soundEnabled) playBeep(600, 0.03, 0.05);
        return;
      }

      const dx = touch.clientX - start.x;
      if (Math.abs(dx) > 30) {
        if (dx < 0) engineRef.current?.moveLeft();
        else engineRef.current?.moveRight();
        if (state.soundEnabled) playBeep(600, 0.03, 0.05);
      }
      touchStartRef.current = null;
    };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameStatus, state.soundEnabled]);

  // Visibility change (pause/resume)
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    const handleVisibility = () => {
      if (document.hidden) {
        engineRef.current?.pause();
      } else {
        engineRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gameStatus]);

  // Live timer (centisecond precision)
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    setElapsedMs(0);
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 16);
    return () => clearInterval(interval);
  }, [gameStatus]);

  const rivalTargetMs = useMemo(
    () => estimateRivalRaceTimeMs(raceLength, paceDifficulty, selectedOperation),
    [raceLength, paceDifficulty, selectedOperation],
  );
  const playerProgress = raceLength > 0 ? Math.min(1, questionNum / raceLength) : 0;
  const rivalProg = rivalProgress(elapsedMs, rivalTargetMs);
  const position = rivalPosition(playerProgress, rivalProg);
  // Rival marker car — a livery distinct from the player's selected team
  const rivalTeamId = (TEAMS.find((t) => t.id !== selectedTeam)?.id ?? 'ferrari') as TeamId;
  // Progress line color: green when ahead of the rival marker, yellow when behind
  const progressColor = position === 1 ? '#19c37d' : '#ffcc00';

  // Setup
  if (gameStatus === 'setup') {
    const glassCardStyle = {
      backgroundColor: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.12)',
    } as const;
    const whisperLabelStyle = {
      fontFamily: 'Oxanium, sans-serif',
      fontSize: 9,
      letterSpacing: '0.18em',
      color: 'rgba(255,255,255,0.28)',
      textTransform: 'uppercase' as const,
    };

    return (
      <div className="h-screen flex flex-col relative overflow-hidden">

        {/* Header: Back + Logo */}
        <div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: '8px' }}>
          <Link href="/game">
            <button
              className="absolute left-4 top-0 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors"
              style={{ marginTop: 'calc(env(safe-area-inset-top) + 18px)' }}
              aria-label="Back to game hub"
              data-testid="lr-setup-back"
            >
              <ChevronLeft size={24} />
            </button>
          </Link>
          <img src={logoImage} alt="F1 Math Racer" className="h-8 md:h-12 object-contain" />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-evenly items-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="text-center">
            <h2
              className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              Lane Racer
            </h2>
          </div>

          <div className="w-full max-w-sm" data-testid="lr-track-hero">
            <HorizontalDrum
              length={CIRCUIT_OPTIONS.length}
              currentIndex={currentCircuitIndex}
              itemHeight={100}
              onPrev={() => {
                const n = getWrappedIndex(currentCircuitIndex, -1, CIRCUIT_OPTIONS.length);
                setCurrentCircuitIndex(n);
                setSelectedCircuit(CIRCUIT_OPTIONS[n]);
              }}
              onNext={() => {
                const n = getWrappedIndex(currentCircuitIndex, 1, CIRCUIT_OPTIONS.length);
                setCurrentCircuitIndex(n);
                setSelectedCircuit(CIRCUIT_OPTIONS[n]);
              }}
              testIdPrefix="lr-track"
              ariaLabelPrev="Previous track"
              ariaLabelNext="Next track"
              renderItem={(idx, isActive) => {
                const circuit = CIRCUIT_OPTIONS[idx];
                return (
                  <div className="flex flex-col items-center gap-1" data-testid={`lr-track-${circuit.id}`}>
                    {CIRCUIT_MAP_IMAGES[circuit.id] && (
                      <img
                        src={CIRCUIT_MAP_IMAGES[circuit.id]}
                        alt={circuit.name}
                        className="h-14 object-contain"
                        style={{ filter: 'invert(1)', maxWidth: 88 }}
                      />
                    )}
                    <span
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: 'Oxanium, sans-serif',
                        color: isActive ? '#fff' : SETUP_INACTIVE_TEXT,
                      }}
                    >
                      {circuit.name}
                    </span>
                  </div>
                );
              }}
            />
          </div>

          <div className="w-full max-w-sm rounded-2xl px-3 py-4" style={glassCardStyle} data-testid="lr-setup">
            <div className="flex items-center gap-2">
              <span style={whisperLabelStyle}>Team</span>
              <div className="flex-1">
                <HorizontalDrum
                  length={TEAMS.length}
                  currentIndex={currentTeamIndex}
                  itemHeight={56}
                  onPrev={() => {
                    const n = getWrappedIndex(currentTeamIndex, -1, TEAMS.length);
                    setCurrentTeamIndex(n);
                    setSelectedTeam(TEAMS[n].id);
                    localStorage.setItem('lastSelectedTeam', TEAMS[n].id);
                  }}
                  onNext={() => {
                    const n = getWrappedIndex(currentTeamIndex, 1, TEAMS.length);
                    setCurrentTeamIndex(n);
                    setSelectedTeam(TEAMS[n].id);
                    localStorage.setItem('lastSelectedTeam', TEAMS[n].id);
                  }}
                  testIdPrefix="lr-team"
                  ariaLabelPrev="Previous team"
                  ariaLabelNext="Next team"
                  renderItem={(idx) => {
                    const team = TEAMS[idx];
                    return (
                      <img
                        src={TEAM_PREVIEW_URLS[team.id]}
                        alt={team.name}
                        className="w-10 h-10 object-contain"
                        style={{ transform: 'rotate(90deg)' }}
                        data-testid={`lr-team-${team.id}`}
                      />
                    );
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span style={whisperLabelStyle}>Diff</span>
              <div className="flex-1">
                <HorizontalDrum
                  length={DIFFICULTY_DRUM_OPTIONS.length}
                  currentIndex={currentDifficultyIndex}
                  itemHeight={56}
                  onPrev={() => selectDifficultyDrumIndex(getWrappedIndex(currentDifficultyIndex, -1, DIFFICULTY_DRUM_OPTIONS.length))}
                  onNext={() => selectDifficultyDrumIndex(getWrappedIndex(currentDifficultyIndex, 1, DIFFICULTY_DRUM_OPTIONS.length))}
                  testIdPrefix="lr-difficulty"
                  ariaLabelPrev="Previous difficulty"
                  ariaLabelNext="Next difficulty"
                  renderItem={(idx, isActive) => {
                    const opt = DIFFICULTY_DRUM_OPTIONS[idx];
                    return (
                      <span
                        className="font-bold text-sm uppercase tracking-wider text-center leading-tight"
                        style={{
                          fontFamily: 'Oxanium, sans-serif',
                          color: isActive ? difficultyDrumColor(opt) : SETUP_INACTIVE_TEXT,
                        }}
                        data-testid={`lr-difficulty-${opt.id}`}
                      >
                        {opt.label}
                      </span>
                    );
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span style={whisperLabelStyle}>Math</span>
              <div className="flex-1">
                <HorizontalDrum
                  length={OPERATION_OPTIONS.length}
                  currentIndex={currentOpIndex}
                  itemHeight={56}
                  onPrev={() => setCurrentOpIndex(getWrappedIndex(currentOpIndex, -1, OPERATION_OPTIONS.length))}
                  onNext={() => setCurrentOpIndex(getWrappedIndex(currentOpIndex, 1, OPERATION_OPTIONS.length))}
                  testIdPrefix="lr-op"
                  ariaLabelPrev="Previous operation"
                  ariaLabelNext="Next operation"
                  renderItem={(idx, isActive) => {
                    const op = OPERATION_OPTIONS[idx];
                    return (
                      <span
                        className="font-bold text-xl"
                        style={{
                          fontFamily: 'Oxanium, sans-serif',
                          color: isActive ? '#fff' : SETUP_INACTIVE_TEXT,
                        }}
                        data-testid={`lr-op-${op.type}`}
                      >
                        {op.label}
                      </span>
                    );
                  }}
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => selectRenderMode(renderMode === '3d' ? '2d' : '3d')}
                className="w-full py-2 px-3 transition-all outline-none focus:outline-none focus-visible:outline-none"
                style={{ fontFamily: 'Oxanium, sans-serif', background: 'transparent', border: 'none' }}
                data-testid="lr-view-3d"
                aria-label={renderMode === '3d' ? 'Disable chase cam' : 'Enable chase cam'}
              >
                <div
                  className={`text-center uppercase tracking-widest font-bold ${renderMode === '3d' ? 'text-base' : 'text-sm'}`}
                  style={{
                    color: renderMode === '3d' ? CHASE_CAM_ACTIVE_COLOR : SETUP_INACTIVE_TEXT,
                    opacity: renderMode === '3d' ? 1 : 0.45,
                  }}
                >
                  Chase Cam
                </div>
                <p className="mt-1 text-center text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {renderMode === '3d' ? 'On · Tap to disable' : 'Tap to enable'}
                </p>
              </button>
            </div>
          </div>

          <div className="w-full px-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className="w-full max-w-sm md:max-w-md mx-auto py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white block"
              style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a', animation: 'pulse-green 2s infinite' }}
              data-testid="lr-setup-start"
            >
              Start
            </motion.button>
          </div>
        </div>

        <style>{`
          @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
            50% { box-shadow: 0 0 20px 10px rgba(22, 163, 74, 0.3); }
          }
        `}</style>
      </div>
    );
  }

  // Countdown + racing share one fullscreen shell so the 3D canvas (and HUD
  // layout) are primed under the lights — no remount fight at lights-out.
  if (gameStatus === 'countdown' || gameStatus === 'racing') {
    const isRacing = gameStatus === 'racing';
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Fixed-height HUD strips keep the canvas size stable from first paint */}
        <div
          className="flex justify-between items-center px-3 py-2 shrink-0"
          style={{ background: 'black', paddingTop: 'calc(env(safe-area-inset-top) + 8px)', minHeight: 44 }}
        >
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'white' }}>
            Q {isRacing ? questionNum : 0}/{raceLength}
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'white' }}>
            {isRacing
              ? `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}.${String(elapsedMs % 1000).padStart(3, '0')}`
              : '0:00.000'}
          </div>
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: '#22c55e' }}>
            ✓ {isRacing ? correctCount : 0}
          </div>
        </div>

        <div
          className="text-xs uppercase tracking-wider font-bold text-center py-1 shrink-0"
          style={{ fontFamily: 'Oxanium, sans-serif', color: difficultyColor, background: 'black' }}
        >
          {difficultyLabel}
        </div>

        <div
          className="w-full text-center py-4 font-bold shrink-0"
          style={{
            fontFamily: 'Oxanium, sans-serif',
            fontSize: '2.8rem',
            background: 'black',
            color: 'white',
            minHeight: 80,
            lineHeight: 1.1,
          }}
        >
          {isRacing ? (questionDisplay || '\u00A0') : '\u00A0'}
        </div>

        <div
          className="shrink-0"
          style={{ background: 'black', padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}
        >
          <div style={{ position: 'relative', flex: 1, height: 6, background: 'rgba(255,255,255,0.16)', borderRadius: 4 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(isRacing ? playerProgress : 0) * 100}%`, background: progressColor, borderRadius: 4, boxShadow: `0 0 6px ${progressColor}`, transition: isRacing ? 'width 0.4s ease-out' : 'none' }} />
            <img src={TEAM_PREVIEW_URLS[rivalTeamId]} alt="rival" style={{ position: 'absolute', top: '50%', left: `${(isRacing ? rivalProg : 0) * 100}%`, height: 32, transform: 'translate(-50%, -50%) rotate(90deg)', transformOrigin: 'center', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))', pointerEvents: 'none', zIndex: 1 }} />
            <img src={TEAM_PREVIEW_URLS[selectedTeam]} alt="you" style={{ position: 'absolute', top: '50%', left: `${(isRacing ? playerProgress : 0) * 100}%`, height: 32, transform: 'translate(-50%, -50%) rotate(90deg)', transformOrigin: 'center', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))', pointerEvents: 'none', zIndex: 2, transition: isRacing ? 'left 0.4s ease-out' : 'none' }} />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'Oxanium, sans-serif' }}>
            P{isRacing ? position : 1}
          </span>
        </div>

        <div ref={canvasWrapperRef} className="relative flex-1 min-h-0 overflow-hidden bg-black">
          {renderMode === '3d' ? (
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: FOG_COLOR }}>
                  <span className="text-white/60 text-sm uppercase tracking-widest" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                    Loading 3D…
                  </span>
                </div>
              }
            >
              <LaneRacerCanvas3D
                ref={engineRef}
                callbacks={engineCallbacks}
                totalQuestions={raceLength}
                teamId={selectedTeam}
                difficulty={paceDifficulty}
                paused={!isRacing}
              />
            </Suspense>
          ) : (
            isRacing ? (
              <canvas
                ref={canvasRef}
                style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
              />
            ) : null
          )}
        </div>

        {gameStatus === 'countdown' && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black">
            <div className="bg-zinc-950 rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
              <div className="flex gap-2 md:gap-3 justify-center">
                {lights.map((isOn, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 md:w-16 md:h-16 rounded-full transition-all duration-100 border-2 md:border-4 ${
                      isOn
                        ? "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] md:shadow-[0_0_30px_rgba(220,38,38,0.8)]"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Finished screen
  if (gameStatus === 'finished') {
    const accuracy = questionNum > 0 ? Math.round((correctCount / questionNum) * 100) : 0;
    const seconds = Math.floor(totalTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeStr = `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    const mistakes = raceLength - correctCount;
    const achieved =
      difficultyMode === 'locked'
        ? lockedDifficulty
        : (dynamicDifficultyRef.current?.currentDifficulty ?? dynamicDifficultyDisplay);
    const score = calculateLaneRacerScore(totalTime, correctCount, raceLength, achieved);
    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport darkBackground>
        <div className="flex-1 flex flex-col items-center justify-start max-w-xl mx-auto w-full overflow-y-auto p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">

            <div className="space-y-2">
              <div className="text-sm font-medium text-white/50 uppercase tracking-widest">Race Result</div>
              <div className="text-6xl font-bold tracking-tighter text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                {accuracy}%
              </div>
              <div className="text-xl font-medium text-white/80">
                {accuracy === 100 ? 'Perfect Race' : accuracy >= 80 ? 'Podium Finish' : accuracy >= 50 ? 'Points Finish' : 'Did Not Score'}
              </div>
            </div>

            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Circuit</span>
                <span className="font-bold text-white">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Total Time</span>
                <span className="font-bold font-mono text-white">{timeStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Correct</span>
                <span className="font-bold text-white">{correctCount} / {raceLength}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Mistakes</span>
                <span className={`font-bold ${mistakes === 0 ? 'text-green-400' : 'text-red-400'}`}>{mistakes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Accuracy</span>
                <span className="font-bold text-white">{accuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/50">Score</span>
                <span className="font-bold text-yellow-400" style={{ fontFamily: 'Oxanium, sans-serif' }}>{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => { setGameStatus('setup'); setSubmitted(false); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                Race Again
              </button>
              <Link href="/leaderboard?mode=lane-racer">
                <button className="w-full bg-yellow-400 hover:bg-yellow-300 text-black h-12 rounded-lg font-bold transition-all flex items-center justify-center gap-2" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                  View Leaderboard
                </button>
              </Link>
              <Link href="/game">
                <button className="w-full bg-white/10 text-white h-12 rounded-lg font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                  Main Menu
                </button>
              </Link>
            </div>

          </div>
        </div>

        {showNamePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>Enter Your Name</h2>
                <p className="text-sm text-white/50">This will appear on the global leaderboard</p>
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    const trimmed = nameInput.trim();
                    setPlayerName(trimmed);
                    if (pendingSubmission) {
                      submitLaneRacerLeaderboardEntry({
                        ...pendingSubmission,
                        playerName: trimmed,
                      }).catch(() => { /* silent */ });
                    }
                    setPendingSubmission(null);
                    setSubmitted(true);
                    setShowNamePrompt(false);
                  }
                }}
                autoFocus
                maxLength={20}
                placeholder="Your name..."
                className="w-full px-4 py-3 bg-black border border-[#444] rounded-xl text-white text-center text-lg focus:outline-none focus:border-yellow-400 transition-colors"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPendingSubmission(null);
                    setSubmitted(true);
                    setShowNamePrompt(false);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 border border-[#333] hover:bg-white/5 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (nameInput.trim()) {
                      const trimmed = nameInput.trim();
                      setPlayerName(trimmed);
                      if (pendingSubmission) {
                        submitLaneRacerLeaderboardEntry({
                          ...pendingSubmission,
                          playerName: trimmed,
                        }).catch(() => { /* silent */ });
                      }
                      setPendingSubmission(null);
                      setSubmitted(true);
                      setShowNamePrompt(false);
                    }
                  }}
                  disabled={!nameInput.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </GameLayout>
    );
  }

  return null;
}
