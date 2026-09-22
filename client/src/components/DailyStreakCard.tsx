import {
  MAX_PIT_STOPS,
  PIT_STOP_EVERY,
  liveCount,
  localDayString,
  streakGap,
  streakLevel,
  streakDots,
  streakStatus,
  weekdayName,
  type DailyStreak,
  type StreakDot,
} from "@/lib/dailyStreak";
import { nextStreakGoal } from "@/lib/trophies";
import { STREAK_LEVEL_COLORS } from "@/components/RewardStrip";
import { cn } from "@/lib/utils";

const OXANIUM = { fontFamily: 'Oxanium, sans-serif' } as const;
const AT_RISK_AMBER = '#ffb020';
const MUTED = 'rgba(255,255,255,0.4)';

/** One streak day: filled once counted, a dashed ring for today while it waits (amber when at risk). */
function DayDot({ dot, color, atRisk }: { dot: StreakDot; color: string; atRisk: boolean }) {
  const base = 'w-4 h-4 rounded-full';
  if (dot.state === 'raced') return <span className={base} style={{ backgroundColor: color }} />;
  if (dot.state === 'today') return <span className={base} style={{ border: `1.5px dashed ${atRisk ? AT_RISK_AMBER : MUTED}` }} />;
  return <span className={base} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />;
}

/**
 * Top of the trophy cabinet: the live day count in its level colour, pit stops held, this week of
 * the streak as seven numbered dots (day 1 on the left) and one line on what comes next. At-risk
 * amber stays off the number (it sits too close to gold) and shows only in the line and on today's ring.
 */
export function DailyStreakCard({ streak, earnedBadges }: { streak: DailyStreak; earnedBadges: readonly string[] }) {
  const today = localDayString();
  const status = streakStatus(streak, today);
  const { missed } = streakGap(streak, today);
  const atRisk = status === 'at-risk';
  const count = liveCount(streak, today);
  const level = streakLevel(count);
  const color = STREAK_LEVEL_COLORS[level];
  const label = level === 'none' || level === 'base' ? 'day streak' : `${level} streak`;
  const line =
    status === 'broken' ? (streak.best > 0 ? 'Race today to start a new streak' : 'Race today to start a streak')
    : missed.length > 0 ? `Race today and ${missed.length === 1 ? 'a pit stop covers' : 'pit stops cover'} ${missed.map(weekdayName).join(' and ')}`
    : atRisk ? 'Race today to keep it'
    : nextStreakGoal(count, earnedBadges) ?? `Back tomorrow for day ${count + 1}`;

  return (
    <div style={OXANIUM}>
      <div className="rounded-xl bg-white/5 p-4 space-y-4" data-testid="daily-streak-card" data-status={status} data-level={level}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl" style={{ color: count === 0 ? MUTED : color }} data-testid="daily-streak-count">
              {count}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/40" data-testid="daily-streak-level">{label}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40" data-testid="daily-streak-pit-stops">
            Pit stops <span className="text-sm text-white">{streak.pitStops}</span>
          </span>
        </div>
        <div className="flex gap-2" data-testid="daily-streak-week">
          {streakDots(streak, today).map((dot) => (
            <div
              key={dot.day}
              className="w-6 flex flex-col items-center gap-1.5"
              title={`Day ${dot.day}`}
              data-state={dot.state}
            >
              <span className={cn('text-[10px] tabular-nums', dot.isToday ? 'text-white' : 'text-white/40')}>{dot.day}</span>
              <DayDot dot={dot} color={color} atRisk={atRisk} />
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: atRisk ? AT_RISK_AMBER : 'rgba(255,255,255,0.6)' }} data-testid="daily-streak-line">
          {line}
        </p>
      </div>
      <p className="mt-3 text-[10px] text-white/40">
        Bronze at 7 days, silver at 14, gold at 30, purple at 100. Every {PIT_STOP_EVERY} days earns a pit stop (hold {MAX_PIT_STOPS}): miss a day and one keeps your streak going.
      </p>
    </div>
  );
}
