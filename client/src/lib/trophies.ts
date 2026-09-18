/**
 * Trophy cabinet: one trophy per Grand Prix weekend raced (Race Day finished),
 * keyed by season and round so a circuit that returns next year gets its own
 * slot, plus the badge registry for milestones. Pure; persisted in GameState.
 */

export type TrophyTier = 'bronze' | 'silver' | 'gold';
export const TROPHY_TIERS: readonly TrophyTier[] = ['bronze', 'silver', 'gold'];

export type Trophy = {
  id: string;
  season: number;
  round: number;
  circuitId: string;
  /** Circuit name as shown on the card, e.g. 'BAKU'. */
  name: string;
  tier: TrophyTier;
  /** The maths that earned the current tier. */
  operation: string;
  /** Epoch ms of the first Race Day finish at this round. */
  at: number;
};

export function trophyId(season: number, round: number, circuitId: string): string {
  return `gp:${season}:${round}:${circuitId}`;
}

/** Race Day finished → bronze; beat the bot → silver; pole and win → gold. Pole alone earns nothing extra. */
export function weekendTrophyTier(result: { beatBot: boolean; pole: boolean }): TrophyTier {
  if (!result.beatBot) return 'bronze';
  return result.pole ? 'gold' : 'silver';
}

const tierRank = (tier: TrophyTier) => TROPHY_TIERS.indexOf(tier);

export type TrophyUpgrade = { trophy: Trophy; status: 'new' | 'upgraded' | 'unchanged' };

/** Never downgrades; keeps `at` from the first time the round was raced. */
export function upgradeTrophy(existing: Trophy | undefined, incoming: Trophy): TrophyUpgrade {
  if (!existing) return { trophy: incoming, status: 'new' };
  if (tierRank(incoming.tier) <= tierRank(existing.tier)) return { trophy: existing, status: 'unchanged' };
  return { trophy: { ...incoming, at: existing.at }, status: 'upgraded' };
}

function isTrophy(value: unknown): value is Trophy {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return typeof t.id === 'string'
    && typeof t.season === 'number'
    && typeof t.round === 'number'
    && typeof t.circuitId === 'string'
    && typeof t.name === 'string'
    && typeof t.tier === 'string' && (TROPHY_TIERS as readonly string[]).includes(t.tier)
    && typeof t.operation === 'string'
    && typeof t.at === 'number';
}

export function sanitizeTrophies(raw: unknown): Trophy[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isTrophy);
}

/** Rounds in a season; the cabinet shows one slot per round. */
export const SEASON_ROUNDS = 24;

export type SeasonSlot = { round: number; trophy: Trophy | undefined };

/** One slot per round of `season`, in order, with the trophy raced there if any. */
export function seasonSlots(trophies: readonly Trophy[], season: number, rounds: number = SEASON_ROUNDS): SeasonSlot[] {
  return Array.from({ length: rounds }, (_, i) => {
    const round = i + 1;
    return { round, trophy: trophies.find((t) => t.season === season && t.round === round) };
  });
}

// ── Badges ─────────────────────────────────────────────────────────

export type Badge = {
  id: string;
  label: string;
  blurb: string;
  /** Short mark shown on the badge tile. */
  glyph: string;
};

/** Free Practice: complete a full circuit tour with every sector purple. */
export const BADGE_EVERYTHING_IS_PURPLE = 'everything-is-purple';

export const BADGES: readonly Badge[] = [
  { id: BADGE_EVERYTHING_IS_PURPLE, label: 'Everything Is Purple', blurb: 'A full Free Practice circuit tour with every sector purple.', glyph: 'P' },
  { id: 'first-win', label: 'First Win', blurb: 'Beat the bot for the first time.', glyph: 'P1' },
  { id: 'laps-100', label: '100 Laps', blurb: 'Answer 100 questions correctly.', glyph: '100' },
  { id: 'laps-1000', label: '1000 Laps', blurb: 'Answer 1000 questions correctly.', glyph: '1K' },
  { id: 'gp-all-purple', label: 'Purple Race Day', blurb: 'Every sector purple on a Grand Prix Race Day.', glyph: 'GP' },
  { id: 'streak-7', label: '7-Day Streak', blurb: 'Race seven days in a row.', glyph: '7' },
  { id: 'streak-30', label: '30-Day Streak', blurb: 'Race thirty days in a row.', glyph: '30' },
  { id: 'facts-50', label: '50 Facts', blurb: 'Master fifty maths facts.', glyph: '50' },
];

export type MilestoneContext = {
  totalLaps: number;
  racesWon: number;
  dailyStreak: number;
  factsMastered: number;
  /** Every sector purple on the Race Day that just finished. */
  allPurpleRaceDay: boolean;
};

const MILESTONES: readonly { id: string; reached: (ctx: MilestoneContext) => boolean }[] = [
  { id: 'laps-100', reached: (c) => c.totalLaps >= 100 },
  { id: 'laps-1000', reached: (c) => c.totalLaps >= 1000 },
  { id: 'first-win', reached: (c) => c.racesWon >= 1 },
  { id: 'streak-7', reached: (c) => c.dailyStreak >= 7 },
  { id: 'streak-30', reached: (c) => c.dailyStreak >= 30 },
  { id: 'facts-50', reached: (c) => c.factsMastered >= 50 },
  { id: 'gp-all-purple', reached: (c) => c.allPurpleRaceDay },
];

/** Badge ids reached by `ctx` that are not already in `earned`, in registry order. */
export function evaluateMilestones(ctx: MilestoneContext, earned: readonly string[]): string[] {
  return MILESTONES.filter((m) => !earned.includes(m.id) && m.reached(ctx)).map((m) => m.id);
}
