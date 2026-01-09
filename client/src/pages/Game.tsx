import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { TrackProgress } from "@/components/TrackProgress";
import { useGameState, generateQuestion, Question, CIRCUITS, RACE_LENGTH, DRIVERS_2025, Circuit, DRIVERS, Driver } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Home, Timer, Delete, Pause, Play } from "lucide-react";

let audioContext: AudioContext | null = null;
let audioInitialized = false;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const initAudio = () => {
  if (audioInitialized) return;
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.001);
    audioInitialized = true;
  } catch (e) {
    // Silent fail
  }
};

const playBeep = (frequency: number = 800, duration: number = 150) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // Silent fail for audio issues
  }
};

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak, incrementLaps, addCareerPoints, incrementRacesWon, updatePersonalBest, recordLapTime } = useGameState();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [gameStatus, setGameStatus] = useState<'driver_select' | 'selecting' | 'countdown' | 'go' | 'racing' | 'finished' | 'crashed'>('driver_select');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownLight, setCountdownLight] = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState<{ text: string; color: string }>({ text: '', color: 'red' });
  const [mistakeLog, setMistakeLog] = useState<Array<{ question: string; yourAnswer: number; correctAnswer: number }>>([]);
  const [showMistakeReview, setShowMistakeReview] = useState(false);
  const penaltyTimeRef = useRef(0);
  const raceStartTimeRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(state.soundEnabled);
  
  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  // Countdown sequence: 5 lights, then immediately start racing
  useEffect(() => {
    if (gameStatus === 'countdown' && selectedCircuit && selectedDriver) {
      let lightCount = 0;
      const interval = setInterval(() => {
        if (lightCount >= 5) {
          clearInterval(interval);
          if (soundEnabledRef.current) {
            playBeep(1200, 200);
          }
          setQuestion(generateQuestion(selectedCircuit.id, selectedDriver.difficulty));
          setGameStatus('racing');
          return;
        }
        if (soundEnabledRef.current) {
          playBeep(800, 150);
        }
        lightCount++;
        setCountdownLight(lightCount);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStatus, selectedCircuit, selectedDriver]);


  // Timer Logic - only runs during racing and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === 'racing' && !isPaused) {
      if (raceStartTimeRef.current === null) {
        raceStartTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        const baseTime = Date.now() - raceStartTimeRef.current!;
        setElapsedTime(baseTime + penaltyTimeRef.current);
      }, 10);
    } else if (isPaused && raceStartTimeRef.current !== null) {
      // When pausing, adjust the start time to account for paused duration
      const pausedDuration = Date.now() - raceStartTimeRef.current - (elapsedTime - penaltyTimeRef.current);
      if (pausedDuration > 0) {
        raceStartTimeRef.current = raceStartTimeRef.current + pausedDuration;
      }
    }
    return () => clearInterval(interval);
  }, [gameStatus, isPaused]);

  // Guard: redirect to proper selection if missing driver/circuit
  useEffect(() => {
    if (!selectedDriver && gameStatus !== 'driver_select') {
      setGameStatus('driver_select');
    } else if (!selectedCircuit && (gameStatus === 'countdown' || gameStatus === 'go' || gameStatus === 'racing' || gameStatus === 'finished' || gameStatus === 'crashed')) {
      setGameStatus('selecting');
    }
  }, [selectedDriver, selectedCircuit, gameStatus]);

  // Keyboard input for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'racing' && gameStatus !== 'go') return;
      if (feedback !== 'idle') return;
      if (isPaused) return;

      if (e.key >= '0' && e.key <= '9') {
        setAnswer(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setAnswer(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, feedback, question, answer, selectedCircuit, progress, mistakes, isPaused]);

  const handleDriverSelect = (driver: Driver) => {
    initAudio();
    setSelectedDriver(driver);
    setGameStatus('selecting');
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleCircuitSelect = (circuit: Circuit) => {
    initAudio();
    setSelectedCircuit(circuit);
    setGameStatus('countdown');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question || feedback !== 'idle' || gameStatus !== 'racing' || !selectedCircuit) return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    if (val === question.answer) {
      setFeedback('correct');
      const isDrsActive = selectedCircuit.drsZones.includes(progress);
      const baseCoins = isDrsActive ? 20 : 10;
      addCoins(baseCoins);
      incrementStreak();
      incrementLaps();
      const difficultyPoints = selectedDriver?.difficulty === 'hard' ? 3 : selectedDriver?.difficulty === 'medium' ? 2 : 1;
      const totalPoints = isDrsActive ? difficultyPoints * 2 : difficultyPoints;
      addCareerPoints(totalPoints);

      const newProgress = progress + 1;
      setProgress(newProgress);

      if (newProgress >= RACE_LENGTH) {
        if (isPracticeMode) {
          // In practice mode, reset and continue
          setProgress(0);
          setMistakes(0);
          setElapsedTime(0);
          penaltyTimeRef.current = 0;
          raceStartTimeRef.current = Date.now();
        } else {
          finishRace(mistakes);
        }
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(selectedCircuit.id, selectedDriver?.difficulty || 'easy'));
        }, 600);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setFeedback('incorrect');
      resetStreak();

      // Log the mistake for review
      setMistakeLog(prev => [...prev, {
        question: question.display,
        yourAnswer: val,
        correctAnswer: question.answer
      }]);

      if (isPracticeMode) {
        // Practice mode: show mistake but no penalties or crash
        setPenaltyMessage({ text: 'TRY AGAIN', color: 'yellow' });
        setShowPenalty(true);
        setTimeout(() => setShowPenalty(false), 1500);
      } else {
        // Race mode: apply penalties
        setShowPenalty(true);

        if (newMistakes === 1) {
          setPenaltyMessage({ text: 'TRACK LIMITS', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes === 2) {
          setPenaltyMessage({ text: 'TRACK LIMITS WARNING', color: 'yellow' });
          penaltyTimeRef.current += 2000;
          setElapsedTime(prev => prev + 2000);
        } else if (newMistakes <= 5) {
          setPenaltyMessage({ text: '+5 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += 5000;
          setElapsedTime(prev => prev + 5000);
        } else if (newMistakes <= 10) {
          setPenaltyMessage({ text: '+10 SECOND PENALTY', color: 'red' });
          penaltyTimeRef.current += 10000;
          setElapsedTime(prev => prev + 10000);
        } else if (newMistakes >= 11) {
          setPenaltyMessage({ text: 'YOU CRASHED!', color: 'red' });
          setFinalMistakes(newMistakes);
          setGameStatus('crashed');
          return;
        }

        setTimeout(() => setShowPenalty(false), 1500);
      }

      const newProgress = progress + 1;
      setProgress(newProgress);

      if (newProgress >= RACE_LENGTH) {
        if (isPracticeMode) {
          // In practice mode, reset and continue
          setProgress(0);
          setMistakes(0);
          setElapsedTime(0);
          penaltyTimeRef.current = 0;
          raceStartTimeRef.current = Date.now();
        } else {
          finishRace(newMistakes);
        }
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(selectedCircuit.id, selectedDriver?.difficulty || 'easy'));
        }, isPracticeMode ? 600 : 800);
      }
    }
  };

  const finishRace = (mistakeCount: number) => {
    setFinalMistakes(mistakeCount);
    setFeedback('idle');
    setGameStatus('finished');
    if (mistakeCount === 0) {
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
       incrementRacesWon();
    }
    // Update personal best time and record session lap time (only in race mode, not practice)
    if (!isPracticeMode && selectedCircuit) {
      updatePersonalBest(selectedCircuit.id, elapsedTime);
      recordLapTime(elapsedTime);
    }
  };

  const getRaceResult = () => {
    let position: number;
    if (finalMistakes === 0) {
      position = 1;
    } else if (finalMistakes <= 2) {
      position = 2;
    } else {
      position = finalMistakes;
    }
    if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
    return { position, driverName: DRIVERS_2025[position - 1] };
  };

  const restartRace = () => {
    setProgress(0);
    setMistakes(0);
    setFinalMistakes(0);
    setShowPenalty(false);
    setElapsedTime(0);
    setCountdownLight(0);
    setGameStatus('driver_select');
    setSelectedDriver(null);
    setSelectedCircuit(null);
    setIsPracticeMode(false);
    setIsPaused(false);
    setFeedback('idle');
    setAnswer("");
    setQuestion(null);
    setMistakeLog([]);
    setShowMistakeReview(false);
    resetStreak();
    penaltyTimeRef.current = 0;
    raceStartTimeRef.current = null;
    setPenaltyMessage({ text: '', color: 'red' });
  };

  // Driver Selection Screen
  if (gameStatus === 'driver_select') {
    return (
      <GameLayout coins={state.coins} trackName="Select Driver">
        <div className="flex-1 flex flex-col py-6 px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1">Choose Your Level</h2>
          </div>
          
          <div className="flex flex-col gap-2 max-w-md mx-auto w-full">
            {DRIVERS.map((driver) => (
              <motion.button
                key={driver.id}
                onClick={() => handleDriverSelect(driver)}
                whileHover={{ opacity: 0.7 }}
                whileTap={{ scale: 0.98 }}
                className="py-3 transition-opacity text-center"
                data-testid={`driver-${driver.id}`}
              >
                <span className="font-bold text-lg">{driver.name}</span>
              </motion.button>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/">
              <button className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                ← Back to Menu
              </button>
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Circuit Selection Screen
  if (gameStatus === 'selecting') {
    return (
      <GameLayout coins={state.coins} trackName="Select Circuit">
        <div className="flex-1 flex flex-col py-6 px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1">Choose Your Circuit</h2>
            <p className="text-muted-foreground">Each track tests a different math skill</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setIsPracticeMode(false)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                !isPracticeMode ? "bg-red-600 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              data-testid="button-race-mode"
            >
              RACE
            </button>
            <button
              onClick={() => setIsPracticeMode(true)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                isPracticeMode ? "bg-green-600 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              data-testid="button-practice-mode"
            >
              PRACTICE
            </button>
          </div>

          <div className="flex flex-col gap-2 max-w-md mx-auto w-full">
            {CIRCUITS.map((circuit) => {
              const personalBest = state.personalBests[circuit.id];
              return (
                <motion.button
                  key={circuit.id}
                  onClick={() => handleCircuitSelect(circuit)}
                  whileHover={{ opacity: 0.7 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-5 transition-opacity text-center"
                  data-testid={`circuit-${circuit.id}`}
                >
                  <div>
                    <span className="font-bold text-xl">{circuit.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{circuit.type}</span>
                  </div>
                  {personalBest && (
                    <div className="text-xs text-green-500 mt-1">
                      Best: {formatTime(personalBest)}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Link href="/">
              <button className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                ← Back to Menu
              </button>
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Countdown screen with F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center gap-12">
          
          {/* F1 Starting Lights */}
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((light) => (
              <motion.div
                key={light}
                initial={{ opacity: 0.3 }}
                animate={{ 
                  opacity: countdownLight >= light ? 1 : 0.3,
                  scale: countdownLight >= light ? 1 : 0.95
                }}
                className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-full border-4 transition-colors duration-200",
                  countdownLight >= light 
                    ? "bg-red-600 border-red-700 shadow-[0_0_30px_rgba(220,38,38,0.6)]" 
                    : "bg-neutral-200 border-neutral-300"
                )}
              />
            ))}
          </div>

        </div>
      </GameLayout>
    );
  }

  // GO state - lights out, green indicator
  if (gameStatus === 'go') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          
          {/* Green GO indicator */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex gap-4"
          >
            {[1, 2, 3, 4, 5].map((light) => (
              <div
                key={light}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 bg-green-500 border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
              />
            ))}
          </motion.div>

          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold text-green-600"
          >
            GO!
          </motion.div>

          {/* Stopwatch preview in green */}
          <div className="flex items-center gap-2 text-2xl font-mono font-medium text-green-600 bg-green-100 px-6 py-2 rounded-full">
            <Timer className="w-5 h-5" />
            {formatTime(0)}
          </div>

        </div>
      </GameLayout>
    );
  }

  if (gameStatus === 'crashed') {
    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-12">
          <div className="bg-card border border-red-500 rounded-xl p-8 w-full text-center space-y-8 shadow-sm">
            
            <div className="space-y-2">
               <div className="text-sm font-medium text-red-600 uppercase tracking-widest">Race Over</div>
               <div className="text-6xl font-bold tracking-tighter text-red-600">DNF</div>
               <div className="text-xl font-medium text-red-600">Car Retired</div>
            </div>

            <div className="py-6 border-y border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Circuit</span>
                <span className="font-bold">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Laps Completed</span>
                <span className="font-bold">{progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Time Before Crash</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className="font-bold text-red-600">{finalMistakes}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button onClick={restartRace} className="w-full bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2" data-testid="button-try-again">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <Link href="/garage">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2" data-testid="button-return-garage">
                  <Home className="w-4 h-4" /> Return to Garage
                </button>
              </Link>
            </div>

          </div>
        </div>
      </GameLayout>
    );
  }

  if (gameStatus === 'finished') {
    const { position, driverName } = getRaceResult();
    const isWinner = position === 1;
    const previousBest = selectedCircuit ? state.personalBests[selectedCircuit.id] : null;
    const isNewBest = previousBest ? elapsedTime < previousBest : true;

    return (
      <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-12">
          <div className="bg-card border border-border rounded-xl p-8 w-full text-center space-y-8 shadow-sm">

            <div className="space-y-2">
               <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Race Result</div>
               <div className="text-8xl font-bold tracking-tighter">P{position}</div>
               <div className="text-xl font-medium">{isWinner ? "World Champion" : "Finish Position"}</div>
               {isNewBest && !isPracticeMode && (
                 <div className="text-sm font-bold text-green-500 animate-pulse">
                   🏆 NEW PERSONAL BEST!
                 </div>
               )}
            </div>

            <div className="py-6 border-y border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Driver Match</span>
                <span className="font-bold">{driverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Circuit</span>
                <span className="font-bold">{selectedCircuit?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              {previousBest && !isNewBest && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Personal Best</span>
                  <span className="font-bold font-mono text-green-500">{formatTime(previousBest)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", finalMistakes === 0 ? "text-green-600" : "text-red-600")}>{finalMistakes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-bold">{Math.round(((RACE_LENGTH - finalMistakes) / RACE_LENGTH) * 100)}%</span>
              </div>
            </div>

            <div className="grid gap-3">
              {mistakeLog.length > 0 && (
                <button
                  onClick={() => setShowMistakeReview(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  data-testid="button-review-mistakes"
                >
                  <X className="w-4 h-4" /> Review {mistakeLog.length} Mistake{mistakeLog.length > 1 ? 's' : ''}
                </button>
              )}
              <button onClick={restartRace} className="w-full bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2" data-testid="button-race-again">
                <RotateCcw className="w-4 h-4" /> Race Again
              </button>
              <Link href="/">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2" data-testid="button-main-menu">
                  <Home className="w-4 h-4" /> Main Menu
                </button>
              </Link>
            </div>

          </div>

          {/* Mistake Review Modal */}
          {showMistakeReview && (
            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Mistake Review</h2>
                  <button
                    onClick={() => setShowMistakeReview(false)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                    data-testid="button-close-review"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3">
                  {mistakeLog.map((mistake, index) => (
                    <div key={index} className="bg-secondary/30 border border-border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="text-lg font-bold">{mistake.question}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Your Answer:</span>
                              <span className="ml-2 font-bold text-red-500">{mistake.yourAnswer}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Correct Answer:</span>
                              <span className="ml-2 font-bold text-green-500">{mistake.correctAnswer}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowMistakeReview(false)}
                  className="w-full mt-6 bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all"
                  data-testid="button-close-review-bottom"
                >
                  Close Review
                </button>
              </div>
            </div>
          )}
        </div>
      </GameLayout>
    );
  }

  // Racing phase
  return (
    <GameLayout coins={state.coins} trackName={selectedCircuit?.name || ""}>
      <div className="flex-1 flex flex-col w-full overflow-hidden relative">

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="text-4xl font-bold">PAUSED</div>
              <button
                onClick={() => setIsPaused(false)}
                className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-green-500 transition-all flex items-center gap-2 mx-auto"
                data-testid="button-resume"
              >
                <Play className="w-6 h-6" />
                Resume
              </button>
              <button
                onClick={restartRace}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center gap-2 mx-auto"
                data-testid="button-quit-race"
              >
                <Home className="w-4 h-4" />
                Quit Race
              </button>
            </div>
          </div>
        )}

        {/* Track Limits Flash Indicator */}
        <AnimatePresence>
          {showPenalty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40"
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.3, repeat: 3 }}
                className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm"
              >
                TRACK LIMITS
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode badge and controls */}
        <div className="flex justify-between items-center text-sm text-muted-foreground font-medium px-4 py-2">
          <div className="flex items-center gap-2">
            {isPracticeMode ? (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">PRACTICE</span>
            ) : (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">RACE</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isPracticeMode && (
              <button
                onClick={() => setIsPaused(true)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                data-testid="button-pause"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 min-h-0">
          
          {/* Stopwatch */}
          <div className="flex items-center gap-2 text-xl font-mono font-medium text-primary">
            <Timer className="w-5 h-5" />
            {formatTime(elapsedTime)}
          </div>

          {/* Question Display */}
          <div className="text-5xl font-bold tracking-tight text-center">
            {question?.display}
          </div>

          {/* Answer Display */}
          <div
            className={cn(
              "text-4xl font-bold h-14 flex items-center justify-center min-w-[100px]",
              feedback === 'idle' && "text-muted-foreground/50",
              feedback === 'correct' && "text-green-600",
              feedback === 'incorrect' && "text-red-600"
            )}
            data-testid="display-answer"
          >
            {answer || "0"}
          </div>

          {/* Keypad - wide and centered */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-md">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => !isPaused && feedback === 'idle' && setAnswer(prev => prev + num.toString())}
                disabled={isPaused}
                className="aspect-square rounded-xl bg-secondary text-secondary-foreground text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50"
                data-testid={`keypad-${num}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => !isPaused && feedback === 'idle' && setAnswer(prev => prev.slice(0, -1))}
              disabled={isPaused}
              className="aspect-square rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50"
              data-testid="keypad-delete"
            >
              <Delete className="w-8 h-8" />
            </button>
            <button
              type="button"
              onClick={() => !isPaused && feedback === 'idle' && setAnswer(prev => prev + '0')}
              disabled={isPaused}
              className="aspect-square rounded-xl bg-secondary text-secondary-foreground text-4xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50"
              data-testid="keypad-0"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!answer || feedback !== 'idle' || isPaused}
              className={cn(
                "aspect-square rounded-xl text-xl font-bold transition-colors active:scale-95 flex items-center justify-center",
                answer && feedback === 'idle' && !isPaused
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-muted text-muted-foreground"
              )}
              data-testid="keypad-submit"
            >
              <Check className="w-8 h-8" />
            </button>
          </div>

          {/* Minimal Feedback */}
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'correct' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4" /> Correct
                </motion.div>
              )}
              {feedback === 'incorrect' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }} 
                  className={cn(
                    "font-medium flex items-center gap-2 text-sm",
                    penaltyMessage.color === 'yellow' ? "text-yellow-600" : "text-red-600"
                  )}
                >
                  <X className="w-4 h-4" /> {penaltyMessage.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Horizontal Progress Bar at Bottom */}
        <div className="px-4 pb-4 pt-2">
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            {/* Progress segments */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: RACE_LENGTH }).map((_, i) => {
                const isCompleted = i < progress;
                const isCurrent = i === progress;
                const isDRS = selectedCircuit?.drsZones?.includes(i + 1);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 border-r border-background/20 last:border-r-0 transition-colors",
                      isCompleted && isDRS && "bg-yellow-500",
                      isCompleted && !isDRS && "bg-blue-500",
                      isCurrent && "bg-blue-400/50",
                      !isCompleted && !isCurrent && "bg-transparent"
                    )}
                  />
                );
              })}
            </div>
            
            {/* Car indicator */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 z-10"
              animate={{ left: `${(progress / RACE_LENGTH) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ marginLeft: "-12px" }}
            >
              <div className="w-6 h-4 bg-foreground rounded-sm flex items-center justify-center">
                <div className="w-4 h-2 bg-primary rounded-sm" />
              </div>
            </motion.div>
          </div>
          
          {/* Progress text */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
            <span>Lap {progress + 1} / {RACE_LENGTH}</span>
            <span className={cn(mistakes > 0 && "text-red-500")}>Track Limits: {mistakes}</span>
          </div>
        </div>

      </div>
    </GameLayout>
  );
}
