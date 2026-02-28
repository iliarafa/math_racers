import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { TrendingUp, Volume2, VolumeX, Flag, Gauge, Zap, Trophy } from "lucide-react";
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
    <GameLayout hideGarageButton hideHeader darkBackground lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-black">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">

            <Link href="/regulations" className="col-span-1">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-regulations"
              >
                <Flag className="w-8 h-8 text-white" />
                <span className="text-xs uppercase tracking-widest text-white/70">Race Regulations</span>
              </div>
            </Link>

            <Link href="/strategy" className="col-span-1">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-strategy-guide"
              >
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <span className="text-xs uppercase tracking-widest text-white/70">Strategy Guide</span>
              </div>
            </Link>

            <Link href="/reaction" className="col-span-1">
              <div
                className="h-full border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px] bg-black"
                data-testid="button-reflex-training"
              >
                <div className="flex gap-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                </div>
                <span className="text-xs uppercase tracking-widest text-white/70">Reflex Training</span>
              </div>
            </Link>

            <Link href="/leaderboard" className="col-span-1">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-leaderboard"
              >
                <Trophy className="w-8 h-8 text-yellow-400" />
                <span className="text-xs uppercase tracking-widest text-white/70">Leaderboard</span>
              </div>
            </Link>

            <Link href="/racer-log" className="sm:col-span-2">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg flex items-center justify-center cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-racer-log"
              >
                <span className="text-xs uppercase tracking-widest text-white/70">Racer Log</span>
              </div>
            </Link>

            <div
              className="sm:col-span-2 bg-black border border-[#333] rounded-2xl p-4 md:p-6 shadow-lg"
              data-testid="card-pit-console"
            >
              <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Pit Console</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between" data-testid="toggle-sound">
                  <div className="flex items-center gap-3">
                    {state.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-white/50" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-white/50" />
                    )}
                    <span className="text-sm text-white/80">Sound</span>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.soundEnabled ? "bg-green-500" : "bg-[#333]"
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
                    <Gauge className="w-5 h-5 text-white/50" />
                    <div>
                      <span className="text-sm text-white/80">Realism Mode</span>
                      <p className="text-[10px] text-white/40">Full race distance & damage</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleSimMode}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.simMode ? "bg-green-500" : "bg-[#333]"
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
                    <Zap className="w-5 h-5 text-white/50" />
                    <div>
                      <span className="text-sm text-white/80">Power-Ups</span>
                      <p className="text-[10px] text-white/40">Overtake & Active Aero</p>
                    </div>
                  </div>
                  <button
                    onClick={togglePowerUps}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      state.powerUpsEnabled ? "bg-green-500" : "bg-[#333]"
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

                <div className="pt-3 border-t border-[#333] mt-4 flex flex-col gap-3">
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
        </div>
      </div>

      {/* Sticky bottom back button */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm flex justify-center py-3 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <Link href="/">
          <button
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-white"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Back
          </button>
        </Link>
      </div>
    </GameLayout>
  );
}
