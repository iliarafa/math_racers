import { useState, useEffect } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { ChevronLeft, Trophy } from "lucide-react";
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedOp !== 'All') params.set('operation', selectedOp);
    params.set('limit', '50');

    fetch(`/api/leaderboard?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setError('offline');
        setLoading(false);
      });
  }, [selectedOp]);

  return (
    <GameLayout hideGarageButton darkBackground lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <div className="flex items-center gap-3 mb-2">
            <Link href="/garage">
              <button className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            </Link>
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-widest uppercase text-white">Leaderboard</h1>
          </div>
          <p className="text-xs text-white/40 mb-5 ml-12">Pre-Season Testing — Bahrain — 57-lap cycles</p>

          {/* Operation filter */}
          <div className="mb-5">
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
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/40 text-sm uppercase tracking-widest">Loading...</div>
            </div>
          ) : error === 'offline' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-white/20" />
              <div className="text-white/40 text-sm uppercase tracking-widest">Leaderboard Unavailable</div>
              <p className="text-white/25 text-xs">Connect to the internet to view rankings</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Trophy className="w-12 h-12 text-white/20" />
              <div className="text-white/40 text-sm uppercase tracking-widest">No entries yet</div>
              <p className="text-white/25 text-xs">Complete a 57-lap PST cycle to appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
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
                        <span className="text-sm font-bold text-white/40" style={{ fontFamily: 'Oxanium, sans-serif' }}>{rank}</span>
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
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{entry.operation}</span>
                        <span className="text-[10px] text-white/30">•</span>
                        <span className="text-[10px] text-white/40">{DIFFICULTY_LABELS[entry.difficultyAchieved] || entry.difficultyAchieved}</span>
                        <span className="text-[10px] text-white/30">•</span>
                        <span className="text-[10px] text-white/40 font-mono">{formatTime(entry.totalTime)}</span>
                        <span className="text-[10px] text-white/30">•</span>
                        <span className="text-[10px] text-white/40">{entry.accuracy}%</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className={cn("text-lg font-bold", rank <= 3 ? "text-yellow-400" : "text-white")} style={{ fontFamily: 'Oxanium, sans-serif' }}>
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider">pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </GameLayout>
  );
}
