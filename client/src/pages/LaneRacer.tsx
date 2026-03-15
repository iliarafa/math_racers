import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, generateWrongAnswers, CIRCUITS, RACE_LENGTH, SIM_LAP_COUNTS } from "@/lib/gameLogic";
import type { Difficulty } from "@/lib/gameLogic";
import { LaneRacerEngine } from "@/lib/laneRacerEngine";
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
  const startTimeRef = useRef(0);
  const prevDisplayRef = useRef<string | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

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
    const container = containerRef.current;

    // Size canvas
    const resize = () => {
      if (!container) return;
      const w = Math.min(container.clientWidth, 500);
      const h = container.clientHeight - 56; // minus question bar
      canvas.width = w;
      canvas.height = Math.max(h, 300);
    };
    resize();

    const engine = new LaneRacerEngine(canvas, {
      onCorrect: handleCorrect,
      onWrong: handleWrong,
      onMiss: handleMiss,
      onFinished: handleFinished,
    }, raceLength);

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
    const seriesColors: Record<string, string> = { beginner: '#006B3F', easy: '#000000', medium: '#00a0dc', hard: '#e10600' };
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
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
        {/* Logo */}
        <div className="pb-2 md:pb-4 flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
          <Link href="/"><img src={logoImage} alt="F1 Math Racer" className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity" /></Link>
        </div>

        {/* Main content — vertically centered between logo and bottom buttons */}
        <div className="flex-1 flex flex-col justify-center pb-28">
          {/* Title */}
          <div className="mb-5 md:mb-6 flex flex-col items-center px-8">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-wider text-black text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Sim Racing</h2>
          </div>

          {/* Series Carousel — horizontal row */}
          <div className="flex justify-center gap-4 md:gap-6 px-6 mb-6 md:mb-8">
            {DIFFICULTY_OPTIONS.map(d => {
              const isSelected = selectedDifficulty === d.value;
              const color = seriesColors[d.value] || '#000';
              return (
                <motion.button
                  key={d.value}
                  onClick={() => setSelectedDifficulty(d.value)}
                  whileTap={{ scale: 0.95 }}
                  className="text-center"
                >
                  <span className="block font-bold uppercase tracking-wider" style={{
                    fontFamily: 'Oxanium, sans-serif',
                    fontSize: window.innerWidth >= 768 ? '1.2rem' : '0.95rem',
                    color,
                    opacity: isSelected ? 1 : 0.35,
                    transition: 'all 0.2s ease',
                  }}>{d.label.toUpperCase()}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Track Hero Card */}
          <div className="flex items-center justify-center px-4">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={goToPrev} className="hidden md:flex p-3 transition-colors text-gray-400 hover:text-gray-900">
            <ChevronLeft className="w-12 h-12" />
          </motion.button>

          <div className="flex flex-col items-center">
            <div className="md:hidden text-center text-[10px] text-gray-400 uppercase tracking-widest pb-3">Swipe to choose track</div>
            <motion.div
              key={displayCircuit.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="w-[320px] md:w-[460px] rounded-[20px] p-4 md:p-6 flex flex-col select-none"
              style={{ backgroundColor: '#f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', touchAction: 'none' }}
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
            >
              {/* Header */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider text-gray-900" style={{ fontFamily: 'Oxanium, sans-serif' }}>{displayCircuit.name}</h2>
                {FLAG_IMAGES[displayCircuit.id] && (
                  <img src={FLAG_IMAGES[displayCircuit.id]} alt="flag" className="h-5 w-7 object-cover rounded-sm" />
                )}
              </div>

              {/* Circuit Map */}
              <div className="flex-1 flex items-center justify-center py-2 md:py-4">
                {CIRCUIT_MAP_IMAGES[displayCircuit.id] && (
                  <img src={CIRCUIT_MAP_IMAGES[displayCircuit.id]} alt={`${displayCircuit.name} circuit`} className="h-28 md:h-44 object-contain" style={{ maxWidth: '260px' }} />
                )}
              </div>

              {/* Math Type */}
              <div className="text-center mt-1">
                <div className="text-xs uppercase tracking-wider mb-1 text-gray-500">Math Type</div>
                <div className="text-base font-bold uppercase text-gray-900" style={{ fontFamily: 'Oxanium, sans-serif' }}>{displayCircuit.type}</div>
              </div>
            </motion.div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {CIRCUIT_OPTIONS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setCurrentCircuitIndex(i); setSelectedCircuit(CIRCUIT_OPTIONS[i]); }}
                  className={`w-2 h-2 rounded-full transition-all ${currentCircuitIndex === i ? 'bg-gray-900' : 'bg-gray-400'}`}
                />
              ))}
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={goToNext} className="hidden md:flex p-3 transition-colors text-gray-400 hover:text-gray-900">
            <ChevronRight className="w-12 h-12" />
          </motion.button>
        </div>
        </div>

        {/* Fixed Bottom */}
        <div className="fixed bottom-4 left-0 right-0 px-8 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#ffffff', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={startGame}
            className="w-full max-w-sm md:max-w-md py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white"
            style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a', animation: 'pulse-green 2s infinite' }}
          >Start</motion.button>
          <Link href="/game">
            <button className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>Back</button>
          </Link>
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
      <div ref={containerRef} className="h-full flex flex-col bg-white relative">
        {/* Question bar — top */}
        <div
          className="w-full text-center py-4 font-bold"
          style={{
            fontFamily: 'Oxanium, sans-serif',
            fontSize: '2.8rem',
            background: 'black',
            color: 'white',
            minHeight: '80px',
            paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          }}
        >
          {questionDisplay || ''}
        </div>

        {/* HUD overlay */}
        <div className="flex justify-between items-center px-3 py-2">
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'black' }}>
            Q {questionNum}/{raceLength}
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'black' }}>
            {Math.floor(elapsedMs / 60000)}:{String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}.{String(elapsedMs % 1000).padStart(3, '0')}
          </div>
          <div className="text-xs font-bold" style={{ fontFamily: 'Oxanium, sans-serif', color: 'black' }}>
            ✓ {correctCount}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', display: 'block', maxWidth: '500px', width: '100%' }}
          />
        </div>
      </div>
    </GameLayout>
  );
}
