import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, TEAM_COLORS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, Check, AlertTriangle, BarChart3, FileText, Zap, RotateCcw } from "lucide-react";

type ReflexState = 'idle' | 'sequence' | 'waiting' | 'go' | 'jumpstart' | 'result';

export default function Garage() {
  const { state, setTeamColor, toggleSound, resetAllData, getTopLapTimes } = useGameState();
  
  // Reflex Training State
  const [reflexState, setReflexState] = useState<ReflexState>('idle');
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
    setReflexState('sequence');
    setReactionTime(null);
    setLights([false, false, false, false, false]);
    startTimeRef.current = null;

    const turnOnLight = (index: number) => {
      if (index < 5) {
        setLights([index >= 0, index >= 1, index >= 2, index >= 3, index >= 4]);
        sequenceTimeoutRef.current = setTimeout(() => turnOnLight(index + 1), 1000);
      } else {
        setReflexState('waiting');
        const randomDelay = 200 + Math.random() * 2800;
        sequenceTimeoutRef.current = setTimeout(() => {
          setLights([false, false, false, false, false]);
          startTimeRef.current = Date.now();
          setReflexState('go');
        }, randomDelay);
      }
    };

    sequenceTimeoutRef.current = setTimeout(() => turnOnLight(0), 1000);
  };

  const handleLaunch = () => {
    if (reflexState === 'idle') {
      startSequence();
    } else if (reflexState === 'sequence' || reflexState === 'waiting') {
      clearAllTimeouts();
      setReflexState('jumpstart');
      setLights([false, false, false, false, false]);
    } else if (reflexState === 'go') {
      const endTime = Date.now();
      const reaction = (endTime - startTimeRef.current!) / 1000;
      setReactionTime(reaction);
      setReflexState('result');
    }
  };

  const resetReflex = () => {
    clearAllTimeouts();
    setReflexState('idle');
    setLights([false, false, false, false, false]);
    setReactionTime(null);
    startTimeRef.current = null;
  };

  const getButtonText = () => {
    switch (reflexState) {
      case 'idle': return 'Start';
      case 'sequence': return 'Hold...';
      case 'waiting': return 'Hold...';
      case 'go': return 'LAUNCH!';
      case 'jumpstart': return 'Try Again';
      case 'result': return 'Try Again';
      default: return 'Start';
    }
  };
  const topTimes = getTopLapTimes(3);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleRetireCar = () => {
    if (confirm("Are you sure you want to retire your car? This will reset ALL your progress, including coins, stats, and settings.")) {
      resetAllData();
    }
  };

  return (
    <GameLayout coins={state.coins}>
      <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto px-4">
        
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors" data-testid="button-back">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Team Garage</h1>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Strategy Room</h2>
            <p className="text-xs text-muted-foreground">Math Reference Guide</p>
          </div>
          
          <Link href="/strategy">
            <button
              className="w-full hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#000000]"
              data-testid="button-strategy-guide"
            >
              <BarChart3 className="w-5 h-5" />
              Open Strategy Guide
            </button>
          </Link>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Reflex Training
            </h2>
            <p className="text-xs text-muted-foreground">Practice your race starts</p>
          </div>
          
          <div className="rounded-xl p-4 shadow-lg bg-[#ffffff]">
            <div className="flex gap-2 justify-center mb-4">
              {lights.map((isOn, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-100 border-2",
                    isOn 
                      ? "bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.8)]" 
                      : "bg-zinc-800 border-zinc-700"
                  )}
                  data-testid={`light-${index}`}
                />
              ))}
            </div>
            
            <div className="h-12 flex items-center justify-center mb-3">
              {reflexState === 'jumpstart' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-red-600 font-bold text-lg"
                >
                  JUMP START!
                </motion.div>
              )}
              {reflexState === 'result' && reactionTime !== null && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="text-2xl font-bold font-mono">{reactionTime.toFixed(3)}s</div>
                  <div className={cn(
                    "text-sm font-medium",
                    reactionTime < 0.2 ? 'text-green-500' : reactionTime < 0.3 ? 'text-green-600' : reactionTime < 0.4 ? 'text-yellow-500' : 'text-orange-500'
                  )}>
                    {reactionTime < 0.2 ? 'Perfect!' : reactionTime < 0.3 ? 'Excellent!' : reactionTime < 0.4 ? 'Good' : 'Average'}
                  </div>
                </motion.div>
              )}
              {reflexState === 'idle' && <span className="text-muted-foreground text-sm">Tap Start to begin</span>}
              {(reflexState === 'sequence' || reflexState === 'waiting') && <span className="text-yellow-500 text-sm">Wait for lights out...</span>}
              {reflexState === 'go' && <span className="text-green-500 font-bold animate-pulse">GO! GO! GO!</span>}
            </div>

            <button
              onClick={reflexState === 'jumpstart' || reflexState === 'result' ? resetReflex : handleLaunch}
              className={cn(
                "w-full h-12 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2",
                reflexState === 'go' && "bg-green-600 text-white hover:bg-green-500 animate-pulse",
                reflexState === 'idle' && "bg-primary text-primary-foreground hover:opacity-90",
                (reflexState === 'sequence' || reflexState === 'waiting') && "bg-yellow-600 text-white",
                (reflexState === 'jumpstart' || reflexState === 'result') && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              data-testid="button-reflex"
            >
              {reflexState === 'go' && <Zap className="w-5 h-5" />}
              {(reflexState === 'jumpstart' || reflexState === 'result') && <RotateCcw className="w-5 h-5" />}
              {getButtonText()}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Regulations
            </h2>
            <p className="text-xs text-muted-foreground">How to Play</p>
          </div>
          
          <div className="text-sm space-y-2" data-testid="regulations-content">
            <p><span className="font-bold">Race:</span> Answer 20 questions to finish.</p>
            <p><span className="font-bold">DRS Zones:</span> Straights after turns give double points and coins.</p>
            <p><span className="font-bold">Penalties:</span> Wrong answers add time. Too many mistakes = crash!</p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Telemetry</h2>
            <p className="text-xs text-muted-foreground">Career Statistics</p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 md:p-4 text-center" data-testid="stat-laps">
              <div className="text-2xl md:text-3xl font-mono font-bold text-[#ffffff]">{state.totalLaps}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Laps</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 md:p-4 text-center" data-testid="stat-points">
              <div className="text-2xl md:text-3xl font-mono font-bold text-green-400">{state.careerPoints}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">Career Pts</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 md:p-4 text-center" data-testid="stat-wins">
              <div className="text-2xl md:text-3xl font-mono font-bold text-yellow-400">{state.racesWon}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">Races Won</div>
            </div>
          </div>
          
          <div data-testid="session-lap-times">
            <h3 className="text-sm font-semibold mb-2">Session Best Laps</h3>
            {topTimes.length > 0 ? (
              <div className="space-y-1 text-sm font-mono">
                {topTimes.map((time, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">P{index + 1}</span>
                    <span className={index === 0 ? "text-purple-400 font-bold" : "text-muted-foreground"}>{formatTime(time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No races completed this session</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Pit Radio</h2>
            <p className="text-xs text-muted-foreground">Audio Settings</p>
          </div>
          
          <label className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors pl-[0px] pr-[0px]" data-testid="toggle-sound">
            <span className="font-semibold">Sound Effects</span>
            <button
              onClick={toggleSound}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                state.soundEnabled ? "bg-green-500" : "bg-neutral-600"
              )}
            >
              <span 
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-in-out",
                  state.soundEnabled ? "left-6" : "left-1"
                )}
              />
            </button>
          </label>
        </section>

        <section className="space-y-4 pt-8">
          <div>
            <h2 className="font-semibold text-red-500">Danger Zone</h2>
            <p className="text-xs text-muted-foreground">Irreversible actions</p>
          </div>
          
          <button
            onClick={handleRetireCar}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            data-testid="button-retire"
          >
            RETIRE
          </button>
        </section>

      </div>
    </GameLayout>
  );
}
