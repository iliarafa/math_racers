import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { RotateCcw, Zap } from "lucide-react";

type GameState = 'idle' | 'sequence' | 'waiting' | 'go' | 'jumpstart' | 'result';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
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
    console.error('Audio playback failed:', e);
  }
};

export default function ReactionTest() {
  const { state } = useGameState();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lights, setLights] = useState<boolean[]>([false, false, false, false, false]);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundEnabledRef = useRef(state.soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = state.soundEnabled;
  }, [state.soundEnabled]);

  const clearAllTimeouts = () => {
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  // Spacebar support for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        if (gameState === 'jumpstart' || gameState === 'result') {
          resetGame();
        } else {
          handleLaunch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startSequence = () => {
    setGameState('sequence');
    setReactionTime(null);
    setLights([false, false, false, false, false]);
    startTimeRef.current = null;

    const turnOnLight = (index: number) => {
      if (index < 5) {
        setLights([index >= 0, index >= 1, index >= 2, index >= 3, index >= 4]);
        if (soundEnabledRef.current) {
          playBeep(800, 150);
        }
        sequenceTimeoutRef.current = setTimeout(() => turnOnLight(index + 1), 1000);
      } else {
        setGameState('waiting');
        const randomDelay = 200 + Math.random() * 2800;
        sequenceTimeoutRef.current = setTimeout(() => {
          setLights([false, false, false, false, false]);
          if (soundEnabledRef.current) {
            playBeep(1200, 200);
          }
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
    return null;
  };

  return (
    <GameLayout trackName="Reflex Training" lockViewport hideGarageButton centerHeader>
      <div className="flex-1 flex flex-col items-center justify-center max-w-xl md:max-w-2xl mx-auto w-full px-4 space-y-4 md:space-y-8 overflow-hidden">
        
        <div className="flex flex-col items-stretch space-y-4 md:space-y-8">
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
              "w-full h-16 md:h-24 rounded-xl font-bold text-xl md:text-3xl transition-all flex items-center justify-center gap-2 md:gap-3",
              gameState === 'go' && "bg-green-600 text-white hover:bg-green-500 animate-pulse",
              gameState === 'idle' && "bg-green-600 text-white hover:bg-green-500",
              (gameState === 'sequence' || gameState === 'waiting') && "bg-yellow-600 text-white hover:bg-yellow-500",
              (gameState === 'jumpstart' || gameState === 'result') && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            data-testid="button-launch"
          >
            {gameState === 'go' && <Zap className="w-6 h-6" />}
            {(gameState === 'jumpstart' || gameState === 'result') && <RotateCcw className="w-6 h-6" />}
            {getButtonText()}
          </button>
        </div>


      </div>

      {/* Sticky bottom back button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm flex justify-center py-3 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <Link href="/garage">
          <button
            className="transition-colors text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
            data-testid="button-back-garage"
          >
            Back
          </button>
        </Link>
      </div>
    </GameLayout>
  );
}
