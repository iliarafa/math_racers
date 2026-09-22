/**
 * Daily streak: consecutive local calendar days with at least one finished
 * session (any mode). Distinct from GameState.streak, the per-answer streak
 * inside a race. Every PIT_STOP_EVERY days earns a pit stop (up to
 * MAX_PIT_STOPS), and each covers one missed day. Pure; persisted in
 * GameState.dailyStreak.
 */

/** Days in one row of streak dots on /trophies, and the most `recentDays` keeps. */
export const STREAK_WEEK = 7;
/** A pit stop is earned each time the streak reaches a multiple of this. */
export const PIT_STOP_EVERY = 7;
export const MAX_PIT_STOPS = 2;

export type DailyStreak = {
  count: number;
  /** Local calendar day of the last counted session, 'YYYY-MM-DD'; '' when none. */
  lastDay: string;
  best: number;
  /** The last counted days (at most STREAK_WEEK), oldest first. The /trophies dots count streak days and no longer read it. */
  recentDays: string[];
  /** Pit stops held, 0..MAX_PIT_STOPS. Spent only when a session counts after missed days. */
  pitStops: number;
};

export const EMPTY_STREAK: DailyStreak = { count: 0, lastDay: '', best: 0, recentDays: [], pitStops: 0 };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function localDayString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local noon of a day string, so a daylight-saving shift can't move it across midnight. */
function noonOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

/** `day` moved by `n` calendar days; from noon, a daylight-saving hour can't skip or repeat a day. */
function addDays(day: string, n: number): string {
  return localDayString(new Date(noonOf(day) + n * DAY_MS));
}

/** Valid days only, each once, oldest first, trimmed to the last STREAK_WEEK. */
function lastWeekOf(days: unknown[]): string[] {
  const valid = days.filter((d): d is string => typeof d === 'string' && DAY_RE.test(d));
  return Array.from(new Set(valid)).sort().slice(-STREAK_WEEK);
}

/** Whole calendar days from `a` to `b`, negative when `b` is earlier; NaN for a malformed day. */
export function daysBetween(a: string, b: string): number {
  if (!DAY_RE.test(a) || !DAY_RE.test(b)) return NaN;
  return Math.round((noonOf(b) - noonOf(a)) / DAY_MS);
}

/** True when `earlier` is the calendar day right before `later`. */
export function isYesterday(earlier: string, later: string): boolean {
  return daysBetween(earlier, later) === 1;
}

export function weekdayName(day: string): string {
  return WEEKDAY_NAMES[new Date(noonOf(day)).getDay()];
}

export type StreakGap = {
  /** Days since the last counted session: 0 today, negative after a clock set back, NaN with no streak. */
  gap: number;
  /** The days skipped since then, oldest first, when the pit stops held cover them all; [] otherwise. */
  missed: string[];
  /** False once more days were missed than pit stops can cover (or there is no streak). */
  alive: boolean;
};

/** Where the streak stands on `today`: the single source for counting, status and the card. */
export function streakGap(streak: DailyStreak, today: string): StreakGap {
  const gap = streak.count > 0 ? daysBetween(streak.lastDay, today) : NaN;
  // Today, or a clock set back (or a flight west): nothing is missed and nothing is spent.
  if (gap <= 0) return { gap, missed: [], alive: true };
  const skipped = gap - 1;
  // NaN fails this too, so a missing streak is never alive.
  if (!(skipped <= streak.pitStops)) return { gap, missed: [], alive: false };
  return { gap, missed: Array.from({ length: skipped }, (_, i) => addDays(streak.lastDay, i + 1)), alive: true };
}

export type StreakChange = 'same' | 'started' | 'incremented' | 'reset';

export type StreakAdvance = {
  next: DailyStreak;
  change: StreakChange;
  /** Missed days a pit stop covered this session, oldest first. */
  saved: string[];
  /** True only when a pit stop was actually added (not at the cap). */
  pitStopEarned: boolean;
};

export function advanceDailyStreak(prev: DailyStreak, today: string): StreakAdvance {
  const { gap, missed, alive } = streakGap(prev, today);
  if (alive && gap <= 0) return { next: prev, change: 'same', saved: [], pitStopEarned: false };
  const change: StreakChange = alive ? 'incremented' : prev.count === 0 ? 'started' : 'reset';
  const count = alive ? prev.count + 1 : 1;
  // Pit stops cover every missed day or none: a reset keeps them all for the next run.
  const held = prev.pitStops - missed.length;
  const pitStopEarned = count % PIT_STOP_EVERY === 0 && held < MAX_PIT_STOPS;
  return {
    next: {
      count,
      lastDay: today,
      best: Math.max(prev.best, count),
      recentDays: lastWeekOf([...prev.recentDays, today]),
      pitStops: pitStopEarned ? held + 1 : held,
    },
    change,
    saved: missed,
    pitStopEarned,
  };
}

export type StreakStatus = 'active' | 'at-risk' | 'broken';

export function streakStatus(streak: DailyStreak, today: string): StreakStatus {
  const { gap, alive } = streakGap(streak, today);
  if (!alive) return 'broken';
  return gap <= 0 ? 'active' : 'at-risk';
}

/** The count to show: 0 once the streak is broken, though the stored count waits for the next session. */
export function liveCount(streak: DailyStreak, today: string): number {
  return streakGap(streak, today).alive ? streak.count : 0;
}

export type StreakLevel = 'none' | 'base' | 'bronze' | 'silver' | 'gold' | 'purple';

/** Where each streak level starts, lowest first. */
export const STREAK_LEVELS: readonly { level: StreakLevel; from: number }[] = [
  { level: 'base', from: 1 },
  { level: 'bronze', from: 7 },
  { level: 'silver', from: 14 },
  { level: 'gold', from: 30 },
  { level: 'purple', from: 100 },
];

export function streakLevel(count: number): StreakLevel {
  let level: StreakLevel = 'none';
  for (const step of STREAK_LEVELS) if (count >= step.from) level = step.level;
  return level;
}

export type StreakDot = {
  /** The streak day this dot stands for: 1–7 in the first week, 8–14 in the second, and so on. */
  day: number;
  /** raced: counted. today: today's day, still waiting for a session. empty: still to come. */
  state: 'raced' | 'today' | 'empty';
  isToday: boolean;
};

/**
 * The seven dots on /trophies: the current week of the streak, first day on the left. Each counted
 * day fills the next dot and every seventh starts a new row, in step with pit stops (one every
 * PIT_STOP_EVERY days) and the 7- and 14-day levels. Until today counts, its dot is the next one: the
 * first of a new row after a full one, and the first dot when there is no streak to keep. A day a pit
 * stop covered adds nothing to the count, so it adds no dot.
 */
export function streakDots(streak: DailyStreak, today: string): StreakDot[] {
  const count = liveCount(streak, today);
  const todayDay = streakStatus(streak, today) === 'active' ? count : count + 1;
  const rowStart = Math.floor((todayDay - 1) / STREAK_WEEK) * STREAK_WEEK;
  return Array.from({ length: STREAK_WEEK }, (_, i) => {
    const day = rowStart + i + 1;
    return { day, state: day <= count ? 'raced' : day === todayDay ? 'today' : 'empty', isToday: day === todayDay };
  });
}

export function sanitizeDailyStreak(raw: unknown): DailyStreak {
  if (!raw || typeof raw !== 'object') return EMPTY_STREAK;
  const s = raw as Record<string, unknown>;
  const count = s.count;
  const lastDay = s.lastDay;
  const best = s.best;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return EMPTY_STREAK;
  if (typeof lastDay !== 'string' || (lastDay !== '' && !DAY_RE.test(lastDay))) return EMPTY_STREAK;
  if (count > 0 && lastDay === '') return EMPTY_STREAK;
  const safeBest = typeof best === 'number' && Number.isInteger(best) && best >= 0 ? best : 0;
  // A zero count carries no day: a leftover one would make today's first session look already counted.
  if (count === 0) return { ...EMPTY_STREAK, best: safeBest };
  const run = Math.min(count, STREAK_WEEK);
  const recentDays = Array.isArray(s.recentDays)
    ? lastWeekOf(s.recentDays)
    : // A save from before recentDays existed: the current run is the only history it holds.
      Array.from({ length: run }, (_, i) => addDays(lastDay, i + 1 - run));
  const pitStops = typeof s.pitStops === 'number' && Number.isInteger(s.pitStops) ? Math.min(Math.max(s.pitStops, 0), MAX_PIT_STOPS) : 0;
  return { count, lastDay, best: Math.max(safeBest, count), recentDays, pitStops };
}
