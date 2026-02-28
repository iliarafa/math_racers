import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { TrendingUp, Volume2, VolumeX, Flag, Gauge, Zap, Trophy, ChevronRight, ClipboardList } from "lucide-react";
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
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-black mb-5 text-center">Garage</h1>

          <div className="flex flex-col gap-5">

            {/* Navigation group */}
            <div className="rounded-2xl overflow-hidden">
              <Link href="/regulations">
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all"
                  data-testid="button-regulations"
                >
                  <div className="flex items-center gap-3">
                    <Flag className="w-5 h-5 text-black" />
                    <span className="text-sm uppercase tracking-widest text-black/80">Race Regulations</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              </Link>
              <Link href="/strategy">
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all"
                  data-testid="button-strategy-guide"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm uppercase tracking-widest text-black/80">Strategy Guide</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              </Link>
              <Link href="/reaction">
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all"
                  data-testid="button-reflex-training"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5 w-5 justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                    </div>
                    <span className="text-sm uppercase tracking-widest text-black/80">Reflex Training</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              </Link>
              <Link href="/leaderboard">
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all"
                  data-testid="button-leaderboard"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm uppercase tracking-widest text-black/80">Leaderboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              </Link>
              <Link href="/racer-log">
                <div
                  className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all"
                  data-testid="button-racer-log"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-black" />
                    <span className="text-sm uppercase tracking-widest text-black/80">Racer Log</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              </Link>
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
                    style={state.soundEnabled ? { backgroundColor: state.teamColor } : {}}
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
                    style={state.simMode ? { backgroundColor: state.teamColor } : {}}
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
                    style={state.powerUpsEnabled ? { backgroundColor: state.teamColor } : {}}
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
                  <button
                    onClick={handleRetireCar}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors uppercase tracking-widest"
                    data-testid="button-retire"
                  >
                    Retire from Championship →
                  </button>
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
