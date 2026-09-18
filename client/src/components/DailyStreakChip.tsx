import { localDayString, streakStatus, type DailyStreak } from "@/lib/dailyStreak";

/**
 * Paddock chip under the Hub title. Hidden when there is no live streak;
 * amber when yesterday counted but today has not yet.
 */
export function DailyStreakChip({ streak }: { streak: DailyStreak }) {
  const status = streakStatus(streak, localDayString());
  if (status === 'broken') return null;
  const atRisk = status === 'at-risk';
  const color = atRisk ? '#ffb020' : '#ff8000';
  return (
    <div
      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{
        fontFamily: 'Oxanium, sans-serif',
        color,
        backgroundColor: `${color}1f`,
        border: `1px solid ${color}66`,
      }}
      data-testid="daily-streak-chip"
      data-status={status}
    >
      🔥 {streak.count}-day streak{atRisk ? ' · race today to keep it' : ''}
    </div>
  );
}
