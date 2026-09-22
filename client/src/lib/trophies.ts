import { STREAK_LEVELS } from './dailyStreak';

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

/** Driving School graduated: all ten flashcard stages, the Reaction Test target and a Lane Racer win. */
export const BADGE_SUPERLICENCE = 'superlicence';

/** Daily-streak lengths that earn a badge, id `streak-<days>`. */
export const STREAK_BADGE_DAYS = [7, 14, 30, 50, 100] as const;

const STREAK_BADGES: Badge[] = STREAK_BADGE_DAYS.map((days) => ({
  id: `streak-${days}`,
  label: `${days}-Day Streak`,
  // Not "in a row": pit stops can cover a missed day.
  blurb: `Keep a daily streak going for ${days} days.`,
  glyph: String(days),
}));

export const BADGES: readonly Badge[] = [
  { id: BADGE_EVERYTHING_IS_PURPLE, label: 'All Purple', blurb: 'A full Free Practice circuit tour with every sector purple.', glyph: 'P' },
  { id: 'first-win', label: 'First Win', blurb: 'Beat the bot for the first time.', glyph: 'P1' },
  { id: 'laps-100', label: '100 Laps', blurb: 'Answer 100 questions correctly.', glyph: '100' },
  { id: 'laps-1000', label: '1000 Laps', blurb: 'Answer 1000 questions correctly.', glyph: '1K' },
  { id: 'gp-all-purple', label: 'Purple Race Day', blurb: 'Every sector purple on a Grand Prix Race Day.', glyph: 'GP' },
  { id: BADGE_SUPERLICENCE, label: 'Superlicence', blurb: 'Graduate Driving School: every flashcard stage, the Reaction Test target and a Lane Racer win.', glyph: 'SL' },
  ...STREAK_BADGES,
  { id: 'facts-50', label: '50 Facts', blurb: 'Master fifty maths facts.', glyph: '50' },
];

export type MilestoneContext = {
  totalLaps: number;
  racesWon: number;
  dailyStreak: number;
  factsMastered: number;
  /** Every sector purple on the Race Day that just finished. */
  allPurpleRaceDay: boolean;
  /**
   * Driving School graduated. Passed in by the caller rather than read here: the licence
   * lives in its own localStorage keys, and importing drivingSchoolLicence would cycle
   * (it imports drivingSchool, which imports gameLogic, which imports this file).
   */
  superlicence: boolean;
};

/** When each milestone badge is reached, keyed by badge id. */
const MILESTONES: Record<string, (ctx: MilestoneContext) => boolean> = {
  'first-win': (c) => c.racesWon >= 1,
  'laps-100': (c) => c.totalLaps >= 100,
  'laps-1000': (c) => c.totalLaps >= 1000,
  'gp-all-purple': (c) => c.allPurpleRaceDay,
  [BADGE_SUPERLICENCE]: (c) => c.superlicence,
  ...Object.fromEntries(STREAK_BADGE_DAYS.map((days) => [`streak-${days}`, (c: MilestoneContext) => c.dailyStreak >= days])),
  'facts-50': (c) => c.factsMastered >= 50,
};

/** Badge ids reached by `ctx` that are not already in `earned`, in BADGES order. */
export function evaluateMilestones(ctx: MilestoneContext, earned: readonly string[]): string[] {
  return BADGES.filter((b) => !earned.includes(b.id) && MILESTONES[b.id]?.(ctx) === true).map((b) => b.id);
}

/** Streak lengths worth aiming for: every level from bronze up and every streak badge. */
const GOAL_DAYS = Array.from(
  new Set([...STREAK_LEVELS.filter((step) => step.level !== 'base').map((step) => step.from), ...STREAK_BADGE_DAYS]),
).sort((a, b) => a - b);

/**
 * The streak card's next target for a live count: the nearest level or streak badge not yet
 * earned, e.g. "14 days to gold and the 30-day badge". Null once nothing is left (past purple).
 */
export function nextStreakGoal(count: number, earnedBadges: readonly string[]): string | null {
  for (const days of GOAL_DAYS) {
    if (days <= count) continue;
    const level = STREAK_LEVELS.find((step) => step.from === days && step.level !== 'base')?.level;
    const badge = (STREAK_BADGE_DAYS as readonly number[]).includes(days) && !earnedBadges.includes(`streak-${days}`);
    if (!level && !badge) continue;
    const left = days - count;
    const lead = `${left} ${left === 1 ? 'day' : 'days'} to`;
    if (level && badge) return `${lead} ${level} and the ${days}-day badge`;
    return level ? `${lead} ${level}` : `${lead} the ${days}-day badge`;
  }
  return null;
}

export type RewardNews = {
  badges: readonly string[];
  /** Missed days a pit stop covered this session. */
  saved?: readonly string[];
  pitStopEarned?: boolean;
};

/**
 * Everything a session earned as one toast. The toaster shows a single toast at a time
 * (TOAST_LIMIT = 1), so separate toasts would replace each other. Null when nothing is new.
 */
export function rewardToast({ badges, saved = [], pitStopEarned = false }: RewardNews): { title: string; description?: string } | null {
  const labels = badges.map((id) => BADGES.find((b) => b.id === id)?.label ?? id);
  const streakNews = [
    ...(saved.length === 0 ? [] : [saved.length === 1 ? 'A pit stop saved your streak' : `${saved.length} pit stops saved your streak`]),
    ...(pitStopEarned ? ['Pit stop earned'] : []),
  ];
  const [title, ...rest] = labels.length > 0
    ? [labels.length === 1 ? 'Badge unlocked' : `${labels.length} badges unlocked`, ...labels, ...streakNews]
    : streakNews;
  if (!title) return null;
  return rest.length > 0 ? { title, description: rest.join(' · ') } : { title };
}
