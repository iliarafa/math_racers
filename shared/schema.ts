import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Multiplayer room schema
export const multiplayerRooms = pgTable("multiplayer_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomCode: varchar("room_code", { length: 4 }).notNull().unique(),
  hostId: varchar("host_id").notNull(),
  hostName: text("host_name").notNull(),
  guestId: varchar("guest_id"),
  guestName: text("guest_name"),
  circuitId: varchar("circuit_id").notNull(),
  driverId: varchar("driver_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("waiting"), // waiting, countdown, racing, finished
  questions: jsonb("questions").$type<Array<{ display: string; answer: number }>>(),
  hostProgress: integer("host_progress").default(0),
  guestProgress: integer("guest_progress").default(0),
  hostMistakes: integer("host_mistakes").default(0),
  guestMistakes: integer("guest_mistakes").default(0),
  hostFinishTime: integer("host_finish_time"),
  guestFinishTime: integer("guest_finish_time"),
  winnerId: varchar("winner_id"),
  powerUpsEnabled: boolean("power_ups_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomSchema = createInsertSchema(multiplayerRooms).pick({
  roomCode: true,
  hostId: true,
  hostName: true,
  circuitId: true,
  driverId: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type MultiplayerRoom = typeof multiplayerRooms.$inferSelect;

// PST Leaderboard schema
export const pstLeaderboard = pgTable("pst_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  playerName: text("player_name").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  totalTime: integer("total_time").notNull(),
  mistakes: integer("mistakes").notNull(),
  accuracy: integer("accuracy").notNull(),
  difficultyAchieved: varchar("difficulty_achieved", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(pstLeaderboard).pick({
  playerId: true,
  playerName: true,
  operation: true,
  score: true,
  totalTime: true,
  mistakes: true,
  accuracy: true,
  difficultyAchieved: true,
});

export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof pstLeaderboard.$inferSelect;
