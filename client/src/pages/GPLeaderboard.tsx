import { useState, useEffect } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { getGPLeaderboard } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Trophy, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GPLeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  circuitId: string;
  circuitName: string;
  operation: string;
  totalTime: number;
  mistakes: number;
  accuracy: number;
  difficultyAchieved: string;
  polePosition: boolean;
  createdAt: string;
}

const OPERATIONS = ['All', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'];

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Karting',
  easy: 'F3',
  medium: 'F2',
  hard: 'F1',
};

function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

export default function GPLeaderboard() {
  const { state } = useGameState();
  const [entries, setEntries] = useState<GPLeaderboardEntry[]>([]);
  const [selectedOp, setSelectedOp] = useState('All');
  const [selectedCircuit, setSelectedCircuit] = useState('All');
  const [circuits, setCircuits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setShowAll(false);
    setSearchQuery('');
    const circuitId = selectedCircuit !== 'All' ? selectedCircuit : undefined;
    const op = selectedOp !== 'All' ? selectedOp : undefined;
    getGPLeaderboard(circuitId, op, 50)
      .then(data => {
        const mapped = data.map((e: any) => ({
          id: e.id,
          playerId: e.player_id,
          playerName: e.player_name,
          circuitId: e.circuit_id,
          circuitName: e.circuit_name,
          operation: e.operation,
          totalTime: e.total_time,
          mistakes: e.mistakes,
          accuracy: e.accuracy,
          difficultyAchieved: e.difficulty_achieved,
          polePosition: e.pole_position,
          createdAt: e.created_at,
        }));
        setEntries(mapped);
        // Build unique circuits list from all entries
        if (selectedCircuit === 'All' && selectedOp === 'All') {
          const seen = new Map<string, string>();
          mapped.forEach((e: GPLeaderboardEntry) => {
            if (!seen.has(e.circuitId)) seen.set(e.circuitId, e.circuitName);
          });
          setCircuits(Array.from(seen, ([id, name]) => ({ id, name })));
        }
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setError('offline');
        setLoading(false);
      });
  }, [selectedOp, selectedCircuit]);

  const INITIAL_COUNT = 50;
  const filteredEntries = searchQuery
    ? entries.filter(e => e.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;
  const visibleEntries = showAll || searchQuery ? filteredEntries : filteredEntries.slice(0, INITIAL_COUNT);
  const hasMore = !searchQuery && filteredEntries.length > INITIAL_COUNT;

  return (
    <GameLayout hideGarageButton lockViewport hideHeader>
      <div className="fixed inset-0 overflow-y-auto p-4 md:p-8 pb-20 bg-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="mb-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-lg md:text-xl font-bold tracking-widest uppercase text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>Grand Prix Leaderboard</h1>
            </div>
            <p className="text-xs text-black/70 mt-1 ml-9">Complete a Grand Prix race weekend to enter.</p>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {circuits.length > 0 && (
              <Select value={selectedCircuit} onValueChange={setSelectedCircuit}>
                <SelectTrigger
                  className="w-40 bg-neutral-100 border-neutral-200 text-black text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-100 border-neutral-200">
                  <SelectItem
                    value="All"
                    className="text-black text-xs font-medium uppercase tracking-wider focus:bg-yellow-400 focus:text-black"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    All Circuits
                  </SelectItem>
                  {circuits.map(c => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="text-black text-xs font-medium uppercase tracking-wider focus:bg-yellow-400 focus:text-black"
                      style={{ fontFamily: 'Oxanium, sans-serif' }}
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger
                className="w-48 bg-neutral-100 border-neutral-200 text-black text-xs font-medium uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-100 border-neutral-200">
                {OPERATIONS.map(op => (
                  <SelectItem
                    key={op}
                    value={op}
                    className="text-black text-xs font-medium uppercase tracking-wider focus:bg-yellow-400 focus:text-black"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="flex-1 relative min-w-[120px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="w-full bg-neutral-100 border border-neutral-200 rounded-md pl-8 pr-3 py-2 text-black text-xs font-medium uppercase tracking-wider placeholder:text-black/30 focus:outline-none focus:border-yellow-400/50"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-black/70 text-sm uppercase tracking-widest">Loading...</div>
            </div>
          ) : error === 'offline' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-black/40" />
              <div className="text-black/70 text-sm uppercase tracking-widest">Leaderboard Unavailable</div>
              <p className="text-black/50 text-xs">Connect to the internet to view rankings</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-black/40" />
              <div className="text-black/70 text-sm uppercase tracking-widest">No entries yet</div>
              <p className="text-black/50 text-xs">Complete a Grand Prix race weekend to appear here</p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Search className="w-12 h-12 text-black/40" />
              <div className="text-black/70 text-sm uppercase tracking-widest">No results</div>
              <p className="text-black/50 text-xs">No players matching "{searchQuery}"</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleEntries.map((entry) => {
                  const rank = entries.indexOf(entry) + 1;
                  const isCurrentPlayer = entry.playerId === state.playerId;
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                        isCurrentPlayer
                          ? "bg-yellow-400/10 border-yellow-400/30"
                          : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      {/* Rank */}
                      <div className="w-8 flex-shrink-0 text-center">
                        {rank === 1 ? (
                          <span className="text-lg" role="img">🥇</span>
                        ) : rank === 2 ? (
                          <span className="text-lg" role="img">🥈</span>
                        ) : rank === 3 ? (
                          <span className="text-lg" role="img">🥉</span>
                        ) : (
                          <span className="text-sm font-bold text-black/70" style={{ fontFamily: 'Oxanium, sans-serif' }}>{rank}</span>
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold truncate", isCurrentPlayer ? "text-yellow-500" : "text-black")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                            {entry.playerName}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded uppercase tracking-wider">YOU</span>
                          )}
                          {entry.polePosition && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">POLE</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-black/70 uppercase tracking-wider">{entry.circuitName}</span>
                          <span className="text-[10px] text-black/50">•</span>
                          <span className="text-[10px] text-black/70 uppercase tracking-wider">{entry.operation}</span>
                          <span className="text-[10px] text-black/50">•</span>
                          <span className="text-[10px] text-black/70">{DIFFICULTY_LABELS[entry.difficultyAchieved] || entry.difficultyAchieved}</span>
                          <span className="text-[10px] text-black/50">•</span>
                          <span className="text-[10px] text-black/70 font-mono">{formatTime(entry.totalTime)}</span>
                          <span className="text-[10px] text-black/50">•</span>
                          <span className="text-[10px] text-black/70">{entry.accuracy}%</span>
                        </div>
                      </div>

                      {/* Mistakes */}
                      <div className="flex-shrink-0 text-right">
                        <div className={cn("text-lg font-bold", entry.mistakes === 0 ? "text-green-600" : "text-black")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                          {entry.mistakes}
                        </div>
                        <div className="text-[10px] text-black/50 uppercase tracking-wider">{entry.mistakes === 1 ? 'mistake' : 'mistakes'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show more */}
              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-3 py-3 text-sm uppercase tracking-wider text-gray-400 hover:text-black transition-colors border border-neutral-200 rounded-xl bg-neutral-50 hover:border-neutral-300"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  Show All ({filteredEntries.length - INITIAL_COUNT} more)
                </button>
              )}
            </>
          )}

        </div>
      </div>

      {/* Sticky bottom back button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-center py-3 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button
          onClick={() => window.history.back()}
          className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
        >
          Back
        </button>
      </div>
    </GameLayout>
  );
}
