import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { TrendingUp, Volume2, VolumeX, Flag, Gauge, Zap, Trophy, ClipboardList, RotateCcw, ChevronLeft, Map, LayoutGrid } from "lucide-react";
import { usePurchase } from "@/hooks/use-purchase";
import { isNativePlatform } from "@/lib/purchases";
import garageSound from "@/assets/garsound.m4a";
import garageBackground from "@assets/garage_background.mp4";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, togglePowerUps, toggleRaceMapView, resetAllData } = useGameState();
  const { isPremium, restore } = usePurchase();
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(garageSound);
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.soundEnabled) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [state.soundEnabled]);

  const handleRetireCar = () => {
    if (confirm("Are you sure you want to retire? This will reset ALL your progress.")) {
      resetAllData();
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#000000', fontFamily: 'Oxanium, sans-serif' }}>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 scale-150"
      >
        <source src={garageBackground} type="video/mp4" />
      </video>

      {/* Header */}
      <div className="flex items-center px-4 relative z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '8px' }}>
        <Link href="/hub">
          <button className="flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <h1 className="text-4xl md:text-5xl font-bold tracking-widest uppercase text-white mb-8 text-center">Garage</h1>

          <div className="flex flex-col gap-8">

            {/* Navigation grid */}
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={toggleSound}
                className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-sound"
              >
                {state.soundEnabled ? (
                  <Volume2 className="w-10 h-10 text-green-500" />
                ) : (
                  <VolumeX className="w-10 h-10 text-white" />
                )}
                <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Sound</span>
              </div>
              <div
                onClick={isPremium ? toggleSimMode : undefined}
                className={cn("rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 transition-all", isPremium ? "cursor-pointer active:scale-[0.97]" : "opacity-40")}
                data-testid="button-realism"
              >
                <Gauge className={cn("w-10 h-10", state.simMode ? "text-green-500" : "text-white")} />
                <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Realism</span>
              </div>
              <div
                onClick={togglePowerUps}
                className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-powerups"
              >
                <Zap className={cn("w-10 h-10", state.powerUpsEnabled ? "text-green-500" : "text-white")} />
                <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Power-Ups</span>
              </div>
              <div
                onClick={toggleRaceMapView}
                className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-race-map-view"
              >
                {state.raceMapView === 'track' ? (
                  <Map className="w-10 h-10 text-green-500" />
                ) : (
                  <LayoutGrid className="w-10 h-10 text-green-500" />
                )}
                <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">
                  {state.raceMapView === 'track' ? 'Track' : 'Sectors'}
                </span>
              </div>
              <Link href="/reaction">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-reflex-training">
                  <div className="flex gap-0.5 h-10 items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Reflex</span>
                </div>
              </Link>
              <Link href="/racer-log">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-racer-log">
                  <ClipboardList className="w-10 h-10 text-white" />
                  <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Racer Log</span>
                </div>
              </Link>
              <Link href="/leaderboard">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-leaderboard">
                  <Trophy className="w-10 h-10 text-white" />
                  <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Leaderboard</span>
                </div>
              </Link>
              <Link href="/regulations">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-regulations">
                  <Flag className="w-10 h-10 text-white" />
                  <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Regulations</span>
                </div>
              </Link>
              <Link href="/strategy">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all" data-testid="button-strategy-guide">
                  <TrendingUp className="w-10 h-10 text-white" />
                  <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Strategy</span>
                </div>
              </Link>
              <div
                onClick={handleRetireCar}
                className="rounded-xl bg-white/10 backdrop-blur-sm p-4 flex flex-col items-center gap-3 cursor-pointer active:scale-[0.97] transition-all"
                data-testid="button-retire"
              >
                <RotateCcw className="w-10 h-10 text-white" />
                <span className="text-xs uppercase tracking-widest text-white/70 text-center leading-tight">Reset</span>
              </div>
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
                  className="text-xs text-white/40 hover:text-white/60 transition-colors uppercase tracking-widest"
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
    </div>
  );
}
