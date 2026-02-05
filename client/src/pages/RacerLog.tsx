import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, LapEntry } from "@/lib/gameLogic";
import { ChevronLeft } from "lucide-react";

const SERIES_ORDER = ['f1', 'f2', 'f3', 'karting'] as const;

const SERIES_LABELS: Record<string, string> = {
  f1: 'F1',
  f2: 'F2',
  f3: 'F3',
  karting: 'KARTING',
};

function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export default function RacerLog() {
  const { state } = useGameState();
  const lapHistory = state.lapHistory;

  const grouped: Record<string, LapEntry[]> = {};
  for (const lap of lapHistory) {
    const key = lap.series || 'legacy';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(lap);
  }

  const orderedKeys = [
    ...SERIES_ORDER.filter(s => grouped[s]),
    ...(grouped['legacy'] ? ['legacy'] : []),
  ];

  const hasEntries = lapHistory.length > 0;

  return (
    <GameLayout hideGarageButton lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <Link href="/garage">
              <button className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-black" />
              </button>
            </Link>
            <h1 className="text-lg md:text-xl font-bold tracking-widest uppercase text-black">Racer Log</h1>
          </div>

          {!hasEntries ? (
            <p className="text-sm text-black/40 text-center py-12 font-mono">No data recorded.</p>
          ) : (
            <div className="space-y-8">
              {orderedKeys.map(key => {
                const entries = grouped[key];
                const label = SERIES_LABELS[key] || 'LEGACY';
                return (
                  <div key={key}>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-black/40 mb-3 border-b border-black/10 pb-2">
                      {label}
                    </h2>
                    <div className="space-y-0">
                      <div className="grid grid-cols-[2rem_1fr_5.5rem_4.5rem] gap-2 px-2 pb-1 text-[10px] uppercase tracking-widest text-black/30 font-mono">
                        <span>#</span>
                        <span>Circuit</span>
                        <span className="text-right">Time</span>
                        <span className="text-right">Date</span>
                      </div>
                      {entries.map((lap, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[2rem_1fr_5.5rem_4.5rem] gap-2 px-2 py-2 border-b border-black/5 last:border-0 text-sm"
                        >
                          <span className="text-black/30 font-mono text-xs leading-5">{index + 1}</span>
                          <span className="text-black/80">{lap.trackName}</span>
                          <span className="text-black font-mono text-xs text-right leading-5">{formatTime(lap.time)}</span>
                          <span className="text-black/40 font-mono text-xs text-right leading-5">{formatDate(lap.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 py-5 pb-8 px-4 z-50">
        <div className="max-w-2xl md:max-w-4xl mx-auto flex justify-between items-end">
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.totalLaps}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-black/40 mt-1">Total Laps</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.careerPoints}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-black/40 mt-1">Career Pts</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.racesWon}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-black/40 mt-1">Races Won</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
