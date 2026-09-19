import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Legacy leaderboard tables that are still in the Supabase project but no longer in the
  // schema: keep `db:push` from offering to drop them (and their rows). Drop them by hand if wanted.
  tablesFilter: ["!pst_leaderboard", "!gp_leaderboard", "!lane_racer_leaderboard"],
});
