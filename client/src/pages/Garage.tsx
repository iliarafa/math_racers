import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, TEAM_COLORS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, Check, AlertTriangle, BookOpen } from "lucide-react";

export default function Garage() {
  const { state, setTeamColor, toggleSound, resetAllData } = useGameState();

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
          <div className="border-b border-border pb-2">
            <h2 className="font-semibold">Strategy Room</h2>
            <p className="text-xs text-muted-foreground">Math Reference Guide</p>
          </div>
          
          <Link href="/strategy">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="button-strategy-guide"
            >
              <BookOpen className="w-5 h-5" />
              Open Strategy Guide
            </button>
          </Link>
        </section>

        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="font-semibold">Telemetry</h2>
            <p className="text-xs text-muted-foreground">Career Statistics</p>
          </div>
          
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 md:p-4 text-center" data-testid="stat-laps">
              <div className="text-2xl md:text-3xl font-mono font-bold text-cyan-400">{state.totalLaps}</div>
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
        </section>

        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="font-semibold">Pit Radio</h2>
            <p className="text-xs text-muted-foreground">Audio Settings</p>
          </div>
          
          <label className="flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" data-testid="toggle-sound">
            <span className="font-medium">Sound Effects</span>
            <button
              onClick={toggleSound}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                state.soundEnabled ? "bg-green-500" : "bg-neutral-600"
              )}
            >
              <span 
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                  state.soundEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </label>
        </section>

        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="font-semibold">Paint Shop</h2>
            <p className="text-xs text-muted-foreground">Select Team Livery</p>
          </div>
          
          <div className="flex flex-wrap gap-3 md:gap-4">
            {TEAM_COLORS.map(color => {
              const isSelected = state.teamColor === color.hex;
              return (
                <button
                  key={color.id}
                  onClick={() => setTeamColor(color.hex)}
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-full transition-all relative",
                    isSelected && "ring-2 ring-offset-2 ring-offset-background ring-white"
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  data-testid={`color-${color.id}`}
                >
                  {isSelected && (
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-white absolute inset-0 m-auto drop-shadow-md" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 pt-8 border-t border-border">
          <div className="pb-2">
            <h2 className="font-semibold text-red-500">Danger Zone</h2>
            <p className="text-xs text-muted-foreground">Irreversible actions</p>
          </div>
          
          <button
            onClick={handleRetireCar}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="button-retire"
          >
            <AlertTriangle className="w-5 h-5" />
            RETIRE CAR (Reset Save)
          </button>
        </section>

      </div>
    </GameLayout>
  );
}
