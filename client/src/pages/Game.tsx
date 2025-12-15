import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, Question, TRACKS, SHOP_ITEMS, RACE_LENGTH, DRIVERS_2025 } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, Timer, Flag, Zap, Trophy, RotateCcw, Home } from "lucide-react";
import generatedCar from "@assets/generated_images/red_f1_car_facing_right_on_black_background.png";
import generatedFlag from "@assets/generated_images/seamless_checkered_flag_pattern.png";

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak } = useGameState();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0); // 0 to 20 (RACE_LENGTH)
  const [mistakes, setMistakes] = useState(0);
  const [gameStatus, setGameStatus] = useState<'racing' | 'finished'>('racing');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize question
  useEffect(() => {
    if (!question && gameStatus === 'racing') {
      setQuestion(generateQuestion(state.currentTrack));
    }
  }, [state.currentTrack, question, gameStatus]);

  // Focus input on load and after answer
  useEffect(() => {
    if (gameStatus === 'racing') {
      inputRef.current?.focus();
    }
  }, [question, feedback, gameStatus]);

  const currentTrackData = TRACKS.find(t => t.id === state.currentTrack) || TRACKS[0];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question || feedback !== 'idle' || gameStatus !== 'racing') return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    if (val === question.answer) {
      // Correct
      setFeedback('correct');
      addCoins(10 + (state.streak >= 2 ? 5 : 0)); // Bonus for streak
      incrementStreak();
      
      const newProgress = progress + 1;
      setProgress(newProgress);
      
      // Check for race finish
      if (newProgress >= RACE_LENGTH) {
        finishRace();
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(state.currentTrack));
        }, 1000);
      }

    } else {
      // Incorrect
      setFeedback('incorrect');
      setMistakes(prev => prev + 1);
      resetStreak();
      
      const newProgress = progress + 1;
      setProgress(newProgress);

      // Check for race finish even on wrong answer (the race continues, you just lose position)
      if (newProgress >= RACE_LENGTH) {
        finishRace();
      } else {
        setTimeout(() => {
          setFeedback('idle');
          setAnswer("");
          setQuestion(generateQuestion(state.currentTrack));
          inputRef.current?.focus();
        }, 1000);
      }
    }
  };

  const finishRace = () => {
    setFeedback('idle');
    setGameStatus('finished');
    if (mistakes <= 1) {
       confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 }
        });
    }
  };

  const getRaceResult = () => {
    // 0-1 mistakes: 1st place
    // 2 mistakes: 2nd place
    // 3 mistakes: 3rd place
    // etc.
    let position = mistakes <= 1 ? 1 : mistakes;
    if (position > DRIVERS_2025.length) position = DRIVERS_2025.length;
    
    const driverName = DRIVERS_2025[position - 1];
    return { position, driverName };
  };

  const restartRace = () => {
    setProgress(0);
    setMistakes(0);
    setGameStatus('racing');
    setFeedback('idle');
    setAnswer("");
    setQuestion(generateQuestion(state.currentTrack));
    resetStreak();
  };

  if (gameStatus === 'finished') {
    const { position, driverName } = getRaceResult();
    const isWinner = position === 1;

    return (
      <GameLayout coins={state.coins} trackName={currentTrackData.name}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm z-50 absolute inset-0">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border-4 border-white/10 p-8 rounded-3xl max-w-2xl w-full shadow-2xl space-y-8"
          >
            <div className="space-y-2">
               <h2 className="text-neutral-400 font-mono tracking-widest uppercase">Race Results</h2>
               <h1 className="font-racing text-6xl text-white">
                 P{position}
               </h1>
            </div>

            <div className="space-y-4 py-8 border-y border-white/10">
              <p className="text-2xl text-neutral-300">
                You finished <span className={cn("font-bold", isWinner ? "text-accent" : "text-white")}>
                  {position === 1 ? "1st (World Champion!)" : `${position}${position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} Place`}
                </span>
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-neutral-500 uppercase font-mono">Simulating 2025 Championship Result</p>
                <div className="flex items-center gap-3 bg-neutral-800 px-6 py-3 rounded-xl border border-neutral-700">
                   <div className="w-2 h-8 bg-primary rounded-full"></div>
                   <p className="text-xl text-white font-racing tracking-wide">{driverName}</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-8 mt-4">
                 <div className="text-center">
                   <div className="text-sm text-neutral-500 font-mono uppercase">Mistakes</div>
                   <div className={cn("text-3xl font-bold", mistakes === 0 ? "text-green-500" : mistakes <= 3 ? "text-yellow-500" : "text-red-500")}>
                     {mistakes}
                   </div>
                 </div>
                 <div className="text-center">
                   <div className="text-sm text-neutral-500 font-mono uppercase">Accuracy</div>
                   <div className="text-3xl font-bold text-white">
                     {Math.round(((RACE_LENGTH - mistakes) / RACE_LENGTH) * 100)}%
                   </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={restartRace}
                className="bg-primary hover:bg-red-500 text-white font-racing text-xl py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-5 h-5" /> RACE AGAIN
              </button>
              <Link href="/">
                <button className="bg-neutral-800 hover:bg-neutral-700 text-white font-racing text-xl py-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Home className="w-5 h-5" /> MAIN MENU
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout coins={state.coins} trackName={`${currentTrackData.name} (${progress + 1}/${RACE_LENGTH})`}>
      <div className="flex-1 flex flex-col relative">
        
        {/* Race Visualization Area */}
        <div className="h-48 md:h-64 relative bg-neutral-800 border-b-4 border-white/10 overflow-hidden">
           {/* Track Surface */}
           <div className="absolute inset-0 bg-neutral-800">
             {/* Road markings */}
             <div className="absolute top-1/2 w-full h-0 border-t-2 border-dashed border-white/30"></div>
           </div>
           
           {/* Finish Line (appears when close) */}
           <div 
             className="absolute top-0 bottom-0 w-16 bg-checkered z-0 transition-all duration-1000"
             style={{ 
               right: `${Math.max(0, 100 - (progress / RACE_LENGTH) * 100)}%`,
               transform: 'translateX(100%)'
             }}
           ></div>

           {/* Car */}
           <motion.div 
             className="absolute top-1/2 -translate-y-1/2 z-10"
             animate={{ 
               left: `${(progress / RACE_LENGTH) * 80 + 5}%`, // Move from 5% to 85%
             }}
             transition={{ type: "spring", stiffness: 50 }}
           >
             <div className="relative">
               <img 
                 src={generatedCar} 
                 alt="Player Car" 
                 className={cn("w-24 md:w-32 drop-shadow-lg mix-blend-screen", 
                   state.equippedLivery === 'blue-livery' && "hue-rotate-180",
                   state.equippedLivery === 'orange-livery' && "hue-rotate-30",
                   state.equippedLivery === 'silver-livery' && "grayscale contrast-125",
                 )} 
               />
               
               {/* Speed Lines Effect when correct */}
               <AnimatePresence>
                 {feedback === 'correct' && (
                   <motion.div 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: -50 }}
                     exit={{ opacity: 0 }}
                     className="absolute top-1/2 -left-8 -translate-y-1/2 flex flex-col gap-1"
                   >
                     <div className="w-12 h-1 bg-white/50 rounded-full"></div>
                     <div className="w-8 h-1 bg-white/30 rounded-full ml-4"></div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </motion.div>
        </div>

        {/* Dashboard / Math Area */}
        <div className="flex-1 bg-neutral-900 p-4 md:p-8 flex flex-col items-center justify-center">
          
          <div className="w-full max-w-2xl">
            {/* Pit Board (Question) */}
            <div className="bg-neutral-800 rounded-3xl p-8 border-4 border-neutral-700 shadow-2xl relative overflow-hidden">
               {/* Top Status Bar */}
               <div className="absolute top-0 left-0 right-0 h-12 bg-black/40 flex justify-between items-center px-6">
                 <div className="flex items-center gap-2">
                   <div className={cn("w-3 h-3 rounded-full", feedback === 'idle' ? "bg-yellow-500 animate-pulse" : feedback === 'correct' ? "bg-green-500" : "bg-red-500")}></div>
                   <span className="text-xs text-neutral-400 font-mono uppercase tracking-widest">
                     {feedback === 'idle' ? 'AWAITING INPUT' : feedback === 'correct' ? 'SECTOR CLEAR' : 'ENGINE STALL'}
                   </span>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="text-red-500 font-mono text-sm flex items-center gap-1">
                        <X className="w-4 h-4" /> {mistakes} Mistakes
                    </div>
                    <div className="text-accent font-mono text-sm">LAP {progress + 1}/{RACE_LENGTH}</div>
                 </div>
               </div>

               <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                  {/* The Sum */}
                  <div className="flex items-center gap-4 font-racing text-6xl md:text-8xl text-white">
                    <span className="tabular-nums">{question?.num1}</span>
                    <span className="text-primary">{question?.operation === 'x' ? '×' : question?.operation}</span>
                    <span className="tabular-nums">{question?.num2}</span>
                    <span className="text-neutral-500">=</span>
                  </div>

                  {/* Input Area */}
                  <form onSubmit={handleSubmit} className="relative group">
                    <input
                      ref={inputRef}
                      type="number"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className={cn(
                        "w-48 h-24 bg-black text-center font-mono text-5xl md:text-6xl text-white rounded-xl border-4 outline-none transition-all placeholder:text-neutral-700",
                        feedback === 'idle' && "border-neutral-600 focus:border-primary focus:shadow-[0_0_30px_rgba(239,68,68,0.3)]",
                        feedback === 'correct' && "border-green-500 bg-green-900/20 text-green-400",
                        feedback === 'incorrect' && "border-red-500 bg-red-900/20 text-red-400 animate-shake"
                      )}
                      placeholder="?"
                      autoFocus
                    />
                    
                    {/* Submit Button (Visible on mobile or as visual cue) */}
                    <button 
                      type="submit"
                      className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-primary hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap md:opacity-0 md:group-focus-within:opacity-100"
                    >
                      <Zap className="w-4 h-4" /> SPEED BOOST
                    </button>
                  </form>
               </div>
            </div>

            {/* Feedback Message */}
            <div className="h-16 flex items-center justify-center mt-6">
              <AnimatePresence mode="wait">
                {feedback === 'correct' && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="flex items-center gap-3 text-green-400 font-racing text-3xl md:text-4xl uppercase"
                  >
                    <Check className="w-8 h-8 border-2 border-green-400 rounded-full p-1" />
                    FASTEST LAP!
                  </motion.div>
                )}
                {feedback === 'incorrect' && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="flex items-center gap-3 text-red-500 font-racing text-3xl md:text-4xl uppercase"
                  >
                    <X className="w-8 h-8 border-2 border-red-500 rounded-full p-1" />
                    SPIN OUT!
                  </motion.div>
                )}
                {feedback === 'idle' && (
                  <div className="text-neutral-600 font-mono text-sm text-center">
                    Type the answer and press ENTER for Speed Boost
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
