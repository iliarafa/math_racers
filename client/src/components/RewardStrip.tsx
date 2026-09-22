import { BADGES, type TrophyTier, type TrophyUpgrade } from "@/lib/trophies";
import { STREAK_LEVELS, streakLevel, weekdayName, type StreakChange, type StreakLevel } from "@/lib/dailyStreak";

/** What a finished session earned; built once by Game.tsx's reward effect. */
export type RewardOutcome = {
  trophy: { status: TrophyUpgrade['status']; tier: TrophyTier; name: string } | null;
  /** Newly earned badge ids. */
  badges: string[];
  streak: {
    change: StreakChange;
    count: number;
    /** Missed days a pit stop covered this session. */
    saved: string[];
    pitStopEarned: boolean;
    /** Pit stops held after this session. */
    pitStops: number;
  } | null;
  /** Mastery line, e.g. "You got faster at 7 × 8". */
  callout: string | null;
};

export const TIER_COLORS: Record<TrophyTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  // A warm metallic gold, not the app's yellow accent (#ffcc00), so it reads as a medal.
  gold: '#e2b64c',
};

/** Streak colours by level: orange to start, then the trophy tiers, then purple. */
export const STREAK_LEVEL_COLORS: Record<StreakLevel, string> = {
  none: '#ff8000',
  base: '#ff8000',
  bronze: TIER_COLORS.bronze,
  silver: TIER_COLORS.silver,
  gold: TIER_COLORS.gold,
  purple: '#a855f7',
};

function streakLine(streak: NonNullable<RewardOutcome['streak']>): string | null {
  switch (streak.change) {
    case 'started': return 'Day 1 · race again tomorrow to keep it going';
    case 'reset': return 'Streak restarted · day 1';
    case 'incremented': {
      const reached = STREAK_LEVELS.find((step) => step.from === streak.count && step.level !== 'base');
      const line = reached
        ? `${reached.level.charAt(0).toUpperCase()}${reached.level.slice(1)} streak · ${streak.count} days`
        : `${streak.count}-day streak`;
      if (streak.saved.length === 0) return line;
      const covered = streak.saved.map(weekdayName).join(' and ');
      return `${line} · ${streak.saved.length === 1 ? 'a pit stop' : 'pit stops'} covered ${covered}`;
    }
    default: return null;
  }
}

/**
 * Rows for the finish screens: trophy, new badges, streak movement, mastery
 * callout. Renders nothing when the session earned nothing new.
 */
export function RewardStrip({ outcome }: { outcome: RewardOutcome }) {
  const rows: { key: string; text: string; color?: string }[] = [];
  if (outcome.trophy && outcome.trophy.status !== 'unchanged') {
    const { tier, name, status } = outcome.trophy;
    rows.push({
      key: 'trophy',
      text: `${tier.charAt(0).toUpperCase()}${tier.slice(1)} trophy ${status === 'upgraded' ? 'upgraded' : 'earned'} · ${name}`,
      color: TIER_COLORS[tier],
    });
  }
  for (const id of outcome.badges) {
    const badge = BADGES.find((b) => b.id === id);
    rows.push({ key: `badge-${id}`, text: `Badge unlocked · ${badge?.label ?? id}`, color: '#a855f7' });
  }
  if (outcome.streak) {
    const color = STREAK_LEVEL_COLORS[streakLevel(outcome.streak.count)];
    const line = streakLine(outcome.streak);
    if (line) rows.push({ key: 'streak', text: line, color });
    if (outcome.streak.pitStopEarned) rows.push({ key: 'pit-stop', text: `Pit stop earned · you have ${outcome.streak.pitStops}`, color });
  }
  if (outcome.callout) rows.push({ key: 'callout', text: outcome.callout, color: '#19c37d' });
  if (rows.length === 0) return null;

  return (
    <div className="space-y-1" data-testid="reward-strip">
      {rows.map((row) => (
        <div
          key={row.key}
          className="text-sm font-bold"
          style={{ color: row.color, fontFamily: 'Oxanium, sans-serif' }}
          data-testid={`reward-${row.key}`}
        >
          {row.text}
        </div>
      ))}
    </div>
  );
}
