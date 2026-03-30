import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { type Difficulty, DRIVERS, getHarderDifficulty } from '@/lib/gameLogic';
import { generateRatioQuestion } from '@/lib/ratioQuestions';
import { GameLayout } from '@/components/layout/GameLayout';

// ─── Constants ──────────────────────────────────────────────────────────────
const STARTING_ENERGY = 50;
const DEPLOY_DRAIN_PER_Q = 7;
const DEPLOY_WRONG_BONUS_PENALTY = 8;
const HARVEST_RECHARGE_PER_CORRECT = 7;
const DERATING_LOCKOUT_QUESTIONS = 3;
const DERATING_PROGRESS_MULTIPLIER = 0.5;
const DERATING_BOT_SPEED_MULTIPLIER = 1.5;
const DERATING_RECOVERY_ENERGY = 30;
const QUESTIONS_PER_STINT = 15;
const TOTAL_STINTS = 3;
const TOTAL_QUESTIONS = QUESTIONS_PER_STINT * TOTAL_STINTS;
const MAX_WRONG_PER_QUESTION = 4;

// Bot base times per difficulty (ms per sector advance)
const BOT_BASE_TIMES: Record<Difficulty, number> = {
  beginner: 2500,
  easy: 3500,
  medium: 4500,
  hard: 6000,
};
const BOT_RATIOS_MODIFIER = 1.20;

type GameStatus = 'setup' | 'countdown' | 'go' | 'racing' | 'stint-review' | 'finished';
type EnergyMode = 'deploy' | 'harvest' | 'derating';

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

const glassStyle = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.15)',
};

const oxanium = { fontFamily: 'Oxanium, sans-serif' };

export default function DeployHarvest() {
  // ─── Core State ─────────────────────────────────────────────────────────
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');

  // Racing state
  const [energy, setEnergy] = useState(STARTING_ENERGY);
  const [mode, setMode] = useState<EnergyMode>('deploy');
  const [playerProgress, setPlayerProgress] = useState(0);
  const [botProgress, setBotProgress] = useState(0);
  const [totalQuestionIndex, setTotalQuestionIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongOnCurrent, setWrongOnCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isDnf, setIsDnf] = useState(false);
  const [showTrackLimits, setShowTrackLimits] = useState(false);

  // Derating
  const [deratingQuestionsLeft, setDeratingQuestionsLeft] = useState(0);

  // Question
  const [currentQuestion, setCurrentQuestion] = useState(() =>
    generateRatioQuestion('beginner')
  );
  const previousDisplayRef = useRef<string | undefined>(undefined);

  // Stint tracking
  const [currentStint, setCurrentStint] = useState(1);
  const [stintQuestionNum, setStintQuestionNum] = useState(0);
  const [stintDeployCount, setStintDeployCount] = useState(0);
  const [stintHarvestCount, setStintHarvestCount] = useState(0);
  const [stintDeployCorrect, setStintDeployCorrect] = useState(0);
  const [stintHarvestCorrect, setStintHarvestCorrect] = useState(0);

  // Overall tracking
  const [totalCorrect, setTotalCorrect] = useState(0);

  // Timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceStartTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  // Countdown
  const [lightsLit, setLightsLit] = useState(0);

  // Bot timer ref
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Timer Helpers ──────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    raceStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(pausedElapsedRef.current + (Date.now() - raceStartTimeRef.current));
    }, 100);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedElapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Bot Logic ──────────────────────────────────────────────────────────
  const scheduleBotAdvance = useCallback(() => {
    const baseTime = BOT_BASE_TIMES[difficulty] * BOT_RATIOS_MODIFIER;
    const randomFactor = 0.75 + Math.random() * 0.5; // ±25%
    const isDeratingActive = mode === 'derating';
    const speedMultiplier = isDeratingActive ? (1 / DERATING_BOT_SPEED_MULTIPLIER) : 1;
    const delay = baseTime * randomFactor * speedMultiplier;

    botTimerRef.current = setTimeout(() => {
      setBotProgress(prev => {
        const next = Math.min(prev + 1, TOTAL_QUESTIONS);
        return next;
      });
    }, delay);
  }, [difficulty, mode]);

  // Chain bot advances
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    if (botProgress >= TOTAL_QUESTIONS) return;
    scheduleBotAdvance();
    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [gameStatus, botProgress, scheduleBotAdvance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Question Generation ───────────────────────────────────────────────
  const generateNextQuestion = useCallback((forMode: EnergyMode, diff: Difficulty) => {
    const isDeployMode = forMode === 'deploy';
    const effectiveDifficulty = isDeployMode ? getHarderDifficulty(diff) : diff;
    const boosted = isDeployMode && diff === 'hard';
    const q = generateRatioQuestion(effectiveDifficulty, boosted, previousDisplayRef.current);
    previousDisplayRef.current = q.display;
    return q;
  }, []);

  // ─── Start Race (from setup) ───────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setGameStatus('countdown');
    setLightsLit(0);

    let count = 0;
    const lightInterval = setInterval(() => {
      count++;
      setLightsLit(count);
      if (count >= 5) {
        clearInterval(lightInterval);
        // Random delay before GO
        const goDelay = 200 + Math.random() * 1100;
        setTimeout(() => {
          setGameStatus('go');
          setTimeout(() => {
            setGameStatus('racing');
            const q = generateNextQuestion('deploy', difficulty);
            setCurrentQuestion(q);
            startTimer();
          }, 300);
        }, goDelay);
      }
    }, 1000);
  }, [difficulty, generateNextQuestion, startTimer]);

  // ─── Handle Answer Submission ──────────────────────────────────────────
  const submitAnswer = useCallback(() => {
    if (!answer.trim()) return;
    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer)) return;

    const isCorrect = numAnswer === currentQuestion.answer;
    const currentMode = mode;

    if (isCorrect) {
      // Track stint stats
      if (currentMode === 'deploy' || (currentMode === 'derating')) {
        // Derating counts as deploy context for tracking
        if (currentMode === 'deploy') {
          setStintDeployCount(p => p + 1);
          setStintDeployCorrect(p => p + 1);
        }
      }
      if (currentMode === 'harvest') {
        setStintHarvestCount(p => p + 1);
        setStintHarvestCorrect(p => p + 1);
      }
      if (currentMode === 'derating') {
        // Derating: tracked as deploy attempt
        setStintDeployCount(p => p + 1);
      }
      setTotalCorrect(p => p + 1);

      // Progress
      let progressGain = 1;
      if (currentMode === 'deploy') progressGain = 2;
      if (currentMode === 'derating') progressGain = DERATING_PROGRESS_MULTIPLIER;

      setPlayerProgress(p => Math.min(p + progressGain, TOTAL_QUESTIONS));

      // Energy changes
      if (currentMode === 'deploy') {
        setEnergy(prev => Math.max(prev - DEPLOY_DRAIN_PER_Q, 0));
      } else if (currentMode === 'harvest') {
        setEnergy(prev => Math.min(prev + HARVEST_RECHARGE_PER_CORRECT, 100));
      }
      // derating: no energy change per correct

      // Handle derating countdown
      if (currentMode === 'derating') {
        const newLeft = deratingQuestionsLeft - 1;
        setDeratingQuestionsLeft(newLeft);
        if (newLeft <= 0) {
          setEnergy(DERATING_RECOVERY_ENERGY);
          setMode('harvest');
        }
      }

      // Derating trigger is handled by the energy effect below

      setShowTrackLimits(false);
      setWrongOnCurrent(0);

      // Advance question
      const nextTotalIdx = totalQuestionIndex + 1;
      const nextStintQ = stintQuestionNum + 1;
      setTotalQuestionIndex(nextTotalIdx);
      setStintQuestionNum(nextStintQ);

      // Check stint boundary
      if (nextStintQ >= QUESTIONS_PER_STINT && currentStint < TOTAL_STINTS) {
        // Stint review
        pauseTimer();
        // Pause bot
        if (botTimerRef.current) {
          clearTimeout(botTimerRef.current);
          botTimerRef.current = null;
        }
        setGameStatus('stint-review');
        setAnswer('');
        return;
      }

      // Check race complete
      if (nextTotalIdx >= TOTAL_QUESTIONS) {
        stopTimer();
        if (botTimerRef.current) {
          clearTimeout(botTimerRef.current);
          botTimerRef.current = null;
        }
        setGameStatus('finished');
        setAnswer('');
        return;
      }

      // Generate next question
      const nextMode = currentMode === 'derating' && deratingQuestionsLeft - 1 <= 0 ? 'harvest' : currentMode;
      const q = generateNextQuestion(nextMode, difficulty);
      setCurrentQuestion(q);
      setAnswer('');
    } else {
      // Wrong answer
      const newWrongCount = wrongOnCurrent + 1;
      setWrongOnCurrent(newWrongCount);
      setMistakes(p => p + 1);
      setShowTrackLimits(true);

      if (currentMode === 'deploy') {
        setEnergy(prev => Math.max(prev - DEPLOY_DRAIN_PER_Q - DEPLOY_WRONG_BONUS_PENALTY, 0));
      }

      // Track stint mistakes
      if (currentMode === 'deploy' || currentMode === 'derating') {
        setStintDeployCount(p => p + 1);
      }
      if (currentMode === 'harvest') {
        setStintHarvestCount(p => p + 1);
      }

      if (newWrongCount >= MAX_WRONG_PER_QUESTION) {
        // DNF
        setIsDnf(true);
        stopTimer();
        if (botTimerRef.current) {
          clearTimeout(botTimerRef.current);
          botTimerRef.current = null;
        }
        setGameStatus('finished');
        return;
      }

      setAnswer('');
    }
  }, [answer, currentQuestion, mode, totalQuestionIndex, stintQuestionNum, currentStint, wrongOnCurrent, deratingQuestionsLeft, difficulty, generateNextQuestion, pauseTimer, stopTimer]);

  // ─── Energy depletion check (derating trigger) ─────────────────────────
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    if (energy <= 0 && mode !== 'derating') {
      setMode('derating');
      setDeratingQuestionsLeft(DERATING_LOCKOUT_QUESTIONS);
    }
  }, [energy, mode, gameStatus]);

  // ─── Toggle Mode ───────────────────────────────────────────────────────
  const toggleMode = useCallback(() => {
    if (mode === 'derating') return;
    setMode(prev => prev === 'deploy' ? 'harvest' : 'deploy');
    // Regenerate question for new mode
    const newMode = mode === 'deploy' ? 'harvest' : 'deploy';
    const q = generateNextQuestion(newMode, difficulty);
    setCurrentQuestion(q);
    setAnswer('');
    setWrongOnCurrent(0);
    setShowTrackLimits(false);
  }, [mode, difficulty, generateNextQuestion]);

  // ─── Keyboard Input ────────────────────────────────────────────────────
  useEffect(() => {
    if (gameStatus !== 'racing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setAnswer(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setAnswer(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        submitAnswer();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, submitAnswer, toggleMode]);

  // ─── Continue from Stint Review ────────────────────────────────────────
  const continueFromStintReview = useCallback(() => {
    setCurrentStint(prev => prev + 1);
    setStintQuestionNum(0);
    setStintDeployCount(0);
    setStintHarvestCount(0);
    setStintDeployCorrect(0);
    setStintHarvestCorrect(0);
    setWrongOnCurrent(0);
    setShowTrackLimits(false);

    const nextMode = mode === 'derating' ? 'derating' : mode;
    const q = generateNextQuestion(nextMode, difficulty);
    setCurrentQuestion(q);
    setAnswer('');
    setGameStatus('racing');
    startTimer();
  }, [mode, difficulty, generateNextQuestion, startTimer]);

  // ─── Reset Game ────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    setGameStatus('setup');
    setEnergy(STARTING_ENERGY);
    setMode('deploy');
    setPlayerProgress(0);
    setBotProgress(0);
    setTotalQuestionIndex(0);
    setMistakes(0);
    setWrongOnCurrent(0);
    setAnswer('');
    setIsDnf(false);
    setShowTrackLimits(false);
    setDeratingQuestionsLeft(0);
    setCurrentStint(1);
    setStintQuestionNum(0);
    setStintDeployCount(0);
    setStintHarvestCount(0);
    setStintDeployCorrect(0);
    setStintHarvestCorrect(0);
    setTotalCorrect(0);
    setElapsedMs(0);
    pausedElapsedRef.current = 0;
    previousDisplayRef.current = undefined;
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const accuracy = totalQuestionIndex > 0
    ? Math.round((totalCorrect / totalQuestionIndex) * 100)
    : 0;

  const playerWon = !isDnf && Math.floor(playerProgress) >= Math.floor(botProgress);

  // Keypad handler
  const handleKeypad = (key: string) => {
    if (key === 'DEL') {
      setAnswer(prev => prev.slice(0, -1));
    } else if (key === '✓') {
      submitAnswer();
    } else {
      setAnswer(prev => prev + key);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Setup Screen ──────────────────────────────────────────────────────
  if (gameStatus === 'setup') {
    return (
      <GameLayout backHref="/hub" trackName="DEPLOY/HARVEST" darkBackground>
        <div className="flex flex-col items-center gap-6 py-6 px-4 max-w-lg mx-auto w-full" style={oxanium}>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-wider">DEPLOY/HARVEST</h1>
            <p className="text-white/60 text-sm mt-1">An Introduction to Ratios</p>
          </div>

          {/* Lore Card */}
          <div className="rounded-xl p-4 w-full" style={glassStyle}>
            <p className="text-white/80 text-sm leading-relaxed">
              The 2026 regulations bring a new energy crisis to the grid. Drivers must balance
              <span className="text-green-400 font-semibold"> DEPLOY </span>
              mode for raw speed against
              <span className="text-blue-400 font-semibold"> HARVEST </span>
              mode to recharge. Push too hard and you'll hit
              <span className="text-red-400 font-semibold"> DERATING </span>
              — forced to crawl while your rivals fly past. Master the ratio of deploy to harvest and bring home the win.
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="w-full">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2 text-center">Select Series</p>
            <div className="grid grid-cols-4 gap-2">
              {DRIVERS.map(d => (
                <motion.button
                  key={d.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDifficulty(d.difficulty)}
                  className={`py-3 px-2 rounded-lg text-sm font-bold transition-all ${
                    difficulty === d.difficulty
                      ? 'bg-white text-black ring-2 ring-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  style={oxanium}
                >
                  {d.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Race Info */}
          <div className="rounded-xl p-3 w-full text-center" style={glassStyle}>
            <p className="text-white/60 text-xs tracking-widest">
              3 Stints &middot; 45 Questions &middot; 50% Start Energy
            </p>
          </div>

          {/* Start Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startCountdown}
            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg tracking-widest transition-colors"
            style={oxanium}
          >
            LIGHTS OUT
          </motion.button>
        </div>
      </GameLayout>
    );
  }

  // ─── Countdown / Go ────────────────────────────────────────────────────
  if (gameStatus === 'countdown' || gameStatus === 'go') {
    return (
      <GameLayout hideHeader darkBackground lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-8" style={oxanium}>
          {/* Five lights */}
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-10 h-10 md:w-14 md:h-14 rounded-full transition-colors duration-200 ${
                  gameStatus === 'go'
                    ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                    : i <= lightsLit
                      ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <AnimatePresence>
            {gameStatus === 'go' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-5xl font-black text-green-400 tracking-widest"
              >
                GO!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GameLayout>
    );
  }

  // ─── Stint Review Screen ───────────────────────────────────────────────
  if (gameStatus === 'stint-review') {
    const deployCount = stintDeployCount || 0;
    const harvestCount = stintHarvestCount || 0;
    const divisor = gcd(deployCount, harvestCount) || 1;
    const simpleDeploy = deployCount / divisor;
    const simpleHarvest = harvestCount / divisor;

    const deployAccuracy = stintDeployCount > 0
      ? Math.round((stintDeployCorrect / stintDeployCount) * 100)
      : 0;
    const harvestAccuracy = stintHarvestCount > 0
      ? Math.round((stintHarvestCorrect / stintHarvestCount) * 100)
      : 0;

    const overallStintAccuracy = (stintDeployCount + stintHarvestCount) > 0
      ? ((stintDeployCorrect + stintHarvestCorrect) / (stintDeployCount + stintHarvestCount)) * 100
      : 0;

    let optimalRatio = '1 : 2';
    if (overallStintAccuracy > 85) optimalRatio = '3 : 1';
    else if (overallStintAccuracy > 70) optimalRatio = '2 : 1';

    let insight = "Try to deploy more when you're on a streak of correct answers.";
    if (overallStintAccuracy > 85 && deployCount > harvestCount) {
      insight = "Great accuracy! You could push deploy even harder next stint.";
    } else if (overallStintAccuracy < 60) {
      insight = "Switch to harvest mode when questions feel tough — build up energy for later.";
    } else if (harvestCount > deployCount * 2) {
      insight = "You're harvesting a lot. Try deploying more to gain ground on the bot.";
    } else if (deployCount > harvestCount * 3) {
      insight = "Heavy deploy strategy — watch your energy, a derating could cost the race.";
    }

    return (
      <GameLayout hideHeader darkBackground lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4" style={oxanium}>
          <h2 className="text-2xl font-bold text-white tracking-widest">Stint {currentStint} Review</h2>

          {/* Ratio Display */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-5xl font-black text-green-400">{deployCount}</div>
              <div className="text-xs text-green-400/70 uppercase tracking-widest mt-1">Deploy</div>
            </div>
            <div className="text-3xl font-bold text-white/40">:</div>
            <div className="text-center">
              <div className="text-5xl font-black text-blue-400">{harvestCount}</div>
              <div className="text-xs text-blue-400/70 uppercase tracking-widest mt-1">Harvest</div>
            </div>
          </div>

          {(deployCount > 0 || harvestCount > 0) && (
            <p className="text-white/40 text-sm">
              Simplified: {simpleDeploy} : {simpleHarvest}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            <div className="rounded-lg p-3 text-center" style={glassStyle}>
              <div className="text-lg font-bold text-green-400">{deployAccuracy}%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Deploy Acc</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={glassStyle}>
              <div className="text-lg font-bold text-blue-400">{harvestAccuracy}%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Harvest Acc</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={glassStyle}>
              <div className="text-lg font-bold text-yellow-400">{optimalRatio}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Optimal</div>
            </div>
          </div>

          {/* Insight */}
          <div className="rounded-xl p-4 w-full max-w-sm" style={glassStyle}>
            <p className="text-white/70 text-sm text-center leading-relaxed">{insight}</p>
          </div>

          {/* Status Line */}
          <p className="text-white/30 text-xs tracking-widest">
            Energy: {Math.round(energy)}% &middot; Progress: {Math.floor(playerProgress)}/{TOTAL_QUESTIONS}
          </p>

          {/* Continue Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={continueFromStintReview}
            className="w-full max-w-sm py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg tracking-widest transition-colors"
            style={oxanium}
          >
            STINT {currentStint + 1} — LIGHTS OUT
          </motion.button>
        </div>
      </GameLayout>
    );
  }

  // ─── Results Screen ────────────────────────────────────────────────────
  if (gameStatus === 'finished') {
    const position = isDnf ? 'DNF' : playerWon ? 'P1' : 'P2';
    const posColor = isDnf ? 'text-red-500' : playerWon ? 'text-green-400' : 'text-yellow-400';

    return (
      <GameLayout hideHeader darkBackground lockViewport>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4" style={oxanium}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`text-7xl font-black ${posColor}`}
          >
            {position}
          </motion.div>

          {isDnf && (
            <p className="text-red-400/70 text-sm tracking-widest">MECHANICAL FAILURE</p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="rounded-lg p-4 text-center" style={glassStyle}>
              <div className="text-xl font-bold text-white">{formatTime(elapsedMs)}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Time</div>
            </div>
            <div className="rounded-lg p-4 text-center" style={glassStyle}>
              <div className="text-xl font-bold text-white">{accuracy}%</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Accuracy</div>
            </div>
            <div className="rounded-lg p-4 text-center" style={glassStyle}>
              <div className="text-xl font-bold text-red-400">{mistakes}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Mistakes</div>
            </div>
            <div className="rounded-lg p-4 text-center" style={glassStyle}>
              <div className="text-xl font-bold text-white">{Math.floor(playerProgress)}/{TOTAL_QUESTIONS}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest">Progress</div>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold tracking-widest transition-colors"
              style={oxanium}
            >
              RACE AGAIN
            </motion.button>
            <Link href="/hub" className="flex-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest transition-colors"
                style={oxanium}
              >
                MAIN MENU
              </motion.button>
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ─── Racing Screen ─────────────────────────────────────────────────────
  const modeBgClass = mode === 'deploy' ? 'bg-green-600' : mode === 'harvest' ? 'bg-blue-600' : 'bg-red-600';
  const modeLabel = mode === 'deploy' ? 'DEPLOYING' : mode === 'harvest' ? 'HARVESTING' : 'DERATING';

  return (
    <GameLayout hideHeader darkBackground lockViewport>
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ ...oxanium, paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 text-xs shrink-0">
          <div className="text-white/60 font-mono">{formatTime(elapsedMs)}</div>
          <div className="text-white/80 font-bold tracking-widest">
            Stint {currentStint}/{TOTAL_STINTS} &middot; Q{stintQuestionNum + 1}/{QUESTIONS_PER_STINT}
          </div>
          <div className="text-red-400 font-mono">{mistakes} ✕</div>
        </div>

        {/* Progress Bars */}
        <div className="px-4 py-2 space-y-1.5 shrink-0">
          {/* Bot */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-8 shrink-0">BOT</span>
            <div className="flex-1 flex gap-px">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                <div
                  key={`bot-${i}`}
                  className={`h-2 flex-1 rounded-[1px] transition-colors duration-150 ${
                    i < botProgress ? 'bg-red-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
          {/* Player */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-8 shrink-0">YOU</span>
            <div className="flex-1 flex gap-px">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                <div
                  key={`player-${i}`}
                  className={`h-2 flex-1 rounded-[1px] transition-colors duration-150 ${
                    i < Math.floor(playerProgress)
                      ? mode === 'deploy' ? 'bg-green-500'
                        : mode === 'harvest' ? 'bg-blue-500'
                        : 'bg-red-500'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Energy Bar */}
        <div className="px-4 py-1 shrink-0">
          <div className="w-full h-6 rounded-full bg-white/10 overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full ${
                mode === 'deploy' ? 'bg-green-500' : mode === 'harvest' ? 'bg-blue-500' : 'bg-red-500'
              }`}
              initial={false}
              animate={{ width: `${Math.max(energy, 0)}%` }}
              transition={{ duration: 0.3 }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
              {Math.round(energy)}%
            </span>
          </div>
        </div>

        {/* Mode Indicator */}
        <div className="text-center py-1 shrink-0">
          <span className={`text-sm font-bold tracking-widest ${
            mode === 'deploy' ? 'text-green-400' : mode === 'harvest' ? 'text-blue-400' : 'text-red-400'
          }`}>
            {modeLabel}
            {mode === 'derating' && (
              <span className="text-red-400/60 text-xs ml-2">({deratingQuestionsLeft}Q left)</span>
            )}
          </span>
        </div>

        {/* Question Display */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-0">
          {/* Track Limits Warning */}
          <AnimatePresence>
            {showTrackLimits && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-600/90 border border-red-400 rounded-lg px-4 py-2 text-center"
              >
                <span className="text-white text-xs font-bold tracking-widest">
                  TRACK LIMITS — {wrongOnCurrent}/{MAX_WRONG_PER_QUESTION}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question */}
          <div className="rounded-xl p-5 w-full max-w-sm text-center" style={glassStyle}>
            <p className="text-white text-base md:text-lg leading-relaxed">{currentQuestion.display}</p>
          </div>

          {/* Answer Input */}
          <div className="w-full max-w-sm">
            <div className="flex items-center rounded-lg bg-white/10 border border-white/20 px-4 py-3">
              <span className="text-white/40 text-sm mr-2">=</span>
              <span className="text-white text-xl font-bold flex-1">{answer || <span className="text-white/20">?</span>}</span>
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <div className="px-4 py-2 shrink-0">
          <motion.button
            whileTap={{ scale: mode === 'derating' ? 1 : 0.95 }}
            onClick={toggleMode}
            disabled={mode === 'derating'}
            className={`w-full py-3 rounded-xl font-bold text-white tracking-widest text-sm transition-colors ${
              mode === 'derating'
                ? 'bg-red-900/50 text-red-400/50 cursor-not-allowed'
                : mode === 'deploy'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-green-600 hover:bg-green-500'
            }`}
            style={oxanium}
          >
            {mode === 'derating'
              ? 'DERATING — LOCKED'
              : mode === 'deploy'
                ? 'SWITCH TO HARVEST'
                : 'SWITCH TO DEPLOY'}
          </motion.button>
        </div>

        {/* Number Keypad */}
        <div className="px-4 pb-4 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'DEL', '0', '✓'].map(key => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleKeypad(key)}
                className={`py-3 rounded-lg text-lg font-bold transition-colors ${
                  key === '✓'
                    ? `${modeBgClass} text-white`
                    : key === 'DEL'
                      ? 'bg-white/5 text-red-400 hover:bg-white/10'
                      : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                style={oxanium}
              >
                {key}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
