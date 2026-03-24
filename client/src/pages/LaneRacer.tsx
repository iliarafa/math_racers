import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, generateWrongAnswers, CIRCUITS, RACE_LENGTH, SIM_LAP_COUNTS } from "@/lib/gameLogic";
import type { Difficulty } from "@/lib/gameLogic";
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

const FLAG_IMAGES: { [id: string]: string } = {
  monza: flagItaly, spa: flagBelgium, monaco: flagMonaco, suzuka: flagJapan, silverstone: flagUK,
};
const CIRCUIT_MAP_IMAGES: { [id: string]: string } = {
  monza: circuitMonzaBlack, spa: circuitSpaBlack, monaco: circuitMonacoBlack, suzuka: circuitSuzukaBlack, silverstone: circuitSilverstoneBlack,
};

type GameStatus = 'setup' | 'countdown' | 'racing' | 'finished';

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Karting', value: 'beginner' },
  { label: 'F3', value: 'easy' },
  { label: 'F2', value: 'medium' },
  { label: 'F1', value: 'hard' },
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
  const { state } = useGameState();
  const [, navigate] = useLocation();
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [selectedCircuit, setSelectedCircuit] = useState(CIRCUIT_OPTIONS[0]);
  const [currentCircuitIndex, setCurrentCircuitIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
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

  const spawnQuestion = useCallback(() => {
    const q = generateQuestion(selectedCircuit.id, selectedDifficulty, false, 0, prevDisplayRef.current);
    prevDisplayRef.current = q.display;
    const wrong = generateWrongAnswers(q.answer, 2);
    setQuestionDisplay(q.display);
    setQuestionNum(prev => prev + 1);
    engineRef.current?.spawnTokens(q.answer, wrong);
  }, [selectedCircuit.id, selectedDifficulty]);

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

  // Initialize engine when racing starts
  useEffect(() => {
    if (gameStatus !== 'racing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;

    // Size canvas to fill the wrapper (below question bar + HUD)
    const resize = () => {
      if (!wrapper) return;
      const w = Math.min(wrapper.clientWidth, 500);
      const h = wrapper.clientHeight;
      canvas.width = w;
      canvas.height = Math.max(h, 300);
    };
    resize();

    const engine = new LaneRacerEngine(canvas, {
      onCorrect: handleCorrect,
      onWrong: handleWrong,
      onMiss: handleMiss,
      onFinished: handleFinished,
    }, raceLength, selectedTeam);

    engineRef.current = engine;
    startTimeRef.current = Date.now();
    engine.start();

    window.addEventListener('resize', resize);
    return () => {
      engine.destroy();
      engineRef.current = null;
      window.removeEventListener('resize', resize);
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
                                style={{ filter: 'invert(1)', opacity: isActive ? 1 : 0.5 }}
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

    return (
      <GameLayout trackName={selectedCircuit?.name || ""} lockViewport>
        <div className="flex-1 flex flex-col items-center justify-start max-w-xl mx-auto w-full overflow-y-auto p-4">
          <div className="rounded-xl p-6 w-full text-center space-y-6">

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Race Result</div>
              <div className="text-6xl font-bold tracking-tighter" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                {accuracy}%
              </div>
              <div className="text-xl font-medium">
                {accuracy === 100 ? 'Perfect Race' : accuracy >= 80 ? 'Podium Finish' : accuracy >= 50 ? 'Points Finish' : 'Did Not Score'}
              </div>
            </div>

            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Circuit</span>
                <span className="font-bold">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{timeStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Correct</span>
                <span className="font-bold">{correctCount} / {raceLength}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={`font-bold ${mistakes === 0 ? 'text-green-600' : 'text-red-600'}`}>{mistakes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-bold">{accuracy}%</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => { setGameStatus('setup'); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                Race Again
              </button>
              <Link href="/game">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                  Main Menu
                </button>
              </Link>
            </div>

          </div>
        </div>
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

        {/* Canvas */}
        <div ref={canvasWrapperRef} className="flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', display: 'block', width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </GameLayout>
  );
}
