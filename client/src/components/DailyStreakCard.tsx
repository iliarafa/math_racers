import { localDayString, streakStatus, streakWeek, type DailyStreak, type StreakWeekDay } from "@/lib/dailyStreak";
import { cn } from "@/lib/utils";

const OXANIUM = { fontFamily: 'Oxanium, sans-serif' } as const;
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STREAK_ORANGE = '#ff8000';
const AT_RISK_AMBER = '#ffb020';
const MUTED = 'rgba(255,255,255,0.4)';

function dotStyle(day: StreakWeekDay, atRisk: boolean): React.CSSProperties {
  if (day.raced) return { backgroundColor: STREAK_ORANGE };
  if (day.isToday) return { border: `1.5px dashed ${atRisk ? AT_RISK_AMBER : MUTED}` };
  return { backgroundColor: 'rgba(255,255,255,0.1)' };
}

/**
 * Top of the trophy cabinet: the live day count, the last seven days as dots and one
 * line on what keeps it going. Amber when yesterday counted but today has not yet.
 */
export function DailyStreakCard({ streak }: { streak: DailyStreak }) {
  const today = localDayString();
  const status = streakStatus(streak, today);
  const atRisk = status === 'at-risk';
  const count = status === 'broken' ? 0 : streak.count;
  const line =
    status === 'active' ? `Back tomorrow for day ${count + 1}`
    : atRisk ? 'Race today to keep it'
    : streak.best > 0 ? 'Race today to start a new streak'
    : 'Race today to start a streak';

  return (
    <div className="rounded-xl bg-white/5 p-4 space-y-4" style={OXANIUM} data-testid="daily-streak-card" data-status={status}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl" style={{ color: count === 0 ? MUTED : atRisk ? AT_RISK_AMBER : STREAK_ORANGE }} data-testid="daily-streak-count">
          {count}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-white/40">day streak</span>
      </div>
      <div className="flex gap-2" data-testid="daily-streak-week">
        {streakWeek(streak, today).map((day) => (
          <div key={day.day} className="w-6 flex flex-col items-center gap-1.5" title={day.day} data-raced={day.raced}>
            <span className={cn('text-[10px]', day.isToday ? 'text-white' : 'text-white/40')}>{WEEKDAY_LETTERS[day.weekday]}</span>
            <span className="block w-3.5 h-3.5 rounded-full" style={dotStyle(day, atRisk)} />
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: atRisk ? AT_RISK_AMBER : 'rgba(255,255,255,0.6)' }} data-testid="daily-streak-line">
        {line}
      </p>
    </div>
  );
}
