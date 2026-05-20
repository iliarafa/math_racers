import { useState, useEffect } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { getLeaderboard, getLaneRacerLeaderboard, getGPLeaderboard } from "@/lib/supabase";
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
  circuitName?: string;
  polePosition?: boolean;
}

const OPERATIONS = ['All', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'];
const CIRCUIT_FILTERS = ['All', 'Monza', 'Spa', 'Monaco', 'Suzuka', 'Silverstone'];
const CIRCUIT_ID_MAP: Record<string, string> = {
  Monza: 'monza', Spa: 'spa', Monaco: 'monaco', Suzuka: 'suzuka', Silverstone: 'silverstone',
};

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

type TabMode = 'pst' | 'lane-racer' | 'grand-prix';

export default function Leaderboard() {
  const { state } = useGameState();
  const [activeTab, setActiveTab] = useState<TabMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'lane-racer') return 'lane-racer';
    if (mode === 'grand-prix') return 'grand-prix';
    return 'pst';
  });
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedOp, setSelectedOp] = useState('All');
  const [selectedCircuit, setSelectedCircuit] = useState('All');
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

    if (activeTab === 'pst') {
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
    } else if (activeTab === 'grand-prix') {
      getGPLeaderboard(undefined, op, 50)
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
            circuitName: e.circuit_name,
            polePosition: e.pole_position,
          })));
          setLoading(false);
        })
        .catch(() => {
          setEntries([]);
          setError('offline');
          setLoading(false);
        });
    } else {
      const circuitId = selectedCircuit !== 'All' ? CIRCUIT_ID_MAP[selectedCircuit] : undefined;
      getLaneRacerLeaderboard(circuitId, op, 50)
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
            circuitName: e.circuit_name,
          })));
          setLoading(false);
        })
        .catch(() => {
          setEntries([]);
          setError('offline');
          setLoading(false);
        });
    }
  }, [selectedOp, activeTab, selectedCircuit]);

  const INITIAL_COUNT = 50;
  const filteredEntries = searchQuery
    ? entries.filter(e => e.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;
  const visibleEntries = showAll || searchQuery ? filteredEntries : filteredEntries.slice(0, INITIAL_COUNT);
  const hasMore = !searchQuery && filteredEntries.length > INITIAL_COUNT;

  return (
    <GameLayout hideGarageButton lockViewport backHref="/garage" darkBackground>
      <div className="fixed inset-0 overflow-y-auto p-4 md:p-8 pb-20" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="mb-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-lg md:text-xl font-bold tracking-widest uppercase text-white">Leaderboard</h1>
            </div>
            <p className="text-xs text-white/70 mt-1 ml-9">
              {activeTab === 'pst' ? 'Record 100 laps in Free Practice to enter.' : activeTab === 'grand-prix' ? 'Finish a Grand Prix Race Day to enter.' : 'Complete a Lane Racer race to enter.'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setActiveTab('pst'); setSelectedOp('All'); setSelectedCircuit('All'); }}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                activeTab === 'pst'
                  ? "bg-yellow-400 text-black"
                  : "bg-white/10 text-white/50 hover:text-white"
              )}
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              Free Practice
            </button>
            <button
              onClick={() => { setActiveTab('lane-racer'); setSelectedOp('All'); setSelectedCircuit('All'); }}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                activeTab === 'lane-racer'
                  ? "bg-yellow-400 text-black"
                  : "bg-white/10 text-white/50 hover:text-white"
              )}
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              Lane Racer
            </button>
            <button
              onClick={() => { setActiveTab('grand-prix'); setSelectedOp('All'); setSelectedCircuit('All'); }}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                activeTab === 'grand-prix'
                  ? "bg-yellow-400 text-black"
                  : "bg-white/10 text-white/50 hover:text-white"
              )}
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              Grand Prix
            </button>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 mb-5">
            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger
                className="w-48 bg-white/10 border-white/20 text-white text-xs font-medium uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/20">
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

            {activeTab === 'lane-racer' && (
              <Select value={selectedCircuit} onValueChange={setSelectedCircuit}>
                <SelectTrigger
                  className="w-48 bg-white/10 border-white/20 text-white text-xs font-medium uppercase tracking-wider"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/20">
                  {CIRCUIT_FILTERS.map(c => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-white text-xs font-medium uppercase tracking-wider focus:bg-yellow-400 focus:text-black"
                      style={{ fontFamily: 'Oxanium, sans-serif' }}
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search player..."
                className="w-full bg-white/10 border border-white/20 rounded-md pl-8 pr-3 py-2 text-white text-xs font-medium uppercase tracking-wider placeholder:text-white/30 focus:outline-none focus:border-yellow-400/50"
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
              <p className="text-white/50 text-xs">
                {activeTab === 'pst' ? 'Complete a 57-lap PST cycle to appear here' : activeTab === 'grand-prix' ? 'Finish a Grand Prix Race Day to appear here' : 'Complete a Lane Racer race to appear here'}
              </p>
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
                          : "bg-white/5 border-white/10 hover:border-white/20"
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
                          <span className={cn("text-sm font-bold truncate", isCurrentPlayer ? "text-yellow-500" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                            {entry.playerName}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded uppercase tracking-wider">YOU</span>
                          )}
                          {activeTab === 'grand-prix' && entry.polePosition && (
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">POLE</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {(activeTab === 'lane-racer' || activeTab === 'grand-prix') && entry.circuitName && (
                            <>
                              <span className="text-[10px] text-white/70 uppercase tracking-wider">{entry.circuitName}</span>
                              <span className="text-[10px] text-white/50">•</span>
                            </>
                          )}
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
                        <div className={cn("text-lg font-bold", rank <= 3 ? "text-yellow-500" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
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
                  className="w-full mt-3 py-3 text-sm uppercase tracking-wider text-white/40 hover:text-white transition-colors border border-white/10 rounded-xl bg-white/5 hover:border-white/20"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  Show All ({filteredEntries.length - INITIAL_COUNT} more)
                </button>
              )}
            </>
          )}

        </div>
      </div>

    </GameLayout>
  );
}
