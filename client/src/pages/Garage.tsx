import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, TEAM_COLORS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronDown, BarChart3, Zap, Volume2, VolumeX, Flag, Gauge } from "lucide-react";

export default function Garage() {
  const { state, toggleSound, toggleSimMode, resetAllData, getTopLapTimes, setTeamColor } = useGameState();
  const [showRegulations, setShowRegulations] = useState(false);
  const topTimes = getTopLapTimes(3);

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

  const currentTeam = TEAM_COLORS.find(t => t.hex === state.teamColor) || TEAM_COLORS[0];

  return (
    <GameLayout coins={state.coins}>
      <div className="min-h-screen p-4 md:p-5 bg-[#ffffff]">
        <div className="max-w-2xl mx-auto">
          
          <div className="flex items-center gap-3 mb-5">
            <Link href="/">
              <button className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-[#000000]" data-testid="button-back">
                <ChevronLeft className="w-6 h-6 text-black" />
              </button>
            </Link>
            <h1 className="text-lg font-bold tracking-widest uppercase text-[#000000cc]">Engineering Dashboard</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            <div 
              className="col-span-2 bg-white border border-gray-200 rounded-2xl p-4 active:scale-[0.98] transition-transform"
              data-testid="card-driver-profile"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Driver Profile</p>
                  <h2 className="text-xl font-bold text-gray-900">Race Driver</h2>
                  <p className="text-sm text-gray-500 mt-1">Team: {currentTeam.name}</p>
                </div>
                <div className="flex gap-2">
                  {TEAM_COLORS.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setTeamColor(team.hex)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        state.teamColor === team.hex 
                          ? "border-gray-900 scale-110 ring-2 ring-gray-300" 
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: team.hex }}
                      title={team.name}
                      data-testid={`color-${team.id}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div 
              className="col-span-2 bg-white border border-gray-200 rounded-2xl p-4"
              data-testid="card-telemetry"
            >
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Telemetry</p>
              <div className="flex justify-between items-end">
                <div className="text-center flex-1" data-testid="stat-laps">
                  <div 
                    className="text-3xl md:text-4xl font-mono font-bold"
                    style={{ color: state.teamColor }}
                  >
                    {state.totalLaps}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Total Laps</div>
                </div>
                <div className="text-center flex-1" data-testid="stat-points">
                  <div 
                    className="text-3xl md:text-4xl font-mono font-bold"
                    style={{ color: state.teamColor }}
                  >
                    {state.careerPoints}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Career Pts</div>
                </div>
                <div className="text-center flex-1" data-testid="stat-wins">
                  <div 
                    className="text-3xl md:text-4xl font-mono font-bold"
                    style={{ color: state.teamColor }}
                  >
                    {state.racesWon}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Races Won</div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200" data-testid="session-lap-times">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Session Best Laps</p>
                {topTimes.length > 0 ? (
                  <div className="flex gap-4 text-sm font-mono">
                    {topTimes.slice(0, 3).map((time, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <span className="text-gray-400">P{index + 1}</span>
                        <span className={index === 0 ? "font-bold" : "text-gray-500"} style={index === 0 ? { color: state.teamColor } : {}}>
                          {formatTime(time)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No races completed this session</p>
                )}
              </div>
            </div>

            <Link href="/strategy" className="col-span-1">
              <div 
                className="h-full bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-strategy-guide"
              >
                <BarChart3 className="w-8 h-8 text-purple-500" />
                <span className="text-xs uppercase tracking-widest text-gray-600">Strategy Guide</span>
              </div>
            </Link>

            <Link href="/reaction" className="col-span-1">
              <div 
                className="h-full bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[100px]"
                data-testid="button-reflex-training"
              >
                <Zap className="w-8 h-8 text-yellow-500" />
                <span className="text-xs uppercase tracking-widest text-gray-600">Reflex Test</span>
              </div>
            </Link>

            <div 
              className="col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden"
              data-testid="card-regulations"
            >
              <button
                onClick={() => setShowRegulations(!showRegulations)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Flag className="w-5 h-5 text-gray-400" />
                  <span className="text-xs uppercase tracking-widest text-gray-600">Race Regulations</span>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-gray-400 transition-transform",
                  showRegulations && "rotate-180"
                )} />
              </button>
              
              {showRegulations && (
                <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 border-t border-gray-200 pt-3">
                  <p><span className="font-bold text-gray-900">RACE</span> — Answer 20 questions to finish.</p>
                  <p><span className="font-bold text-gray-900">OVERTAKE</span> — Solve correctly in detection points to engage Active Aero, reduce drag and fly.</p>
                  <p><span className="font-bold text-gray-900">TRACK LIMITS</span> — Wrong answers make you spin and lose time.</p>
                </div>
              )}
            </div>

            <div 
              className="col-span-2 bg-white border border-gray-200 rounded-2xl p-4"
              data-testid="card-pit-console"
            >
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Pit Console</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between" data-testid="toggle-sound">
                  <div className="flex items-center gap-3">
                    {state.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-gray-400" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-700">Pit Radio</span>
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
                    <Gauge className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-700">Realism Mode</span>
                      <p className="text-[10px] text-gray-400">Full race distance</p>
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

                <div className="pt-3 border-t border-gray-200 mt-4">
                  <button
                    onClick={handleRetireCar}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                    data-testid="button-retire"
                  >
                    Retire from Championship →
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </GameLayout>
  );
}
