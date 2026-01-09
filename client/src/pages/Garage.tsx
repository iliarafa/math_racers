import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, BarChart3, FileText, Zap } from "lucide-react";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, resetAllData, getTopLapTimes } = useGameState();
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
              className="w-full hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#000000]"
              data-testid="button-strategy-guide"
            >
              <BarChart3 className="w-5 h-5" />
              Open Strategy Guide
            </button>
          </Link>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Reflex Training</h2>
            <p className="text-xs text-muted-foreground">Practice your race starts</p>
          </div>
          
          <Link href="/reaction">
            <button
              className="w-full hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#000000]"
              data-testid="button-reflex-training"
            >
              <Zap className="w-5 h-5" />
              Open Reflex Training
            </button>
          </Link>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Regulations
            </h2>
            <p className="text-xs text-muted-foreground">How to Play</p>
          </div>
          
          <div className="text-sm space-y-2 bg-[#000000] text-[#ffffff] rounded-xl p-4" data-testid="regulations-content">
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
              <div className="text-2xl md:text-3xl font-mono font-bold text-[#ffffff]">{state.careerPoints}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-1">Career Pts</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 md:p-4 text-center" data-testid="stat-wins">
              <div className="text-2xl md:text-3xl font-mono font-bold text-[#ffffff]">{state.racesWon}</div>
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
          <label className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors pl-[0px] pr-[0px]" data-testid="toggle-sound">
            <span className="font-semibold">Beeps</span>
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
          <label className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors pl-[0px] pr-[0px]" data-testid="toggle-sim">
            <div>
              <span className="font-semibold">REALISM</span>
              <p className="text-xs text-muted-foreground">Full race distance (44-78 laps)</p>
            </div>
            <button
              onClick={toggleSimMode}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                state.simMode ? "bg-green-500" : "bg-neutral-600"
              )}
            >
              <span 
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-200 ease-in-out",
                  state.simMode ? "left-6" : "left-1"
                )}
              />
            </button>
          </label>
        </section>

        <section className="space-y-4 pt-8">
          <div>
            <h2 className="font-semibold text-red-500">Danger Zone</h2>
            <p className="text-xs text-muted-foreground">Retire to reset your stats.</p>
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
