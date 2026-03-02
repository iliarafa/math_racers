import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { TrendingUp, Volume2, VolumeX, Flag, Gauge, Zap, Trophy, ClipboardList, RotateCcw } from "lucide-react";
import { usePurchase } from "@/hooks/use-purchase";
import { isNativePlatform } from "@/lib/purchases";
import garageCar from "@/assets/garage_car.jpeg";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, togglePowerUps, resetAllData } = useGameState();
  const { isPremium, restore } = usePurchase();
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleRetireCar = () => {
    if (confirm("Are you sure you want to retire? This will reset ALL your progress.")) {
      resetAllData();
    }
  };

  return (
    <GameLayout hideGarageButton hideHeader lockViewport>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-20 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-black mb-8 text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Garage</h1>

          <div className="flex flex-col gap-8">

            {/* Navigation grid */}
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={toggleSound}
                className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-sound"
              >
                {state.soundEnabled ? (
                  <Volume2 className="w-10 h-10 text-green-500" />
                ) : (
                  <VolumeX className="w-10 h-10 text-black" />
                )}
                <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Sound</span>
              </div>
              <div
                onClick={isPremium ? toggleSimMode : undefined}
                className={cn("rounded-xl bg-white p-4 flex flex-col items-center gap-3 transition-all", isPremium ? "cursor-pointer active:scale-[0.97]" : "opacity-40")}
                data-testid="button-realism"
              >
                <Gauge className={cn("w-10 h-10", state.simMode ? "text-green-500" : "text-black")} />
                <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Realism</span>
              </div>
              <div
                onClick={togglePowerUps}
                className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-powerups"
              >
                <Zap className={cn("w-10 h-10", state.powerUpsEnabled ? "text-green-500" : "text-black")} />
                <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Power-Ups</span>
              </div>
              <Link href="/reaction">
                <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-reflex-training">
                  <div className="flex gap-0.5 h-10 items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Reflex</span>
                </div>
              </Link>
              <Link href="/racer-log">
                <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-racer-log">
                  <ClipboardList className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Racer Log</span>
                </div>
              </Link>
              <Link href="/leaderboard">
                <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-leaderboard">
                  <Trophy className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Leaderboard</span>
                </div>
              </Link>
              <Link href="/regulations">
                <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-regulations">
                  <Flag className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Regulations</span>
                </div>
              </Link>
              <Link href="/strategy">
                <div className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-strategy-guide">
                  <TrendingUp className="w-10 h-10 text-black" />
                  <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Strategy</span>
                </div>
              </Link>
              <div
                onClick={handleRetireCar}
                className="rounded-xl bg-white p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-retire"
              >
                <RotateCcw className="w-10 h-10 text-black" />
                <span className="text-xs uppercase tracking-widest text-black/70 text-center leading-tight">Reset</span>
              </div>
            </div>

            <div className="flex justify-center">
              <img src={garageCar} alt="" className="w-40 opacity-20 select-none pointer-events-none" draggable={false} />
            </div>

            {isNativePlatform() && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={async () => {
                    setRestoreMessage(null);
                    const success = await restore();
                    setRestoreMessage(success ? 'Purchases restored!' : 'No purchases found.');
                    setTimeout(() => setRestoreMessage(null), 3000);
                  }}
                  className="text-xs text-gray-400/70 hover:text-gray-400 transition-colors uppercase tracking-widest"
                >
                  Restore Purchases
                </button>
                {restoreMessage && (
                  <span className="text-xs text-gray-500">{restoreMessage}</span>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm py-3 z-50 flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <Link href="/">
          <button
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Back
          </button>
        </Link>
      </div>
    </GameLayout>
  );
}
