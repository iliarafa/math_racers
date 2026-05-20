import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://pslagmyvlvrpwnbhwqpp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbGFnbXl2bHZycHduYmh3cXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTc1MjMsImV4cCI6MjA5NDg3MzUyM30.--mJ32WicSQT4VKmPzoMfFD0rw68rJnQQY9JoXeZhRY",
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
  score: number;
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
      score: Math.round(entry.score),
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
    .order("score", { ascending: false })
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

// Lane Racer Leaderboard

export interface LaneRacerLeaderboardSubmission {
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

export async function submitLaneRacerLeaderboardEntry(entry: LaneRacerLeaderboardSubmission) {
  const { data, error } = await supabase
    .from("lane_racer_leaderboard")
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLaneRacerLeaderboard(circuitId?: string, operation?: string, limit = 50) {
  let query = supabase
    .from("lane_racer_leaderboard")
    .select("*")
    .order("score", { ascending: false })
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
