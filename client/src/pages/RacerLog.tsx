import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, LapEntry, BADGE_EVERYTHING_IS_PURPLE } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";

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
  const hasPurpleBadge = state.earnedBadges.includes(BADGE_EVERYTHING_IS_PURPLE);

  return (
    <GameLayout hideGarageButton lockViewport backHref="/garage" darkBackground>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-white text-center mb-6"
            style={{ fontFamily: 'Oxanium, sans-serif' }}>RACER LOG</h1>
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="mb-8">
            <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3 pb-2">
              Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-md border px-3 py-2 min-w-[7.5rem]',
                  hasPurpleBadge
                    ? 'bg-purple-600 border-purple-300/50 text-white'
                    : 'bg-transparent border-white/20 text-white/30'
                )}
                style={{ fontFamily: 'Oxanium, sans-serif' }}
                data-testid="badge-everything-is-purple"
              >
                <span className={cn('text-lg font-bold leading-none', hasPurpleBadge ? 'text-white' : 'text-white/25')}>
                  P
                </span>
                <span className="text-[9px] uppercase tracking-widest text-center leading-tight">
                  {hasPurpleBadge ? 'Everything Is Purple' : 'Locked'}
                </span>
              </div>
            </div>
          </div>

          {!hasEntries ? (
            <p className="text-sm text-white/40 text-center py-12 font-mono">No data recorded.</p>
          ) : (
            <div className="space-y-8">
              {orderedKeys.map(key => {
                const entries = grouped[key];
                const label = SERIES_LABELS[key] || 'LEGACY';
                return (
                  <div key={key}>
                    <h2 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3 pb-2">
                      {label}
                    </h2>
                    <div className="space-y-0">
                      <div className="grid grid-cols-[2rem_1fr_5.5rem_4.5rem] gap-2 px-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-mono">
                        <span>#</span>
                        <span>Circuit</span>
                        <span className="text-right">Time</span>
                        <span className="text-right">Date</span>
                      </div>
                      {entries.map((lap, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[2rem_1fr_5.5rem_4.5rem] gap-2 px-2 py-2 text-sm"
                        >
                          <span className="text-white/30 font-mono text-xs leading-5">{index + 1}</span>
                          <span className="text-white/80">{lap.trackName}</span>
                          <span className="text-white font-mono text-xs text-right leading-5">{formatTime(lap.time)}</span>
                          <span className="text-white/40 font-mono text-xs text-right leading-5">{formatDate(lap.timestamp)}</span>
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

      <div className="fixed bottom-0 left-0 right-0 bg-neutral-700/90 backdrop-blur-sm py-4 px-4 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="max-w-2xl md:max-w-4xl mx-auto flex justify-between items-end">
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.totalLaps}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Total Laps</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.careerPoints}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Career Pts</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl md:text-3xl text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {state.racesWon}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Races Won</div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
