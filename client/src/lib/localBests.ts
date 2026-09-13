import type { Difficulty } from '@shared/mathEngine';
import { shouldReplaceBest } from './leaderboardRules';

/**
 * Local leaderboard tier.
 *
 * Every finished Free Practice or Grand Prix session saves a personal best on
 * this device, keyed by board, circuit, operation and session. The global
 * Supabase boards keep their own gates (100-lap Free Practice, GP Race Day).
 */

export type LocalBoard = 'fp' | 'gp' | 'qr';
export type FpSession = '25' | '50' | '100';
export type GpSession = 'practice' | 'qualifying' | 'race';
/** Quick Race has one fixed format, so one session. */
export type QrSession = 'race';
export type LocalSession = FpSession | GpSession | QrSession;

export interface LocalBestEntry {
  score: number;
  /** Milliseconds, same as the race clock. */
  totalTime: number;
  mistakes: number;
  /** 0-100 integer, same formula as the global submit. */
  accuracy: number;
  difficultyAchieved: Difficulty;
  /** Questions in the session (25/50/100, 30, 20, or the sim lap count). */
  laps: number;
  /** Race Day only. */
  polePosition?: boolean;
  /** Quick Race only: crossed the line before the bot. */
  beatBot?: boolean;
  /** Date.now() when recorded. */
  at: number;
}

export type LocalBests = Record<string, LocalBestEntry>;

export const FP_SESSIONS: readonly FpSession[] = ['25', '50', '100'];
export const GP_SESSIONS: readonly GpSession[] = ['practice', 'qualifying', 'race'];
export const QR_SESSIONS: readonly QrSession[] = ['race'];

function sessionsForBoard(board: LocalBoard): readonly LocalSession[] {
  if (board === 'fp') return FP_SESSIONS;
  if (board === 'gp') return GP_SESSIONS;
  return QR_SESSIONS;
}

function isSessionForBoard(board: LocalBoard, session: string): session is LocalSession {
  return (sessionsForBoard(board) as readonly string[]).includes(session);
}

export function localBestKey(board: LocalBoard, circuitId: string, operation: string, session: LocalSession): string {
  return `${board}:${circuitId}:${operation}:${session}`;
}

export function parseLocalBestKey(
  key: string,
): { board: LocalBoard; circuitId: string; operation: string; session: LocalSession } | null {
  const parts = key.split(':');
  if (parts.length !== 4) return null;
  const [board, circuitId, operation, session] = parts;
  if (board !== 'fp' && board !== 'gp' && board !== 'qr') return null;
  if (!circuitId || !operation) return null;
  if (!isSessionForBoard(board, session)) return null;
  return { board, circuitId, operation, session };
}

export function fpSessionForLaps(laps: number): FpSession | null {
  const session = String(laps);
  return (FP_SESSIONS as readonly string[]).includes(session) ? (session as FpSession) : null;
}

export function sessionLabel(board: LocalBoard, session: LocalSession): string {
  if (board === 'fp') return `${session} laps`;
  if (board === 'qr') return 'Quick Race';
  switch (session) {
    case 'practice': return 'Practice';
    case 'qualifying': return 'Qualifying';
    default: return 'Race Day';
  }
}

/** True for the sessions that also post to the global board. */
export function isGlobalSession(board: LocalBoard, session: LocalSession): boolean {
  if (board === 'fp') return session === '100';
  return session === 'race';
}

/** Finish-screen note for a session that stays local; null when it posts globally. */
export function localTierNote(board: LocalBoard, session: LocalSession): string | null {
  if (isGlobalSession(board, session)) return null;
  return board === 'fp'
    ? 'Local best · Record 100 laps to post to the global board'
    : 'Local best · Finish Race Day to post globally';
}

/** Leaderboard-page hint for a player with no global row yet. */
export function globalHint(board: LocalBoard): string {
  if (board === 'fp') return 'Record 100 laps to post to the global board';
  if (board === 'gp') return 'Finish Race Day to post to the global board';
  return 'Finish a Quick Race to post to the global board';
}

/** Higher score wins; an equal score keeps the existing best. */
export function compareLocalBest(existing: LocalBestEntry | undefined, incoming: LocalBestEntry): boolean {
  return shouldReplaceBest(existing?.score ?? null, incoming.score);
}

export function selectLocalBests(
  bests: LocalBests,
  filter: { board: LocalBoard; operation: string; circuitId: string | 'all' },
): Array<{ session: LocalSession; circuitId: string; entry: LocalBestEntry }> {
  const bySession = new Map<LocalSession, { circuitId: string; entry: LocalBestEntry }>();
  for (const [key, entry] of Object.entries(bests)) {
    const parsed = parseLocalBestKey(key);
    if (!parsed) continue;
    if (parsed.board !== filter.board || parsed.operation !== filter.operation) continue;
    if (filter.circuitId !== 'all' && parsed.circuitId !== filter.circuitId) continue;
    const current = bySession.get(parsed.session);
    if (compareLocalBest(current?.entry, entry)) {
      bySession.set(parsed.session, { circuitId: parsed.circuitId, entry });
    }
  }
  return sessionsForBoard(filter.board)
    .filter((session) => bySession.has(session))
    .map((session) => ({ session, ...bySession.get(session)! }));
}

/** Rebuilds the map from persisted JSON, dropping anything malformed. */
export function sanitizeLocalBests(raw: unknown): LocalBests {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: LocalBests = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!parseLocalBestKey(key)) continue;
    if (!value || typeof value !== 'object') continue;
    const v = value as Partial<LocalBestEntry>;
    if (!Number.isFinite(v.score) || !Number.isFinite(v.totalTime)) continue;
    out[key] = value as LocalBestEntry;
  }
  return out;
}
