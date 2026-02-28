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

// TODO: REMOVE FAKE DATA — temporary for visual testing
const FAKE_ENTRIES: LeaderboardEntry[] = [
  { id: 'f1', playerId: 'p1', playerName: 'Verstappen_33', operation: 'Multiplication', score: 98200, totalTime: 185000, mistakes: 1, accuracy: 99, difficultyAchieved: 'hard', createdAt: '' },
  { id: 'f2', playerId: 'p2', playerName: 'LandoNorris', operation: 'Addition', score: 95800, totalTime: 192000, mistakes: 2, accuracy: 98, difficultyAchieved: 'hard', createdAt: '' },
  { id: 'f3', playerId: 'p3', playerName: 'Leclerc_CL16', operation: 'Division', score: 93100, totalTime: 198000, mistakes: 3, accuracy: 97, difficultyAchieved: 'hard', createdAt: '' },
  { id: 'f4', playerId: 'p4', playerName: 'Oscar_P', operation: 'Subtraction', score: 89400, totalTime: 205000, mistakes: 4, accuracy: 96, difficultyAchieved: 'hard', createdAt: '' },
  { id: 'f5', playerId: 'p5', playerName: 'Carlos_55', operation: 'Variables', score: 86700, totalTime: 210000, mistakes: 3, accuracy: 97, difficultyAchieved: 'hard', createdAt: '' },
  { id: 'f6', playerId: 'p6', playerName: 'GeorgeR63', operation: 'Multiplication', score: 82300, totalTime: 218000, mistakes: 5, accuracy: 95, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f7', playerId: 'p7', playerName: 'LewisH44', operation: 'Addition', score: 79900, totalTime: 225000, mistakes: 6, accuracy: 94, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f8', playerId: 'p8', playerName: 'Alonso_14', operation: 'Division', score: 76500, totalTime: 232000, mistakes: 5, accuracy: 95, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f9', playerId: 'p9', playerName: 'Stroll_18', operation: 'Subtraction', score: 72100, totalTime: 240000, mistakes: 7, accuracy: 93, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f10', playerId: 'p10', playerName: 'Pierre_G10', operation: 'Variables', score: 69800, totalTime: 248000, mistakes: 8, accuracy: 92, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f11', playerId: 'p11', playerName: 'Yuki_TSU', operation: 'Multiplication', score: 66200, totalTime: 255000, mistakes: 9, accuracy: 91, difficultyAchieved: 'medium', createdAt: '' },
  { id: 'f12', playerId: 'p12', playerName: 'AlexAlbon23', operation: 'Addition', score: 63500, totalTime: 262000, mistakes: 8, accuracy: 92, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f13', playerId: 'p13', playerName: 'Hulk_27', operation: 'Division', score: 60100, totalTime: 270000, mistakes: 10, accuracy: 90, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f14', playerId: 'p14', playerName: 'Danny_Ric', operation: 'Subtraction', score: 57800, totalTime: 278000, mistakes: 11, accuracy: 89, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f15', playerId: 'p15', playerName: 'Ocon_31', operation: 'Variables', score: 54200, totalTime: 285000, mistakes: 10, accuracy: 90, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f16', playerId: 'p16', playerName: 'Zhou_24', operation: 'Multiplication', score: 51900, totalTime: 292000, mistakes: 12, accuracy: 88, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f17', playerId: 'p17', playerName: 'Bottas_77', operation: 'Addition', score: 48300, totalTime: 300000, mistakes: 13, accuracy: 87, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f18', playerId: 'p18', playerName: 'KMag_20', operation: 'Division', score: 45600, totalTime: 308000, mistakes: 14, accuracy: 86, difficultyAchieved: 'easy', createdAt: '' },
  { id: 'f19', playerId: 'p19', playerName: 'Logan_S2', operation: 'Subtraction', score: 42100, totalTime: 315000, mistakes: 15, accuracy: 85, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f20', playerId: 'p20', playerName: 'NickDeV', operation: 'Variables', score: 39800, totalTime: 322000, mistakes: 14, accuracy: 86, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f21', playerId: 'p21', playerName: 'MathWizKid', operation: 'Multiplication', score: 36500, totalTime: 330000, mistakes: 16, accuracy: 84, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f22', playerId: 'p22', playerName: 'SpeedRacer99', operation: 'Addition', score: 33200, totalTime: 338000, mistakes: 17, accuracy: 83, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f23', playerId: 'p23', playerName: 'TurboCalc', operation: 'Division', score: 30800, totalTime: 345000, mistakes: 18, accuracy: 82, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f24', playerId: 'p24', playerName: 'F1_Fan_2025', operation: 'Subtraction', score: 27500, totalTime: 352000, mistakes: 19, accuracy: 81, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f25', playerId: 'p25', playerName: 'NumberNinja', operation: 'Variables', score: 24100, totalTime: 360000, mistakes: 20, accuracy: 80, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f26', playerId: 'p26', playerName: 'PitStopPro', operation: 'Multiplication', score: 21800, totalTime: 368000, mistakes: 22, accuracy: 78, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f27', playerId: 'p27', playerName: 'GridStartKid', operation: 'Addition', score: 18500, totalTime: 375000, mistakes: 24, accuracy: 76, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f28', playerId: 'p28', playerName: 'CheckerFlag', operation: 'Division', score: 15200, totalTime: 382000, mistakes: 26, accuracy: 74, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f29', playerId: 'p29', playerName: 'RookieRacer', operation: 'Subtraction', score: 12800, totalTime: 390000, mistakes: 28, accuracy: 72, difficultyAchieved: 'beginner', createdAt: '' },
  { id: 'f30', playerId: 'p30', playerName: 'SlowButSteady', operation: 'Addition', score: 9500, totalTime: 398000, mistakes: 30, accuracy: 70, difficultyAchieved: 'beginner', createdAt: '' },
];

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
        const real = data.map((e: any) => ({
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
        }));
        // TODO: REMOVE FAKE DATA — merge fake entries for visual testing
        setEntries([...real, ...FAKE_ENTRIES].sort((a, b) => b.score - a.score));
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
