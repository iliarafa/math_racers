import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronDown, TrendingUp, Volume2, VolumeX, Flag, Gauge, Clock, Zap } from "lucide-react";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, togglePowerUps, resetAllData, getLapHistory } = useGameState();
  const [showFullLog, setShowFullLog] = useState(false);
  const lapHistory = getLapHistory(20);

  const getSeriesLabel = (series?: string): string => {
    switch (series) {
      case 'karting': return 'KART';
      case 'f3': return 'F3';
      case 'f2': return 'F2';
      case 'f1': return 'F1';
      default: return '';
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleRetireCar = () => {
    if (confirm("Are you sure you want to retire? This will reset ALL your progress.")) {
      resetAllData();
    }
  };

  return (
    <GameLayout hideGarageButton darkBackground lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-black">
        <div className="max-w-2xl md:max-w-3xl mx-auto">

          <div className="flex items-center gap-3 mb-5">
            <Link href="/">
              <button className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-white/10 rounded-full transition-colors text-white" data-testid="button-back">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            </Link>
            <h1 className="text-lg font-bold tracking-widest uppercase text-white"> Dashboard</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Link href="/regulations" className="col-span-1">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-regulations"
              >
                <Flag className="w-8 h-8 text-white" />
                <span className="text-xs uppercase tracking-widest text-white/70">Race Regulations</span>
              </div>
            </Link>

            <Link href="/strategy" className="col-span-1">
              <div
                className="h-full bg-black border border-[#333] rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-strategy-guide"
              >
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <span className="text-xs uppercase tracking-widest text-white/70">Strategy Guide</span>
              </div>
            </Link>

            <Link href="/reaction" className="col-span-1">
              <div
                className="h-full border border-[#333] rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#1a1a1a] active:scale-[0.98] transition-all min-h-[100px] bg-black"
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

            <div
              className="sm:col-span-2 bg-black border border-[#333] rounded-2xl p-4 shadow-lg"
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

                <div className="pt-3 border-t border-[#333] mt-4">
                  <button
                    onClick={handleRetireCar}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors uppercase tracking-widest"
                    data-testid="button-retire"
                  >
                    Retire from Championship →
                  </button>
                </div>
              </div>
            </div>

            <div
              className="sm:col-span-2 border border-[#333] rounded-2xl p-4 shadow-lg bg-[#000000]"
              data-testid="card-career"
            >
              <p className="text-xs uppercase tracking-widest text-white/50 mb-3">Career</p>
              <div className="flex justify-between items-end">
                <div className="text-center flex-1" data-testid="stat-laps">
                  <div className="text-3xl md:text-4xl font-normal text-white" style={{ fontFamily: 'Formula1' }}>
                    {state.totalLaps}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Total Laps</div>
                </div>
                <div className="text-center flex-1" data-testid="stat-points">
                  <div className="text-3xl md:text-4xl font-normal text-white" style={{ fontFamily: 'Formula1' }}>
                    {state.careerPoints}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Career Pts</div>
                </div>
                <div className="text-center flex-1" data-testid="stat-wins">
                  <div className="text-3xl md:text-4xl font-normal text-white" style={{ fontFamily: 'Formula1' }}>
                    {state.racesWon}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Races Won</div>
                </div>
              </div>
            </div>

            <div
              className="sm:col-span-2 bg-black border border-[#333] rounded-2xl shadow-lg overflow-hidden"
              data-testid="card-racer-log"
            >
              <button
                onClick={() => setShowFullLog(!showFullLog)}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-white/50" />
                  <span className="text-xs uppercase tracking-widest text-white/70">Racer Log</span>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-white/50 transition-transform",
                  showFullLog && "rotate-180"
                )} />
              </button>

              <div className="px-4 pb-4">
                {lapHistory.length > 0 ? (
                  <div className="space-y-2">
                    {(showFullLog ? lapHistory : lapHistory.slice(0, 3)).map((lap, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-[#333] last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 text-xs font-mono w-6">#{index + 1}</span>
                          <span className="text-white/80 text-sm">{lap.trackName}</span>
                        </div>
                        <span className="text-white font-mono text-sm" style={{ color: index === 0 ? state.teamColor : undefined }}>
                          {lap.series && <span className="text-white/50 mr-2">{getSeriesLabel(lap.series)} |</span>}
                          {formatTime(lap.time)}
                        </span>
                      </div>
                    ))}
                    {!showFullLog && lapHistory.length > 3 && (
                      <p className="text-xs text-white/40 text-center pt-2">
                        Tap to see {lapHistory.length - 3} more laps
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center py-2">No races completed yet</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </GameLayout>
  );
}
