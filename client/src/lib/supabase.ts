import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rzvpuvejsrfcugeqnadq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dnB1dmVqc3JmY3VnZXFuYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTMwMjQsImV4cCI6MjA4NjMyOTAyNH0.V7k1x0FpVePUO2rat6aP0VxzA7AetpC7UR-giXqg4Po",
);

export interface LeaderboardSubmission {
  playerId: string;
  playerName: string;
  operation: string;
  score: number;
  totalTime: number;
  mistakes: number;
  accuracy: number;
  difficultyAchieved: string;
}

export async function submitLeaderboardEntry(entry: LeaderboardSubmission) {
  const { data, error } = await supabase
    .from("pst_leaderboard")
    .insert({
      player_id: entry.playerId,
      player_name: entry.playerName,
      operation: entry.operation,
      score: Math.round(entry.score),
      total_time: entry.totalTime,
      mistakes: entry.mistakes,
      accuracy: entry.accuracy,
      difficulty_achieved: entry.difficultyAchieved,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLeaderboard(operation?: string, limit = 50) {
  let query = supabase
    .from("pst_leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(Math.min(limit, 100));

  if (operation) {
    query = query.eq("operation", operation);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Grand Prix Leaderboard

export interface GPLeaderboardSubmission {
  playerId: string;
  playerName: string;
  circuitId: string;
  circuitName: string;
  operation: string;
  totalTime: number;
  mistakes: number;
  accuracy: number;
  difficultyAchieved: string;
  polePosition: boolean;
}

export async function submitGPLeaderboardEntry(entry: GPLeaderboardSubmission) {
  const { data, error } = await supabase
    .from("gp_leaderboard")
    .insert({
      player_id: entry.playerId,
      player_name: entry.playerName,
      circuit_id: entry.circuitId,
      circuit_name: entry.circuitName,
      operation: entry.operation,
      total_time: entry.totalTime,
      mistakes: entry.mistakes,
      accuracy: entry.accuracy,
      difficulty_achieved: entry.difficultyAchieved,
      pole_position: entry.polePosition,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGPLeaderboard(circuitId?: string, operation?: string, limit = 50) {
  let query = supabase
    .from("gp_leaderboard")
    .select("*")
    .order("mistakes", { ascending: true })
    .order("total_time", { ascending: true })
    .limit(Math.min(limit, 100));

  if (circuitId) {
    query = query.eq("circuit_id", circuitId);
  }
  if (operation) {
    query = query.eq("operation", operation);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
