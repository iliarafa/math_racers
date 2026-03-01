import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { TrendingUp, Volume2, VolumeX, Flag, Gauge, Zap, Trophy, ClipboardList, RotateCcw } from "lucide-react";
import { usePurchase } from "@/hooks/use-purchase";
import { isNativePlatform } from "@/lib/purchases";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, togglePowerUps, resetAllData } = useGameState();
  const { restore } = usePurchase();
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleRetireCar = () => {
    if (confirm("Are you sure you want to retire? This will reset ALL your progress.")) {
      resetAllData();
    }
  };

  return (
    <GameLayout hideGarageButton hideHeader lockViewport>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-black mb-8 text-center">Garage</h1>

          <div className="flex flex-col gap-8">

            {/* Navigation grid */}
            <div className="grid grid-cols-3 gap-3">
              <Link href="/regulations">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-regulations">
                  <Flag className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Regulations</span>
                </div>
              </Link>
              <Link href="/strategy">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-strategy-guide">
                  <TrendingUp className="w-10 h-10 text-yellow-400" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Strategy</span>
                </div>
              </Link>
              <Link href="/reaction">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-reflex-training">
                  <div className="flex gap-1 w-10 h-10 items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Reflex</span>
                </div>
              </Link>
              <Link href="/leaderboard">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-leaderboard">
                  <Trophy className="w-10 h-10 text-yellow-400" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Leaderboard</span>
                </div>
              </Link>
              <Link href="/racer-log">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-racer-log">
                  <ClipboardList className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Racer Log</span>
                </div>
              </Link>
              <div
                onClick={handleRetireCar}
                className="rounded-xl bg-gray-50 border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-retire"
              >
                <RotateCcw className="w-10 h-10 text-red-400" />
                <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Reset</span>
              </div>
            </div>

            {/* Pit Console */}
            <div
              className="rounded-2xl p-4 md:p-6"
              data-testid="card-pit-console"
            >
              <p className="text-xs uppercase tracking-widest text-black/50 mb-4">Pit Console</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between" data-testid="toggle-sound">
                  <div className="flex items-center gap-3">
                    {state.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-black/50" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-black/50" />
                    )}
                    <span className="text-sm text-black/80">Sound</span>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.soundEnabled ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ease-in-out",
                        state.soundEnabled ? "left-6" : "left-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between" data-testid="toggle-sim">
                  <div className="flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-black/50" />
                    <div>
                      <span className="text-sm text-black/80">Realism Mode</span>
                      <p className="text-[10px] text-black/40">Full race distance & damage</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleSimMode}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.simMode ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ease-in-out",
                        state.simMode ? "left-6" : "left-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between" data-testid="toggle-powerups">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-black/50" />
                    <div>
                      <span className="text-sm text-black/80">Power-Ups</span>
                      <p className="text-[10px] text-black/40">Overtake & Active Aero</p>
                    </div>
                  </div>
                  <button
                    onClick={togglePowerUps}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.powerUpsEnabled ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ease-in-out",
                        state.powerUpsEnabled ? "left-6" : "left-1"
                      )}
                    />
                  </button>
                </div>

                <div className="pt-3 mt-4 flex flex-col gap-3">
                  {isNativePlatform() && (
                    <button
                      onClick={async () => {
                        setRestoreMessage(null);
                        const success = await restore();
                        setRestoreMessage(success ? 'Purchases restored!' : 'No purchases found.');
                        setTimeout(() => setRestoreMessage(null), 3000);
                      }}
                      className="text-xs text-gray-400/70 hover:text-gray-400 transition-colors uppercase tracking-widest"
                    >
                      Restore Purchases →
                    </button>
                  )}
                  {restoreMessage && (
                    <span className="text-xs text-gray-500">{restoreMessage}</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-center mt-6 mb-4">
            <Link href="/">
              <button
                className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Back
              </button>
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
