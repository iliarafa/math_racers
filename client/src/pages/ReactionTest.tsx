import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, RotateCcw, Zap } from "lucide-react";

type GameState = 'idle' | 'sequence' | 'waiting' | 'go' | 'jumpstart' | 'result';

export default function ReactionTest() {
  const { state } = useGameState();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lights, setLights] = useState<boolean[]>([false, false, false, false, false]);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimeouts = () => {
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  const startSequence = () => {
    setGameState('sequence');
    setReactionTime(null);
    setLights([false, false, false, false, false]);
    startTimeRef.current = null;

    const turnOnLight = (index: number) => {
      if (index < 5) {
        setLights([index >= 0, index >= 1, index >= 2, index >= 3, index >= 4]);
        sequenceTimeoutRef.current = setTimeout(() => turnOnLight(index + 1), 1000);
      } else {
        setGameState('waiting');
        const randomDelay = 200 + Math.random() * 2800;
        sequenceTimeoutRef.current = setTimeout(() => {
          setLights([false, false, false, false, false]);
          startTimeRef.current = Date.now();
          setGameState('go');
        }, randomDelay);
      }
    };

    sequenceTimeoutRef.current = setTimeout(() => turnOnLight(0), 1000);
  };

  const handleLaunch = () => {
    if (gameState === 'idle') {
      startSequence();
    } else if (gameState === 'sequence' || gameState === 'waiting') {
      clearAllTimeouts();
      setGameState('jumpstart');
      setLights([false, false, false, false, false]);
    } else if (gameState === 'go') {
      const endTime = Date.now();
      const reaction = (endTime - startTimeRef.current!) / 1000;
      setReactionTime(reaction);
      setGameState('result');
    }
  };

  const resetGame = () => {
    clearAllTimeouts();
    setGameState('idle');
    setLights([false, false, false, false, false]);
    setReactionTime(null);
    startTimeRef.current = null;
  };

  const getButtonText = () => {
    switch (gameState) {
      case 'idle': return 'Start Sequence';
      case 'sequence': return 'Hold...';
      case 'waiting': return 'Hold...';
      case 'go': return 'LAUNCH!';
      case 'jumpstart': return 'Try Again';
      case 'result': return 'Try Again';
      default: return 'Start';
    }
  };

  const getResultDisplay = () => {
    if (gameState === 'jumpstart') {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-red-600 font-bold text-2xl"
        >
          JUMP START! (Disqualified)
        </motion.div>
      );
    }
    if (gameState === 'result' && reactionTime !== null) {
      const rating = reactionTime < 0.2 ? 'Perfect!' : reactionTime < 0.3 ? 'Excellent!' : reactionTime < 0.4 ? 'Good' : reactionTime < 0.5 ? 'Average' : 'Slow';
      const ratingColor = reactionTime < 0.2 ? 'text-green-500' : reactionTime < 0.3 ? 'text-green-600' : reactionTime < 0.4 ? 'text-yellow-500' : reactionTime < 0.5 ? 'text-orange-500' : 'text-red-500';
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-2"
        >
          <div className="text-4xl font-bold font-mono">{reactionTime.toFixed(3)}s</div>
          <div className={cn("text-lg font-medium", ratingColor)}>{rating}</div>
        </motion.div>
      );
    }
    return (
      <div className="text-muted-foreground text-lg">
        {gameState === 'idle' && 'Press Start to begin'}
        {(gameState === 'sequence' || gameState === 'waiting') && 'Wait for lights out...'}
        {gameState === 'go' && 'GO! GO! GO!'}
      </div>
    );
  };

  return (
    <GameLayout coins={state.coins} trackName="Reflex Training">
      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-6 md:py-8 px-4 space-y-6 md:space-y-8">
        
        <div className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
          <div className="flex gap-2 md:gap-3 justify-center">
            {lights.map((isOn, index) => (
              <div
                key={index}
                className={cn(
                  "w-10 h-10 md:w-16 md:h-16 rounded-full transition-all duration-100 border-2 md:border-4",
                  isOn 
                    ? "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] md:shadow-[0_0_30px_rgba(220,38,38,0.8)]" 
                    : "bg-zinc-800 border-zinc-700"
                )}
                data-testid={`light-${index}`}
              />
            ))}
          </div>
        </div>

        <div className="h-24 flex items-center justify-center">
          {getResultDisplay()}
        </div>

        <button
          onClick={gameState === 'jumpstart' || gameState === 'result' ? resetGame : handleLaunch}
          className={cn(
            "w-full max-w-xs h-16 md:h-20 rounded-xl font-bold text-xl md:text-2xl transition-all flex items-center justify-center gap-2 md:gap-3",
            gameState === 'go' && "bg-green-600 text-white hover:bg-green-500 animate-pulse",
            gameState === 'idle' && "bg-primary text-primary-foreground hover:opacity-90",
            (gameState === 'sequence' || gameState === 'waiting') && "bg-yellow-600 text-white hover:bg-yellow-500",
            (gameState === 'jumpstart' || gameState === 'result') && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
          data-testid="button-launch"
        >
          {gameState === 'go' && <Zap className="w-6 h-6" />}
          {(gameState === 'jumpstart' || gameState === 'result') && <RotateCcw className="w-6 h-6" />}
          {getButtonText()}
        </button>

        <Link href="/garage">
          <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2" data-testid="button-back-garage">
            <ChevronLeft className="w-4 h-4" /> Back to Garage
          </button>
        </Link>

      </div>
    </GameLayout>
  );
}
