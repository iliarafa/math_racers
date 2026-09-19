import { BADGES, type TrophyTier, type TrophyUpgrade } from "@/lib/trophies";
import type { StreakChange } from "@/lib/dailyStreak";

/** What a finished session earned; built once by Game.tsx's reward effect. */
export type RewardOutcome = {
  trophy: { status: TrophyUpgrade['status']; tier: TrophyTier; name: string } | null;
  /** Newly earned badge ids. */
  badges: string[];
  streak: { change: StreakChange; count: number } | null;
  /** Mastery line, e.g. "You got faster at 7 × 8". */
  callout: string | null;
};

export const TIER_COLORS: Record<TrophyTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffcc00',
};

function streakLine(streak: NonNullable<RewardOutcome['streak']>): string | null {
  switch (streak.change) {
    case 'started': return 'Day 1 · race again tomorrow to keep it going';
    case 'incremented': return `${streak.count}-day streak`;
    case 'reset': return 'Streak restarted · day 1';
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
  const streak = outcome.streak ? streakLine(outcome.streak) : null;
  if (streak) rows.push({ key: 'streak', text: streak, color: '#ff8000' });
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
