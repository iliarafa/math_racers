import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, generateQuestion, Question, TRACKS, SHOP_ITEMS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Check, X, Timer, Flag, Zap } from "lucide-react";
import generatedCar from "@assets/generated_images/top_down_view_of_a_red_f1_race_car_vector_illustration.png";
import generatedFlag from "@assets/generated_images/seamless_checkered_flag_pattern.png";

export default function Game() {
  const { state, addCoins, incrementStreak, resetStreak, nextTrack } = useGameState();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [progress, setProgress] = useState(0); // 0 to 10
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize question
  useEffect(() => {
    if (!question) {
      setQuestion(generateQuestion(state.currentTrack));
    }
  }, [state.currentTrack, question]);

  // Focus input on load and after answer
  useEffect(() => {
    inputRef.current?.focus();
  }, [question, feedback]);

  const currentTrackData = TRACKS.find(t => t.id === state.currentTrack) || TRACKS[0];
  const winCondition = currentTrackData.winCondition;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question || feedback !== 'idle') return;

    const val = parseInt(answer);
    if (isNaN(val)) return;

    if (val === question.answer) {
      // Correct
      setFeedback('correct');
      addCoins(10 + (state.streak >= 2 ? 5 : 0)); // Bonus for streak
      incrementStreak();
      setProgress(prev => prev + 1);
      
      // Check for level completion
      if (progress + 1 >= winCondition) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          nextTrack();
          setProgress(0);
          setQuestion(generateQuestion(state.currentTrack + 1)); // Prepare for next track immediately? Or wait?
          setFeedback('idle');
          setAnswer("");
        }, 2000);
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
      resetStreak();
      setTimeout(() => {
        setFeedback('idle');
        setAnswer("");
        inputRef.current?.focus();
      }, 1000);
    }
  };

  const getLiveryClass = () => {
    const item = SHOP_ITEMS.find(i => i.id === state.equippedLivery);
    return item?.color || 'bg-red-600';
  };

  return (
    <GameLayout coins={state.coins} trackName={currentTrackData.name}>
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
               right: `${Math.max(0, 100 - (progress / winCondition) * 100)}%`,
               transform: 'translateX(100%)'
             }}
           ></div>

           {/* Car */}
           <motion.div 
             className="absolute top-1/2 -translate-y-1/2 z-10"
             animate={{ 
               left: `${(progress / winCondition) * 80 + 5}%`, // Move from 5% to 85%
             }}
             transition={{ type: "spring", stiffness: 50 }}
           >
             <div className="relative">
               {/* Since we can't easily tint the raster image, we'll use the generated red car and maybe overlay a hue-rotate filter for other colors if needed, 
                   but for now let's stick to the generated red car. The 'Livery' logic in code changes 'bg-color' which won't affect the image.
                   FIX: Use a CSS filter to hue-rotate the car for different teams.
               */}
               <img 
                 src={generatedCar} 
                 alt="Player Car" 
                 className={cn("w-24 md:w-32 drop-shadow-lg transform rotate-90", 
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
                 <div className="text-accent font-mono text-sm">LAP {progress + 1}/{winCondition}</div>
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
