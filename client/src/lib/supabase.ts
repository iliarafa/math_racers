import { createClient } from "@supabase/supabase-js";
import { shouldReplaceBest } from "./leaderboardRules";

const supabase = createClient(
  "https://pslagmyvlvrpwnbhwqpp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbGFnbXl2bHZycHduYmh3cXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc1MjMsImV4cCI6MjA5NDg3MzUyM30.--mJ32WicSQT4VKmPzoMfFD0rw68rJnQQY9JoXeZhRY",
);

export interface FpLeaderboardSubmission {
  playerId: string;
  playerName: string;
  circuitId: string;
  circuitName: string;
  operation: string;
  score: number;
  totalTime: number;
  mistakes: number;
  accuracy: number;
  difficultyAchieved: string;
}

export interface GpWeekendLeaderboardSubmission extends FpLeaderboardSubmission {
  polePosition: boolean;
}

export type LeaderboardWriteResult = 'inserted' | 'updated' | 'kept';

async function upsertByBest(
  table: 'fp_leaderboard' | 'gp_weekend_leaderboard',
  match: { player_id: string; circuit_id: string; operation: string },
  row: Record<string, unknown>,
): Promise<LeaderboardWriteResult> {
  const { data: existing, error: readError } = await supabase
    .from(table)
    .select('id, score')
    .eq('player_id', match.player_id)
    .eq('circuit_id', match.circuit_id)
    .eq('operation', match.operation)
    .maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const { error } = await supabase.from(table).insert(row);
    if (error) throw error;
    return 'inserted';
  }
  if (!shouldReplaceBest(existing.score, row.score as number)) return 'kept';
  const { error } = await supabase.from(table).update(row).eq('id', existing.id);
  if (error) throw error;
  return 'updated';
}

export async function submitFpLeaderboardEntry(entry: FpLeaderboardSubmission): Promise<LeaderboardWriteResult> {
  return upsertByBest(
    'fp_leaderboard',
    { player_id: entry.playerId, circuit_id: entry.circuitId, operation: entry.operation },
    {
      player_id: entry.playerId,
      player_name: entry.playerName,
      circuit_id: entry.circuitId,
      circuit_name: entry.circuitName,
      operation: entry.operation,
      score: Math.round(entry.score),
      total_time: entry.totalTime,
      mistakes: entry.mistakes,
      accuracy: entry.accuracy,
      difficulty_achieved: entry.difficultyAchieved,
    },
  );
}

export async function submitGpWeekendEntry(entry: GpWeekendLeaderboardSubmission): Promise<LeaderboardWriteResult> {
  return upsertByBest(
    'gp_weekend_leaderboard',
    { player_id: entry.playerId, circuit_id: entry.circuitId, operation: entry.operation },
    {
      player_id: entry.playerId,
      player_name: entry.playerName,
      circuit_id: entry.circuitId,
      circuit_name: entry.circuitName,
      operation: entry.operation,
      score: Math.round(entry.score),
      total_time: entry.totalTime,
      mistakes: entry.mistakes,
      accuracy: entry.accuracy,
      difficulty_achieved: entry.difficultyAchieved,
      pole_position: entry.polePosition,
    },
  );
}

export async function getFpLeaderboard(opts: { operation: string; circuitId?: string; limit?: number }) {
  let query = supabase
    .from('fp_leaderboard')
    .select('*')
    .eq('operation', opts.operation)
    .order('score', { ascending: false })
    .order('total_time', { ascending: true })
    .limit(Math.min(opts.limit ?? 50, 100));
  if (opts.circuitId) query = query.eq('circuit_id', opts.circuitId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getGpWeekendLeaderboard(opts: { operation: string; circuitId?: string; limit?: number }) {
  let query = supabase
    .from('gp_weekend_leaderboard')
    .select('*')
    .eq('operation', opts.operation)
    .order('score', { ascending: false })
    .order('total_time', { ascending: true })
    .limit(Math.min(opts.limit ?? 50, 100));
  if (opts.circuitId) query = query.eq('circuit_id', opts.circuitId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
