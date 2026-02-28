import { useState, useEffect } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { getLeaderboard } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Trophy, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  operation: string;
  score: number;
  totalTime: number;
  mistakes: number;
  accuracy: number;
  difficultyAchieved: string;
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

export default function Leaderboard() {
  const { state } = useGameState();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedOp, setSelectedOp] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setShowAll(false);
    setSearchQuery('');
    const op = selectedOp !== 'All' ? selectedOp : undefined;
    getLeaderboard(op, 50)
      .then(data => {
        setEntries(data.map((e: any) => ({
          id: e.id,
          playerId: e.player_id,
          playerName: e.player_name,
          operation: e.operation,
          score: e.score,
          totalTime: e.total_time,
          mistakes: e.mistakes,
          accuracy: e.accuracy,
          difficultyAchieved: e.difficulty_achieved,
          createdAt: e.created_at,
        })));
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setError('offline');
        setLoading(false);
      });
  }, [selectedOp]);

  const INITIAL_COUNT = 50;
  const filteredEntries = searchQuery
    ? entries.filter(e => e.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;
  const visibleEntries = showAll || searchQuery ? filteredEntries : filteredEntries.slice(0, INITIAL_COUNT);
  const hasMore = !searchQuery && filteredEntries.length > INITIAL_COUNT;

  return (
    <GameLayout hideGarageButton darkBackground lockViewport hideHeader>
      <div className="fixed inset-0 overflow-y-auto p-4 md:p-8 pb-20 bg-black" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-widest uppercase text-white">Leaderboard</h1>
          </div>
          <p className="text-xs text-white/70 mb-5 ml-9">Free Practice — 100 laps</p>

          {/* Filters row */}
          <div className="flex items-center gap-3 mb-5">
            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger
                className="w-48 bg-[#1a1a1a] border-[#333] text-white text-xs font-medium uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                {OPERATIONS.map(op => (
                  <SelectItem
                    key={op}
                    value={op}
                    className="text-white text-xs font-medium uppercase tracking-wider focus:bg-yellow-400 focus:text-black"
                    style={{ fontFamily: 'Oxanium, sans-serif' }}
                  >
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-md pl-8 pr-3 py-2 text-white text-xs font-medium uppercase tracking-wider placeholder:text-white/30 focus:outline-none focus:border-yellow-400/50"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/70 text-sm uppercase tracking-widest">Loading...</div>
            </div>
          ) : error === 'offline' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-white/40" />
              <div className="text-white/70 text-sm uppercase tracking-widest">Leaderboard Unavailable</div>
              <p className="text-white/50 text-xs">Connect to the internet to view rankings</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-white/40" />
              <div className="text-white/70 text-sm uppercase tracking-widest">No entries yet</div>
              <p className="text-white/50 text-xs">Complete a 57-lap PST cycle to appear here</p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Search className="w-12 h-12 text-white/40" />
              <div className="text-white/70 text-sm uppercase tracking-widest">No results</div>
              <p className="text-white/50 text-xs">No players matching "{searchQuery}"</p>
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
                          : "bg-[#111] border-[#222] hover:border-[#333]"
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
                          <span className="text-sm font-bold text-white/70" style={{ fontFamily: 'Oxanium, sans-serif' }}>{rank}</span>
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold truncate", isCurrentPlayer ? "text-yellow-400" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                            {entry.playerName}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded uppercase tracking-wider">YOU</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-white/70 uppercase tracking-wider">{entry.operation}</span>
                          <span className="text-[10px] text-white/50">•</span>
                          <span className="text-[10px] text-white/70">{DIFFICULTY_LABELS[entry.difficultyAchieved] || entry.difficultyAchieved}</span>
                          <span className="text-[10px] text-white/50">•</span>
                          <span className="text-[10px] text-white/70 font-mono">{formatTime(entry.totalTime)}</span>
                          <span className="text-[10px] text-white/50">•</span>
                          <span className="text-[10px] text-white/70">{entry.accuracy}%</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-right">
                        <div className={cn("text-lg font-bold", rank <= 3 ? "text-yellow-400" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                          {entry.score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-white/50 uppercase tracking-wider">pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show more */}
              {hasMore && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-3 py-3 text-sm uppercase tracking-wider text-gray-400 hover:text-white transition-colors border border-[#222] rounded-xl bg-[#111] hover:border-[#333]"
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
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm flex justify-center py-3 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <Link href="/garage">
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
