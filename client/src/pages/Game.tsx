import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, Question, TRACKS, RACE_LENGTH, DRIVERS_2025 } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw, Home, ArrowRight, Timer } from "lucide-react";

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak } = useGameState();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0); 
  const [mistakes, setMistakes] = useState(0);
  const [gameStatus, setGameStatus] = useState<'countdown' | 'go' | 'racing' | 'finished'>('countdown');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownLight, setCountdownLight] = useState(0); // 0 = no lights, 1-5 = lights on
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown sequence: 5 lights, one per second
  useEffect(() => {
    if (gameStatus === 'countdown') {
      const interval = setInterval(() => {
        setCountdownLight(prev => {
          if (prev >= 5) {
            clearInterval(interval);
            // Transition to GO state
            setGameStatus('go');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStatus]);

  // GO state: show green for 1 second, then start racing
  useEffect(() => {
    if (gameStatus === 'go') {
      setQuestion(generateQuestion(state.currentTrack));
      const timeout = setTimeout(() => {
        setGameStatus('racing');
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [gameStatus, state.currentTrack]);

  // Focus input when racing
  useEffect(() => {
    if (gameStatus === 'racing') {
      inputRef.current?.focus();
    }
  }, [question, feedback, gameStatus]);

  // Timer Logic - only runs during racing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStatus === 'racing') {
      const startTime = Date.now() - elapsedTime;
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [gameStatus]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const currentTrackData = TRACKS.find(t => t.id === state.currentTrack) || TRACKS[0];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question || feedback !== 'idle' || gameStatus !== 'racing') return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    if (val === question.answer) {
      setFeedback('correct');
      addCoins(10);
      incrementStreak();
      
      const newProgress = progress + 1;
      setProgress(newProgress);
      
      if (newProgress >= RACE_LENGTH) {
        finishRace();
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(state.currentTrack));
        }, 600);
      }
    } else {
      setFeedback('incorrect');
      setMistakes(prev => prev + 1);
      resetStreak();
      
      const newProgress = progress + 1;
      setProgress(newProgress);

      if (newProgress >= RACE_LENGTH) {
        finishRace();
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(state.currentTrack));
        }, 800);
      }
    }
  };

  const finishRace = () => {
    setFeedback('idle');
    setGameStatus('finished');
    if (mistakes <= 1) {
       confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const getRaceResult = () => {
    let position = mistakes <= 1 ? 1 : mistakes;
    if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
    return { position, driverName: DRIVERS_2025[position - 1] };
  };

  const restartRace = () => {
    setProgress(0);
    setMistakes(0);
    setElapsedTime(0);
    setCountdownLight(0);
    setGameStatus('countdown');
    setFeedback('idle');
    setAnswer("");
    setQuestion(null);
    resetStreak();
  };

  // Countdown screen with F1 starting lights
  if (gameStatus === 'countdown') {
    return (
      <GameLayout coins={state.coins} trackName={currentTrackData.name}>
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
      <GameLayout coins={state.coins} trackName={currentTrackData.name}>
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

  if (gameStatus === 'finished') {
    const { position, driverName } = getRaceResult();
    const isWinner = position === 1;

    return (
      <GameLayout coins={state.coins} trackName={currentTrackData.name}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-12">
          <div className="bg-card border border-border rounded-xl p-8 w-full text-center space-y-8 shadow-sm">
            
            <div className="space-y-2">
               <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Race Result</div>
               <div className="text-8xl font-bold tracking-tighter">P{position}</div>
               <div className="text-xl font-medium">{isWinner ? "World Champion" : "Finish Position"}</div>
            </div>

            <div className="py-6 border-y border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Driver Match</span>
                <span className="font-bold">{driverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time</span>
                <span className="font-bold font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mistakes</span>
                <span className={cn("font-bold", mistakes === 0 ? "text-green-600" : "text-red-600")}>{mistakes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-bold">{Math.round(((RACE_LENGTH - mistakes) / RACE_LENGTH) * 100)}%</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button onClick={restartRace} className="w-full bg-primary text-primary-foreground h-12 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Race Again
              </button>
              <Link href="/">
                <button className="w-full bg-secondary text-secondary-foreground h-12 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                  <Home className="w-4 h-4" /> Main Menu
                </button>
              </Link>
            </div>

          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout coins={state.coins} trackName={currentTrackData.name}>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full py-8 gap-12">
        
        {/* Progress Bar & Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground font-medium">
             <span>Lap {progress + 1} of {RACE_LENGTH}</span>
             <span className={cn(mistakes > 0 ? "text-red-600" : "")}>{mistakes} Mistakes</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-primary"
               initial={{ width: 0 }}
               animate={{ width: `${(progress / RACE_LENGTH) * 100}%` }}
               transition={{ type: "spring", stiffness: 50 }}
             />
          </div>
        </div>

        {/* Stopwatch & Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          
          {/* Stopwatch */}
          <div className="flex items-center gap-2 text-2xl font-mono font-medium text-primary bg-secondary/50 px-6 py-2 rounded-full">
            <Timer className="w-5 h-5" />
            {formatTime(elapsedTime)}
          </div>

          <div className="text-6xl md:text-8xl font-bold tracking-tighter flex items-center gap-6">
            <span className="tabular-nums">{question?.num1}</span>
            <span className="text-muted-foreground font-light">{question?.operation === 'x' ? '×' : question?.operation}</span>
            <span className="tabular-nums">{question?.num2}</span>
            <span className="text-muted-foreground font-light">=</span>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-xs relative">
            <input
              ref={inputRef}
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={cn(
                "w-full h-24 text-center text-5xl font-bold bg-transparent border-b-4 outline-none transition-all placeholder:text-muted-foreground/20",
                feedback === 'idle' && "border-border focus:border-primary",
                feedback === 'correct' && "border-green-500 text-green-600",
                feedback === 'incorrect' && "border-red-500 text-red-600"
              )}
              placeholder="?"
              autoFocus
            />
            {feedback === 'idle' && answer && (
               <div className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground animate-pulse">
                 <ArrowRight className="w-6 h-6" />
               </div>
            )}
          </form>

          {/* Minimal Feedback */}
          <div className="h-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'correct' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-medium flex items-center gap-2">
                  <Check className="w-5 h-5" /> Correct
                </motion.div>
              )}
              {feedback === 'incorrect' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-600 font-medium flex items-center gap-2">
                  <X className="w-5 h-5" /> Incorrect
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </GameLayout>
  );
}
