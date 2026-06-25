import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, generateWrongAnswers, CIRCUITS, RACE_LENGTH, SIM_LAP_COUNTS, calculateLaneRacerScore, estimateRivalRaceTimeMs, rivalProgress, rivalPosition } from "@/lib/gameLogic";
import type { Difficulty } from "@/lib/gameLogic";
import { submitLaneRacerLeaderboardEntry } from "@/lib/supabase";
import { LaneRacerEngine } from "@/lib/laneRacerEngine";
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

const FLAG_IMAGES: { [id: string]: string } = {
  monza: flagItaly, spa: flagBelgium, monaco: flagMonaco, suzuka: flagJapan, silverstone: flagUK, miami: flagUs, canada: flagCanada, barcelona: flagSpain, austria: flagAustria,
};
const CIRCUIT_MAP_IMAGES: { [id: string]: string } = {
  monza: circuitMonzaBlack, spa: circuitSpaBlack, monaco: circuitMonacoBlack, suzuka: circuitSuzukaBlack, silverstone: circuitSilverstoneBlack, miami: trackMiami, canada: trackCanada, barcelona: circuitCatalunya, austria: circuitAustria,
};

type GameStatus = 'setup' | 'countdown' | 'racing' | 'finished';

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Karting', value: 'beginner' },
  { label: 'F3', value: 'easy' },
  { label: 'F2', value: 'medium' },
  { label: 'F1', value: 'hard' },
];

const OPERATION_OPTIONS: { label: string; type: string }[] = [
  { label: '+', type: 'Addition' },
  { label: '−', type: 'Subtraction' },
  { label: '×', type: 'Multiplication' },
  { label: '÷', type: 'Division' },
  { label: 'f(x)', type: 'Variables' },
];

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentOpIndex, setCurrentOpIndex] = useState(0);
  const selectedOperation = OPERATION_OPTIONS[currentOpIndex].type;
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LaneRacerEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(0);
  const prevDisplayRef = useRef<string | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const teamSwipeStartXRef = useRef<number | null>(null);
  const levelSwipeStartXRef = useRef<number | null>(null);

  // Auto-submit leaderboard entry when race finishes
  useEffect(() => {
    if (gameStatus !== 'finished' || submitted || showNamePrompt || pendingSubmission) return;

    const accuracy = questionNum > 0 ? Math.round((correctCount / questionNum) * 100) : 0;
    const mistakes = raceLength - correctCount;
    const score = calculateLaneRacerScore(totalTime, correctCount, raceLength, selectedDifficulty);

    const submission = {
      playerId: state.playerId,
      circuitId: selectedCircuit.id,
      circuitName: selectedCircuit.name,
      operation: selectedOperation,
      score,
      totalTime,
      mistakes,
      accuracy,
      difficultyAchieved: selectedDifficulty,
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
  }, [gameStatus, submitted, showNamePrompt, pendingSubmission]);

  const spawnQuestion = useCallback(() => {
    const q = generateQuestion(selectedCircuit.id, selectedDifficulty, false, 0, prevDisplayRef.current, selectedOperation);
    prevDisplayRef.current = q.display;
    const wrong = generateWrongAnswers(q.answer, 2);
    setQuestionDisplay(q.display);
    setQuestionNum(prev => prev + 1);
    engineRef.current?.spawnTokens(q.answer, wrong);
  }, [selectedCircuit.id, selectedDifficulty, selectedOperation]);

  const handleCorrect = useCallback(() => {
    setCorrectCount(prev => prev + 1);
    if (state.soundEnabled) playBeep(880, 0.1);
  }, [state.soundEnabled]);

  const handleWrong = useCallback(() => {
    if (state.soundEnabled) playBeep(220, 0.2);
  }, [state.soundEnabled]);

  const handleMiss = useCallback(() => {
    if (state.soundEnabled) playBeep(220, 0.2);
  }, [state.soundEnabled]);

  const handleFinished = useCallback(() => {
    setTotalTime(Date.now() - startTimeRef.current);
    setGameStatus('finished');
  }, []);

  // Start the game
  const startGame = () => {
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

  // Initialize engine when racing starts
  useEffect(() => {
    if (gameStatus !== 'racing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;

    // Size canvas to fill the wrapper (below question bar + HUD)
    const resize = () => {
      if (!wrapper) return;
      const wrapW = wrapper.clientWidth;
      const h = Math.max(wrapper.clientHeight, 300);
      const isTablet = Math.min(window.screen.width, window.screen.height) >= 700;
      let w;
      if (wrapW > wrapper.clientHeight) {
        // Landscape window (desktop browser): letterbox to a 9:16 portrait field
        w = Math.min(wrapW, Math.round(h * 9 / 16));
      } else {
        // Portrait (phones / tablets) — unchanged
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
    }, raceLength, selectedTeam, selectedDifficulty);

    engineRef.current = engine;
    startTimeRef.current = Date.now();

    // Measure the actual bottom safe-area inset (home indicator height) by
    // reading a probe element whose padding-bottom is env(safe-area-inset-bottom).
    // The padding resolves to a real px value, then we add a small visual margin.
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
    // Keep the canvas matched to the wrapper's current size — the wrapper can
    // shrink after mount (layout settle), which would otherwise leave the
    // canvas overflowing and the bottom HUD (speedometer) clipped.
    const resizeObserver = new ResizeObserver(resize);
    if (wrapper) resizeObserver.observe(wrapper);
    return () => {
      engine.destroy();
      engineRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', measureSafeBottom);
      resizeObserver.disconnect();
    };
  }, [gameStatus, raceLength, handleCorrect, handleWrong, handleMiss, handleFinished]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const start = touchStartRef.current;
      if (!start) {
        // Tap — use left/right half
        const rect = canvas.getBoundingClientRect();
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

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
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
    () => estimateRivalRaceTimeMs(raceLength, selectedDifficulty, selectedOperation),
    [raceLength, selectedDifficulty, selectedOperation],
  );
  const playerProgress = raceLength > 0 ? Math.min(1, questionNum / raceLength) : 0;
  const rivalProg = rivalProgress(elapsedMs, rivalTargetMs);
  const position = rivalPosition(playerProgress, rivalProg);
  // Rival marker car — a livery distinct from the player's selected team
  const rivalTeamId = (TEAMS.find((t) => t.id !== selectedTeam)?.id ?? 'ferrari') as TeamId;
  // Progress line color: green when ahead of the rival marker, yellow when behind
  const progressColor = position === 1 ? '#19c37d' : '#ffcc00';

  // Setup — single page with series + track selection
  if (gameStatus === 'setup') {
    const seriesColors: Record<string, string> = { beginner: '#22c55e', easy: '#000000', medium: '#00a0dc', hard: '#e10600' };
    const levelDisplayNames: Record<string, string> = { beginner: 'KARTING', easy: 'FORMULA 3', medium: 'FORMULA 2', hard: 'FORMULA 1' };
    const displayCircuit = CIRCUIT_OPTIONS[currentCircuitIndex];
    const goToNext = () => {
      const next = (currentCircuitIndex + 1) % CIRCUIT_OPTIONS.length;
      setCurrentCircuitIndex(next);
      setSelectedCircuit(CIRCUIT_OPTIONS[next]);
    };
    const goToPrev = () => {
      const prev = (currentCircuitIndex - 1 + CIRCUIT_OPTIONS.length) % CIRCUIT_OPTIONS.length;
      setCurrentCircuitIndex(prev);
      setSelectedCircuit(CIRCUIT_OPTIONS[prev]);
    };
    const handleSwipeStart = (e: React.TouchEvent) => { swipeStartXRef.current = e.touches[0].clientX; };
    const handleSwipeEnd = (e: React.TouchEvent) => {
      if (swipeStartXRef.current === null) return;
      const diff = swipeStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? goToNext() : goToPrev(); }
      swipeStartXRef.current = null;
    };

    return (
      <div className="h-screen flex flex-col relative overflow-hidden">

        {/* Header: Back + Logo */}
        <div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: '8px' }}>
          <Link href="/game">
            <button className="absolute left-4 top-0 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors" style={{ marginTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
              <ChevronLeft size={24} />
            </button>
          </Link>
          <img src={logoImage} alt="F1 Math Racer" className="h-8 md:h-12 object-contain" />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-evenly items-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>Lane Racer</h2>
            <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Scroll to configure</div>
          </div>

          {/* Combination Lock — 3 drums in glassmorphism card */}
          {(() => {
            const drumItemH = 80;
            const getIdx = (current: number, offset: number, length: number) => ((current + offset) % length + length) % length;

            const goToNextLevel = () => { const n = (currentLevelIndex + 1) % DIFFICULTY_OPTIONS.length; setCurrentLevelIndex(n); setSelectedDifficulty(DIFFICULTY_OPTIONS[n].value); };
            const goToPrevLevel = () => { const n = (currentLevelIndex - 1 + DIFFICULTY_OPTIONS.length) % DIFFICULTY_OPTIONS.length; setCurrentLevelIndex(n); setSelectedDifficulty(DIFFICULTY_OPTIONS[n].value); };
            const goToNextTeam = () => { const n = (currentTeamIndex + 1) % TEAMS.length; setCurrentTeamIndex(n); setSelectedTeam(TEAMS[n].id); localStorage.setItem('lastSelectedTeam', TEAMS[n].id); };
            const goToPrevTeam = () => { const n = (currentTeamIndex - 1 + TEAMS.length) % TEAMS.length; setCurrentTeamIndex(n); setSelectedTeam(TEAMS[n].id); localStorage.setItem('lastSelectedTeam', TEAMS[n].id); };
            const goToNextTrack = () => { const n = (currentCircuitIndex + 1) % CIRCUIT_OPTIONS.length; setCurrentCircuitIndex(n); setSelectedCircuit(CIRCUIT_OPTIONS[n]); };
            const goToPrevTrack = () => { const n = (currentCircuitIndex - 1 + CIRCUIT_OPTIONS.length) % CIRCUIT_OPTIONS.length; setCurrentCircuitIndex(n); setSelectedCircuit(CIRCUIT_OPTIONS[n]); };

            const makeSwipeHandlers = (ref: React.MutableRefObject<number | null>, onNext: () => void, onPrev: () => void) => ({
              onTouchStart: (e: React.TouchEvent) => { ref.current = e.touches[0].clientY; },
              onTouchEnd: (e: React.TouchEvent) => {
                if (ref.current === null) return;
                const diff = ref.current - e.changedTouches[0].clientY;
                if (Math.abs(diff) > 30) { diff > 0 ? onNext() : onPrev(); }
                ref.current = null;
              },
            });

            const levelSwipe = makeSwipeHandlers(levelSwipeStartXRef, goToNextLevel, goToPrevLevel);
            const teamSwipe = makeSwipeHandlers(teamSwipeStartXRef, goToNextTeam, goToPrevTeam);
            const trackSwipe = makeSwipeHandlers(swipeStartXRef, goToNextTrack, goToPrevTrack);

            const drumStyle: React.CSSProperties = {
              height: drumItemH * 3,
              overflow: 'hidden',
              touchAction: 'none',
              position: 'relative',
            };

            const activeHighlight: React.CSSProperties = {
              position: 'absolute',
              top: drumItemH,
              left: 4,
              right: 4,
              height: drumItemH,
              border: '1.5px solid rgba(0, 210, 190, 0.6)',
              borderRadius: '10px',
              pointerEvents: 'none',
              zIndex: 1,
            };

            return (
              <div
                className="w-full max-w-sm rounded-2xl px-3 py-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div className="flex justify-center gap-2">
                  {/* LEVEL Drum */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-xs md:text-sm uppercase tracking-widest text-white/80 mb-1 font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>Level</div>
                    <div style={drumStyle} className="w-full" {...levelSwipe}>
                      <div style={activeHighlight} />
                      {[-1, 0, 1].map(offset => {
                        const idx = getIdx(currentLevelIndex, offset, DIFFICULTY_OPTIONS.length);
                        const level = DIFFICULTY_OPTIONS[idx];
                        const isActive = offset === 0;
                        return (
                          <motion.div
                            key={`level-${currentLevelIndex}-${offset}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center justify-center cursor-pointer"
                            style={{ height: drumItemH }}
                            onClick={() => { if (offset === -1) goToPrevLevel(); else if (offset === 1) goToNextLevel(); }}
                          >
                            {offset === -1 && <ChevronUp size={14} className="text-white/30 mb-1" />}
                            <span className="font-bold uppercase tracking-wider text-center" style={{
                              fontFamily: 'Oxanium, sans-serif',
                              fontSize: isActive ? '0.85rem' : '0.7rem',
                              color: isActive ? (seriesColors[level.value] || '#fff') : 'rgba(255,255,255,0.5)',
                            }}>
                              {levelDisplayNames[level.value]}
                            </span>
                            {offset === 1 && <ChevronDown size={14} className="text-white/30 mt-1" />}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

                  {/* TEAM Drum */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-xs md:text-sm uppercase tracking-widest text-white/80 mb-1 font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>Team</div>
                    <div style={drumStyle} className="w-full" {...teamSwipe}>
                      <div style={activeHighlight} />
                      {[-1, 0, 1].map(offset => {
                        const idx = getIdx(currentTeamIndex, offset, TEAMS.length);
                        const team = TEAMS[idx];
                        const isActive = offset === 0;
                        return (
                          <motion.div
                            key={`team-${currentTeamIndex}-${offset}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center justify-center cursor-pointer"
                            style={{ height: drumItemH }}
                            onClick={() => { if (offset === -1) goToPrevTeam(); else if (offset === 1) goToNextTeam(); }}
                          >
                            {offset === -1 && <ChevronUp size={14} className="text-white/30 mb-1" />}
                            <img
                              src={TEAM_PREVIEW_URLS[team.id]}
                              alt={team.name}
                              className="w-12 h-12 object-contain"
                              style={{ transform: 'rotate(90deg)' }}
                            />
                            {offset === 1 && <ChevronDown size={14} className="text-white/30 mt-1" />}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px self-stretch" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

                  {/* TRACK Drum */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-xs md:text-sm uppercase tracking-widest text-white/80 mb-1 font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>Track</div>
                    <div style={drumStyle} className="w-full" {...trackSwipe}>
                      <div style={activeHighlight} />
                      {[-1, 0, 1].map(offset => {
                        const idx = getIdx(currentCircuitIndex, offset, CIRCUIT_OPTIONS.length);
                        const circuit = CIRCUIT_OPTIONS[idx];
                        const isActive = offset === 0;
                        return (
                          <motion.div
                            key={`track-${currentCircuitIndex}-${offset}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center justify-center cursor-pointer"
                            style={{ height: drumItemH }}
                            onClick={() => { if (offset === -1) goToPrevTrack(); else if (offset === 1) goToNextTrack(); }}
                          >
                            {offset === -1 && <ChevronUp size={14} className="text-white/30 mb-1" />}
                            {CIRCUIT_MAP_IMAGES[circuit.id] && (
                              <img
                                src={CIRCUIT_MAP_IMAGES[circuit.id]}
                                alt={circuit.name}
                                className="h-8 md:h-10 object-contain"
                                style={{ filter: 'invert(1)', opacity: isActive ? 1 : 0.5, maxWidth: '60px' }}
                              />
                            )}
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider mt-1" style={{
                              fontFamily: 'Oxanium, sans-serif',
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}>
                              {circuit.name}
                            </span>
                            {offset === 1 && <ChevronDown size={14} className="text-white/30 mt-1" />}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* MATH operation row */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-xs uppercase tracking-widest text-white/80 mb-2 font-bold text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Math</div>
                  <div className="flex justify-center gap-1.5">
                    {OPERATION_OPTIONS.map((op, i) => (
                      <button
                        key={op.type}
                        onClick={() => setCurrentOpIndex(i)}
                        className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                        style={{
                          fontFamily: 'Oxanium, sans-serif',
                          maxWidth: 56,
                          color: i === currentOpIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                          border: i === currentOpIndex ? '1.5px solid rgba(0,210,190,0.6)' : '1px solid rgba(255,255,255,0.12)',
                          backgroundColor: i === currentOpIndex ? 'rgba(0,210,190,0.12)' : 'transparent',
                        }}
                        data-testid={`lr-op-${op.type}`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Start Button */}
          <div className="w-full px-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className="w-full max-w-sm md:max-w-md mx-auto py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white block"
              style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a', animation: 'pulse-green 2s infinite' }}
            >Start</motion.button>
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

  // Countdown — F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout lockViewport hideHeader>
        <div className="h-full flex items-center justify-center bg-white">
          <div className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
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
      </GameLayout>
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
    const score = calculateLaneRacerScore(totalTime, correctCount, raceLength, selectedDifficulty);
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

  // Racing screen
  return (
    <GameLayout lockViewport hideHeader>
      <div ref={containerRef} className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 50 }}>
        {/* HUD — top */}
        <div className="flex justify-between items-center px-3 py-2" style={{ background: 'black', paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'white' }}>
            Q {questionNum}/{raceLength}
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'white' }}>
            {Math.floor(elapsedMs / 60000)}:{String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}.{String(elapsedMs % 1000).padStart(3, '0')}
          </div>
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: '#22c55e' }}>
            ✓ {correctCount}
          </div>
        </div>

        {/* Question bar */}
        <div
          className="w-full text-center py-4 font-bold"
          style={{
            fontFamily: 'Oxanium, sans-serif',
            fontSize: '2.8rem',
            background: 'black',
            color: 'white',
            minHeight: '80px',
          }}
        >
          {questionDisplay || ''}
        </div>

        {/* Rival progress + position */}
        <div style={{ background: 'black', padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, height: 6, background: 'rgba(255,255,255,0.16)', borderRadius: 4 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${playerProgress * 100}%`, background: progressColor, borderRadius: 4, boxShadow: `0 0 6px ${progressColor}`, transition: 'width 0.4s ease-out' }} />
            <img src={TEAM_PREVIEW_URLS[rivalTeamId]} alt="rival" style={{ position: 'absolute', top: '50%', left: `${rivalProg * 100}%`, height: 32, transform: 'translate(-50%, -50%) rotate(90deg)', transformOrigin: 'center', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))', pointerEvents: 'none', zIndex: 1 }} />
            <img src={TEAM_PREVIEW_URLS[selectedTeam]} alt="you" style={{ position: 'absolute', top: '50%', left: `${playerProgress * 100}%`, height: 32, transform: 'translate(-50%, -50%) rotate(90deg)', transformOrigin: 'center', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))', pointerEvents: 'none', zIndex: 2, transition: 'left 0.4s ease-out' }} />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: 'Oxanium, sans-serif' }}>P{position}</span>
        </div>

        {/* Canvas */}
        <div ref={canvasWrapperRef} className="flex-1 min-h-0 overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
          />
        </div>
      </div>
    </GameLayout>
  );
}
