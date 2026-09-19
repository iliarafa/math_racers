/**
 * Daily streak: consecutive local calendar days with at least one finished
 * session (any mode). Distinct from GameState.streak, the per-answer streak
 * inside a race. Pure; persisted in GameState.dailyStreak.
 */

/** Days kept in `recentDays`: the Trophies page shows the last week. */
export const STREAK_WEEK = 7;

export type DailyStreak = {
  count: number;
  /** Local calendar day of the last counted session, 'YYYY-MM-DD'; '' when none. */
  lastDay: string;
  best: number;
  /** The last counted days (at most STREAK_WEEK), oldest first; drives the week dots on /trophies. */
  recentDays: string[];
};

export const EMPTY_STREAK: DailyStreak = { count: 0, lastDay: '', best: 0, recentDays: [] };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

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

/** True when `earlier` is the calendar day right before `later`. */
export function isYesterday(earlier: string, later: string): boolean {
  if (!DAY_RE.test(earlier) || !DAY_RE.test(later)) return false;
  return Math.round((noonOf(later) - noonOf(earlier)) / DAY_MS) === 1;
}

export type StreakChange = 'same' | 'started' | 'incremented' | 'reset';

export function advanceDailyStreak(prev: DailyStreak, today: string): { next: DailyStreak; change: StreakChange } {
  if (prev.count > 0 && prev.lastDay === today) return { next: prev, change: 'same' };
  let change: StreakChange;
  let count: number;
  if (prev.count > 0 && isYesterday(prev.lastDay, today)) {
    change = 'incremented';
    count = prev.count + 1;
  } else {
    change = prev.count === 0 ? 'started' : 'reset';
    count = 1;
  }
  return {
    next: { count, lastDay: today, best: Math.max(prev.best, count), recentDays: lastWeekOf([...prev.recentDays, today]) },
    change,
  };
}

export type StreakStatus = 'active' | 'at-risk' | 'broken';

export function streakStatus(streak: DailyStreak, today: string): StreakStatus {
  if (streak.count === 0) return 'broken';
  if (streak.lastDay === today) return 'active';
  if (isYesterday(streak.lastDay, today)) return 'at-risk';
  return 'broken';
}

export type StreakWeekDay = {
  day: string;
  /** 0 = Sunday, as Date.getDay(). */
  weekday: number;
  raced: boolean;
  isToday: boolean;
};

/** The STREAK_WEEK days ending today, oldest first, marking the ones that counted. */
export function streakWeek(streak: DailyStreak, today: string): StreakWeekDay[] {
  return Array.from({ length: STREAK_WEEK }, (_, i) => {
    const day = addDays(today, i + 1 - STREAK_WEEK);
    return { day, weekday: new Date(noonOf(day)).getDay(), raced: streak.recentDays.includes(day), isToday: day === today };
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
  if (count === 0) return { count, lastDay: '', best: safeBest, recentDays: [] };
  const run = Math.min(count, STREAK_WEEK);
  const recentDays = Array.isArray(s.recentDays)
    ? lastWeekOf(s.recentDays)
    : // A save from before recentDays existed: the current run is the only history it holds.
      Array.from({ length: run }, (_, i) => addDays(lastDay, i + 1 - run));
  return { count, lastDay, best: Math.max(safeBest, count), recentDays };
}
