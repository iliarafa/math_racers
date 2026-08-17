# Leaderboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead three-tab leaderboards with two empty-start boards (Free Practice and Grand Prix) that store one best per player × circuit × operation and land on this weekend’s circuit plus one operation.

**Architecture:** New Supabase tables (`fp_leaderboard`, `gp_weekend_leaderboard`) written from the client via upsert. Pure rules live in `leaderboardRules.ts` (URL, defaults, empty copy, replace-if-better). Score helpers in `gameLogic.ts` cap Pro at 3.0×. The page and finish screens read those rules; old PST / GP / Lane Racer tables stay in the database unused.

**Tech Stack:** React 19, TypeScript, Supabase JS (anon), Drizzle schema types, Node `node:test` via `tsx --test`.

## Global Constraints

- Two public boards only: Free Practice and Grand Prix. No Lane Racer tab or submit.
- One row per `(playerId, circuitId, operation)` on each board. Replace only when the new score is strictly higher.
- Never rank mixed operations. No “All operations” ladder.
- Default view: `CURRENT_GRAND_PRIX` circuit + `loadSetupOperation()` (else Addition).
- Circuit picker: this weekend first, then `Object.keys(GP_HISTORY)`, plus All circuits (same operation).
- Score: `(laps / seconds) × (correct / laps) × seriesFactor × 1000`, cap 100000. Factors: Karting 1.0, F3 1.5, F2 2.0, F1 3.0, Pro 3.0.
- Free Practice submits only at 100 laps, with `CURRENT_GRAND_PRIX.circuitId` / `circuitName`.
- Grand Prix submits only on Race Day. Keep the existing 1.25× pole factor.
- Display circuit **name** (Zandvoort), not country (NETHERLANDS).
- Submit is best-effort: results always show; failure is one line; worse-than-best is silent.
- Do not migrate old `pst_leaderboard` / `gp_leaderboard` / `lane_racer_leaderboard` rows.
- Do not change server `/api/leaderboard` or `/api/lane-racer-leaderboard`.
- Do not bump the app version in this work.

## File map

| File | Responsibility |
|------|----------------|
| `client/src/lib/gameLogic.ts` | `pro: 3.0` in the three score helpers |
| `client/src/lib/gameLogic.score.test.ts` | Score-cap tests |
| `client/src/lib/leaderboardRules.ts` | URL parse, default view, empty copy, circuit order, replace rule |
| `client/src/lib/leaderboardRules.test.ts` | Rules tests |
| `shared/schema.ts` | New Drizzle tables + insert types (keep old tables) |
| `client/src/lib/supabase.ts` | New fetch/upsert helpers |
| `client/src/pages/Leaderboard.tsx` | Two-tab page |
| `client/src/pages/Game.tsx` | Circuit on submit, notices, deep links |
| `client/src/pages/LaneRacer.tsx` | Remove submit + leaderboard CTA |
| `client/src/pages/Regulations.tsx` | Two-board copy |
| `package.json` | `"test": "tsx --test client/src/lib/*.test.ts"` |

---

### Task 1: Cap Pro at F1 in score helpers

**Files:**
- Modify: `client/src/lib/gameLogic.ts` (the three `difficultyMultipliers` records at `calculatePSTScore` ~695, `calculateGPScore` ~718, `calculateLaneRacerScore` ~740)
- Create: `client/src/lib/gameLogic.score.test.ts`
- Modify: `package.json` (add the `test` script next to `check`)

**Interfaces:**
- Consumes: existing `calculatePSTScore(totalTimeMs, mistakes, difficulty, lapCount)`, `calculateGPScore(totalTimeMs, mistakes, difficulty, raceLength, polePosition)`, `calculateLaneRacerScore(totalTimeMs, correctCount, raceLength, difficulty)`
- Produces: same signatures; `pro` factor is `3.0` (was `3.5`)

- [ ] **Step 1: Add the test script and the failing score tests**

In `package.json` `scripts`, add:

```json
"test": "tsx --test client/src/lib/*.test.ts"
```

Create `client/src/lib/gameLogic.score.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateGPScore, calculateLaneRacerScore, calculatePSTScore } from './gameLogic.ts';

const TIME_MS = 100_000;
const LAPS = 100;
const MISTAKES = 0;

test('F1 and Pro produce the same PST score', () => {
  const f1 = calculatePSTScore(TIME_MS, MISTAKES, 'hard', LAPS);
  const pro = calculatePSTScore(TIME_MS, MISTAKES, 'pro', LAPS);
  assert.equal(f1, pro);
  assert.equal(f1, 3000);
});

test('F1 and Pro produce the same GP score without pole', () => {
  const f1 = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, false);
  const pro = calculateGPScore(TIME_MS, MISTAKES, 'pro', 72, false);
  assert.equal(f1, pro);
});

test('pole still multiplies GP score by 1.25', () => {
  const base = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, false);
  const pole = calculateGPScore(TIME_MS, MISTAKES, 'hard', 72, true);
  assert.equal(pole, Math.min(Math.round(base * 1.25), 100000));
});

test('Lane Racer Pro matches F1', () => {
  assert.equal(
    calculateLaneRacerScore(TIME_MS, LAPS, LAPS, 'hard'),
    calculateLaneRacerScore(TIME_MS, LAPS, LAPS, 'pro'),
  );
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`

Expected: FAIL — Pro score is higher than F1 (3.5 vs 3.0). The PST F1 value `3000` should already match (`100/100 * 1 * 3 * 1000`).

- [ ] **Step 3: Change all three multiplier maps**

In each of the three `difficultyMultipliers` objects in `gameLogic.ts`, set:

```ts
pro: 3.0,
```

Leave `hard: 3.0` unchanged.

- [ ] **Step 4: Re-run tests**

Run: `npm test`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add package.json client/src/lib/gameLogic.ts client/src/lib/gameLogic.score.test.ts
git commit -m "$(cat <<'EOF'
Cap leaderboard Pro multiplier at F1.

Keeps Locked Pro as a training mode so it cannot buy a 3.5× ticket onto the board.
EOF
)"
```

---

### Task 2: Leaderboard rules module

**Files:**
- Create: `client/src/lib/leaderboardRules.ts`
- Create: `client/src/lib/leaderboardRules.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces:
  - `LEADERBOARD_OPERATIONS: readonly ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables']`
  - `LeaderboardTab = 'free-practice' | 'grand-prix'`
  - `shouldReplaceBest(existingScore: number | null, incomingScore: number): boolean`
  - `resolveLeaderboardView(input: { search: string; currentCircuitId: string; persistedOperation: string }): { tab: LeaderboardTab; circuitId: string | 'all'; operation: string }`
  - `leaderboardEmptyMessage(tab: LeaderboardTab, operation: string, circuitLabel: string | 'all'): string`
  - `circuitPickerIds(currentCircuitId: string, historyIds: string[]): string[]`

- [ ] **Step 1: Write the failing tests**

Create `client/src/lib/leaderboardRules.test.ts`:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  circuitPickerIds,
  leaderboardEmptyMessage,
  resolveLeaderboardView,
  shouldReplaceBest,
} from './leaderboardRules.ts';

test('replace only when incoming score is strictly higher', () => {
  assert.equal(shouldReplaceBest(null, 100), true);
  assert.equal(shouldReplaceBest(100, 101), true);
  assert.equal(shouldReplaceBest(100, 100), false);
  assert.equal(shouldReplaceBest(100, 99), false);
});

test('defaults to current circuit, persisted operation, Free Practice', () => {
  const view = resolveLeaderboardView({
    search: '',
    currentCircuitId: 'zandvoort',
    persistedOperation: 'Division',
  });
  assert.deepEqual(view, {
    tab: 'free-practice',
    circuitId: 'zandvoort',
    operation: 'Division',
  });
});

test('maps old mode query values', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=pst',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'free-practice',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=lane-racer',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'free-practice',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?mode=grand-prix&circuit=hungary&operation=Multiplication',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).tab,
    'grand-prix',
  );
});

test('unknown operation falls back to persisted, then Addition', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?operation=Algebra',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Subtraction',
    }).operation,
    'Subtraction',
  );
  assert.equal(
    resolveLeaderboardView({
      search: '?operation=Algebra',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Nope',
    }).operation,
    'Addition',
  );
});

test('circuit=all is kept; missing circuit uses current', () => {
  assert.equal(
    resolveLeaderboardView({
      search: '?circuit=all',
      currentCircuitId: 'zandvoort',
      persistedOperation: 'Addition',
    }).circuitId,
    'all',
  );
});

test('empty copy names the session and circuit', () => {
  assert.equal(
    leaderboardEmptyMessage('free-practice', 'Addition', 'Zandvoort'),
    'No 100-lap Addition times at Zandvoort yet',
  );
  assert.equal(
    leaderboardEmptyMessage('grand-prix', 'Multiplication', 'Monza'),
    'No Race Day Multiplication times at Monza yet',
  );
  assert.equal(
    leaderboardEmptyMessage('free-practice', 'Addition', 'all'),
    'No 100-lap Addition times yet',
  );
  assert.equal(
    leaderboardEmptyMessage('grand-prix', 'Division', 'all'),
    'No Race Day Division times yet',
  );
});

test('circuit picker puts current first and does not duplicate it', () => {
  assert.deepEqual(
    circuitPickerIds('zandvoort', ['spa', 'zandvoort', 'hungary']),
    ['zandvoort', 'spa', 'hungary'],
  );
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `npx tsx --test client/src/lib/leaderboardRules.test.ts`

Expected: FAIL — `Cannot find module './leaderboardRules.ts'`.

- [ ] **Step 3: Implement `leaderboardRules.ts`**

```ts
export const LEADERBOARD_OPERATIONS = [
  'Addition',
  'Subtraction',
  'Multiplication',
  'Division',
  'Variables',
] as const;

export type LeaderboardTab = 'free-practice' | 'grand-prix';

export function shouldReplaceBest(existingScore: number | null, incomingScore: number): boolean {
  return existingScore === null || incomingScore > existingScore;
}

function parseOperation(raw: string | null, persistedOperation: string): string {
  if (raw && (LEADERBOARD_OPERATIONS as readonly string[]).includes(raw)) return raw;
  if ((LEADERBOARD_OPERATIONS as readonly string[]).includes(persistedOperation)) return persistedOperation;
  return 'Addition';
}

function parseTab(mode: string | null): LeaderboardTab {
  if (mode === 'grand-prix') return 'grand-prix';
  return 'free-practice';
}

export function resolveLeaderboardView(input: {
  search: string;
  currentCircuitId: string;
  persistedOperation: string;
}): { tab: LeaderboardTab; circuitId: string | 'all'; operation: string } {
  const params = new URLSearchParams(input.search.startsWith('?') ? input.search.slice(1) : input.search);
  const circuitRaw = params.get('circuit');
  return {
    tab: parseTab(params.get('mode')),
    circuitId: circuitRaw === 'all' ? 'all' : (circuitRaw || input.currentCircuitId),
    operation: parseOperation(params.get('operation'), input.persistedOperation),
  };
}

export function leaderboardEmptyMessage(
  tab: LeaderboardTab,
  operation: string,
  circuitLabel: string | 'all',
): string {
  const session = tab === 'free-practice' ? `100-lap ${operation}` : `Race Day ${operation}`;
  if (circuitLabel === 'all') return `No ${session} times yet`;
  return `No ${session} times at ${circuitLabel} yet`;
}

export function circuitPickerIds(currentCircuitId: string, historyIds: string[]): string[] {
  const rest = historyIds.filter((id) => id !== currentCircuitId);
  return [currentCircuitId, ...rest];
}
```

- [ ] **Step 4: Re-run tests**

Run: `npm test`

Expected: PASS (Task 1 + Task 2).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/leaderboardRules.ts client/src/lib/leaderboardRules.test.ts
git commit -m "$(cat <<'EOF'
Add leaderboard view and personal-best rules.

Keeps operation ladders separate and makes replace-if-better a single tested function.
EOF
)"
```

---

### Task 3: New tables and Supabase helpers

**Files:**
- Modify: `shared/schema.ts` (append after the existing Lane Racer table; do not delete old tables)
- Modify: `client/src/lib/supabase.ts`
- Create: `docs/superpowers/plans/2026-08-17-leaderboards-supabase.sql` (run on project `pslagmyvlvrpwnbhwqpp`)

**Interfaces:**
- Consumes: `shouldReplaceBest` from `leaderboardRules.ts`
- Produces:
  - Drizzle: `fpLeaderboard`, `gpWeekendLeaderboard`, `InsertFpLeaderboardEntry`, `InsertGpWeekendLeaderboardEntry`
  - `submitFpLeaderboardEntry(entry): Promise<'inserted' | 'updated' | 'kept'>`
  - `submitGpWeekendEntry(entry): Promise<'inserted' | 'updated' | 'kept'>`
  - `getFpLeaderboard(opts: { operation: string; circuitId?: string; limit?: number })`
  - `getGpWeekendLeaderboard(opts: { operation: string; circuitId?: string; limit?: number })`
  - Fetch always filters by `operation`. Sort: `score` desc, then `total_time` asc.

- [ ] **Step 1: Add Drizzle tables**

Import `uniqueIndex` from `drizzle-orm/pg-core` (add it to the existing import in `shared/schema.ts`). Append:

```ts
export const fpLeaderboard = pgTable("fp_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  playerName: text("player_name").notNull(),
  circuitId: varchar("circuit_id", { length: 20 }).notNull(),
  circuitName: varchar("circuit_name", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  totalTime: integer("total_time").notNull(),
  mistakes: integer("mistakes").notNull(),
  accuracy: integer("accuracy").notNull(),
  difficultyAchieved: varchar("difficulty_achieved", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("fp_leaderboard_player_circuit_op").on(table.playerId, table.circuitId, table.operation),
]);

export const insertFpLeaderboardSchema = createInsertSchema(fpLeaderboard).pick({
  playerId: true,
  playerName: true,
  circuitId: true,
  circuitName: true,
  operation: true,
  score: true,
  totalTime: true,
  mistakes: true,
  accuracy: true,
  difficultyAchieved: true,
});

export type InsertFpLeaderboardEntry = z.infer<typeof insertFpLeaderboardSchema>;
export type FpLeaderboardEntry = typeof fpLeaderboard.$inferSelect;

export const gpWeekendLeaderboard = pgTable("gp_weekend_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  playerName: text("player_name").notNull(),
  circuitId: varchar("circuit_id", { length: 20 }).notNull(),
  circuitName: varchar("circuit_name", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  score: integer("score").notNull(),
  totalTime: integer("total_time").notNull(),
  mistakes: integer("mistakes").notNull(),
  accuracy: integer("accuracy").notNull(),
  difficultyAchieved: varchar("difficulty_achieved", { length: 20 }).notNull(),
  polePosition: boolean("pole_position").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("gp_weekend_player_circuit_op").on(table.playerId, table.circuitId, table.operation),
]);

export const insertGpWeekendLeaderboardSchema = createInsertSchema(gpWeekendLeaderboard).pick({
  playerId: true,
  playerName: true,
  circuitId: true,
  circuitName: true,
  operation: true,
  score: true,
  totalTime: true,
  mistakes: true,
  accuracy: true,
  difficultyAchieved: true,
  polePosition: true,
});

export type InsertGpWeekendLeaderboardEntry = z.infer<typeof insertGpWeekendLeaderboardSchema>;
export type GpWeekendLeaderboardEntry = typeof gpWeekendLeaderboard.$inferSelect;
```

Leave `pstLeaderboard`, `gpLeaderboard`, and `laneRacerLeaderboard` in place so `server/storage.ts` still typechecks.

- [ ] **Step 2: Write the SQL file and apply it on Supabase**

Create `docs/superpowers/plans/2026-08-17-leaderboards-supabase.sql` with the exact SQL in the “Supabase SQL” appendix at the bottom of this plan. Run it in the Supabase SQL editor for project `pslagmyvlvrpwnbhwqpp`. Do not `db:push` unless you have confirmed `DATABASE_URL` is this same project.

- [ ] **Step 3: Add the new helpers in `supabase.ts`**

Keep the old exports until Tasks 4–6 switch callers. Add:

```ts
import { shouldReplaceBest } from "./leaderboardRules";

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
```

- [ ] **Step 4: Typecheck**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts client/src/lib/supabase.ts docs/superpowers/plans/2026-08-17-leaderboards-supabase.sql
git commit -m "$(cat <<'EOF'
Add empty Free Practice and Grand Prix weekend tables.

New unique keys make one best per player, circuit, and operation, with no old-row migration.
EOF
)"
```

---

### Task 4: Wire Free Practice and Race Day submits

**Files:**
- Modify: `client/src/pages/Game.tsx`

**Interfaces:**
- Consumes: `submitFpLeaderboardEntry`, `submitGpWeekendEntry`, `GpWeekendLeaderboardSubmission`, `CURRENT_GRAND_PRIX.circuitId`, `CURRENT_GRAND_PRIX.circuitName`
- Produces: finish-screen href `/leaderboard?mode=free-practice|grand-prix&circuit={id}&operation={op}`; `leaderboardNotice` on the results card

- [ ] **Step 1: Extend pending payload and add notice helpers**

Change `pendingScoreSubmission` (~433) to include `circuitId` and `circuitName`. Change `pendingGPSubmission` to `Omit<GpWeekendLeaderboardSubmission, 'playerName'> | null`. Add `const [leaderboardNotice, setLeaderboardNotice] = useState<string | null>(null);`

```ts
const handleWriteResult = (result: 'inserted' | 'updated' | 'kept') => {
  if (result === 'inserted' || result === 'updated') {
    setLeaderboardNotice('Personal best posted');
  }
};

const handleWriteError = () => {
  setLeaderboardNotice('Couldn’t reach the leaderboard.');
};
```

- [ ] **Step 2: Attach the current Grand Prix on submit**

Free Practice block (~1273): keep the `raceLength >= 100` gate. Add `circuitId: CURRENT_GRAND_PRIX.circuitId` and `circuitName: CURRENT_GRAND_PRIX.circuitName`. Call `submitFpLeaderboardEntry(...).then(handleWriteResult).catch(handleWriteError)` when a name already exists; otherwise stash on `pendingScoreSubmission`.

Race Day block (~1318): keep `calculateGPScore`, pole, and the Practice/Quali exclusion. Store `CURRENT_GRAND_PRIX.circuitName` (not `.name`). Call `submitGpWeekendEntry`.

- [ ] **Step 3: Point every name-prompt submit at the new helpers**

Three overlays (~2319, ~2727, ~3444). In each Enter / Submit handler:

- `pendingScoreSubmission` → `submitFpLeaderboardEntry({ ...pendingScoreSubmission, playerName: trimmed }).then(handleWriteResult).catch(handleWriteError)`
- `pendingGPSubmission` → `submitGpWeekendEntry({ ...pendingGPSubmission, playerName: trimmed }).then(handleWriteResult).catch(handleWriteError)`

Remove imports of `submitLeaderboardEntry` and `submitGPLeaderboardEntry`. Import `submitFpLeaderboardEntry`, `submitGpWeekendEntry`, `GpWeekendLeaderboardSubmission`.

- [ ] **Step 4: Deep links and the notice line**

```ts
const leaderboardHref = isGrandPrix
  ? `/leaderboard?mode=grand-prix&circuit=${CURRENT_GRAND_PRIX.circuitId}&operation=${encodeURIComponent(selectedOperation)}`
  : `/leaderboard?mode=free-practice&circuit=${CURRENT_GRAND_PRIX.circuitId}&operation=${encodeURIComponent(selectedOperation)}`;
```

Replace every leaderboard `Link` in this file (results ~2308, setup trophy ~2039, and any others) with `leaderboardHref`.

Under the results “View Leaderboard” button:

```tsx
{leaderboardNotice && (
  <p className="text-xs text-white/50 text-center">{leaderboardNotice}</p>
)}
```

- [ ] **Step 5: Typecheck**

Run: `npm run check`

Expected: PASS. `Game.tsx` must not import the old submit functions.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Game.tsx
git commit -m "$(cat <<'EOF'
Post Free Practice and Race Day bests to the new boards.

Each submit now carries this weekend’s circuit and only replaces a higher score.
EOF
)"
```

---

### Task 5: Two-tab leaderboard page

**Files:**
- Modify: `client/src/pages/Leaderboard.tsx`

**Interfaces:**
- Consumes: `resolveLeaderboardView`, `leaderboardEmptyMessage`, `circuitPickerIds`, `LEADERBOARD_OPERATIONS`, `getFpLeaderboard`, `getGpWeekendLeaderboard`, `CURRENT_GRAND_PRIX`, `GP_HISTORY`, `CIRCUITS`, `loadSetupOperation`
- Produces: `/leaderboard` UI with tabs `free-practice` | `grand-prix`

- [ ] **Step 1: Replace tab type and initial view**

Remove `TabMode = 'pst' | 'lane-racer' | 'grand-prix'` and the Lane Racer tab. Drop `CIRCUIT_FILTERS` / `CIRCUIT_ID_MAP` / operation value `'All'`.

```ts
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import { GP_HISTORY } from "@/lib/grandPrixHistory";
import { CIRCUITS, loadSetupOperation } from "@/lib/gameLogic";
import {
  LEADERBOARD_OPERATIONS,
  circuitPickerIds,
  leaderboardEmptyMessage,
  resolveLeaderboardView,
  type LeaderboardTab,
} from "@/lib/leaderboardRules";
import { getFpLeaderboard, getGpWeekendLeaderboard } from "@/lib/supabase";

const initial = resolveLeaderboardView({
  search: window.location.search,
  currentCircuitId: CURRENT_GRAND_PRIX.circuitId,
  persistedOperation: loadSetupOperation(),
});
```

Initialize `activeTab`, `selectedOp`, and `selectedCircuit` (`string | 'all'`) from `initial`.

- [ ] **Step 2: Fetch only the selected operation**

```ts
useEffect(() => {
  setLoading(true);
  setError(null);
  setShowAll(false);
  setSearchQuery('');
  const circuitId = selectedCircuit === 'all' ? undefined : selectedCircuit;
  const fetchRows = activeTab === 'free-practice'
    ? getFpLeaderboard({ operation: selectedOp, circuitId, limit: 50 })
    : getGpWeekendLeaderboard({ operation: selectedOp, circuitId, limit: 50 });
  fetchRows
    .then((data) => {
      setEntries(data.map((e: any) => ({
        id: e.id,
        playerId: e.player_id,
        playerName: e.player_name,
        operation: e.operation,
        score: e.score,
        totalTime: e.total_time,
        mistakes: e.mistakes,
        accuracy: e.accuracy,
        difficultyAchieved: e.difficulty_achieved,
        createdAt: e.created_at,
        circuitName: e.circuit_name,
        polePosition: e.pole_position,
      })));
      setLoading(false);
    })
    .catch(() => {
      setEntries([]);
      setError('offline');
      setLoading(false);
    });
}, [selectedOp, activeTab, selectedCircuit]);
```

- [ ] **Step 3: Filters and copy**

Two tab buttons: **Free Practice** | **Grand Prix**. Switching tabs must not reset circuit or operation.

Operation `Select`: `LEADERBOARD_OPERATIONS` only.

Circuit `Select` on both tabs:

```ts
const pickerIds = circuitPickerIds(CURRENT_GRAND_PRIX.circuitId, Object.keys(GP_HISTORY));

function circuitLabel(id: string): string {
  if (id === CURRENT_GRAND_PRIX.circuitId) return CURRENT_GRAND_PRIX.circuitName;
  const fromCircuits = CIRCUITS.find((c) => c.id === id);
  if (fromCircuits) return fromCircuits.name.charAt(0) + fromCircuits.name.slice(1).toLowerCase();
  return id;
}
```

Options: each `pickerIds` entry, then `{ value: 'all', label: 'All circuits' }`.

Subtitle:

- Free Practice: `Record 100 laps in Free Practice to enter.`
- Grand Prix: `Finish a Grand Prix Race Day to enter.`

Empty state uses `leaderboardEmptyMessage(activeTab, selectedOp, selectedCircuit === 'all' ? 'all' : circuitLabel(selectedCircuit))`. Delete the “57-lap PST cycle” string.

Every row always shows `entry.circuitName` (not only on GP). Keep POLE on Grand Prix when `polePosition` is true. Keep YOU, medals, search, Show All.

- [ ] **Step 4: Typecheck and rules tests**

Run: `npm test && npm run check`

Expected: PASS. The page must not import `getLeaderboard`, `getLaneRacerLeaderboard`, or `getGPLeaderboard`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Leaderboard.tsx
git commit -m "$(cat <<'EOF'
Show Free Practice and Grand Prix as separate operation ladders.

The page lands on this weekend’s circuit and never ranks mixed operations.
EOF
)"
```

---

### Task 6: Remove Lane Racer from the public board and update copy

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`
- Modify: `client/src/pages/Regulations.tsx` (articles `leaderboard` ~203 and `garage` ~232)
- Modify: `client/src/lib/supabase.ts` (delete the old unused exports once no file imports them)

**Interfaces:**
- Consumes: nothing new
- Produces: Lane Racer finish with no leaderboard submit or CTA; Regulations describe two boards

- [ ] **Step 1: Strip Lane Racer submit and CTA**

In `LaneRacer.tsx`:

- Remove the `useEffect` at ~184 that auto-submits (`submitLaneRacerLeaderboardEntry`).
- Remove the name-prompt overlay (~846) and the state it needs if it exists only for the board: `showNamePrompt`, `pendingSubmission`, `submitted`, `nameInput`.
- Remove the results `Link href="/leaderboard?mode=lane-racer"` block (~831). Keep Race Again and Paddock.
- Remove `import { submitLaneRacerLeaderboardEntry } from "@/lib/supabase"`.
- Keep `calculateLaneRacerScore` on the results card if the score is still shown locally.

- [ ] **Step 2: Regulations copy**

Replace the `leaderboard` article (~203) with:

```ts
{
  id: "leaderboard",
  title: "Leaderboard",
  description: "Compete for the highest scores on the Free Practice and Grand Prix leaderboards.",
  details: [
    "#Free Practice",
    "Complete 100 laps to submit your score",
    "One best per Grand Prix per operation",
    "Series factor caps at F1 — Pro uses the same factor",
    "#Grand Prix",
    "Race Day completions are submitted to the Grand Prix leaderboard",
    "One best per Grand Prix per operation",
    "Each row names the circuit",
  ],
},
```

In the garage article details, change:

```
"Leaderboard — Free Practice, Lane Racer, and Grand Prix standings",
```

to:

```
"Leaderboard — Free Practice and Grand Prix standings",
```

In the Lane Racer article, replace `"Finish the race to submit your score to the Lane Racer leaderboard"` (~176) with `"Finish the race to see your time and score"`.

- [ ] **Step 3: Delete dead Supabase exports**

Once `Game.tsx`, `Leaderboard.tsx`, and `LaneRacer.tsx` no longer import them, delete from `supabase.ts`:

- `submitLeaderboardEntry`, `getLeaderboard`, `LeaderboardSubmission`
- `submitGPLeaderboardEntry`, `getGPLeaderboard`, `GPLeaderboardSubmission`
- `submitLaneRacerLeaderboardEntry`, `getLaneRacerLeaderboard`, `LaneRacerLeaderboardSubmission`

- [ ] **Step 4: Typecheck and tests**

Run: `npm test && npm run check`

Expected: PASS. `rg "submitLaneRacerLeaderboardEntry|getLaneRacerLeaderboard|submitLeaderboardEntry|getLeaderboard\\(|submitGPLeaderboardEntry|getGPLeaderboard" client` returns no matches.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/LaneRacer.tsx client/src/pages/Regulations.tsx client/src/lib/supabase.ts
git commit -m "$(cat <<'EOF'
Drop the Lane Racer public board and update regulations.

Competition is Free Practice and Grand Prix only, matching the climb rules.
EOF
)"
```

---

### Task 7: Verify the climb end-to-end

**Files:**
- None unless a check fails

**Interfaces:**
- Consumes: Tasks 1–6
- Produces: confirmed empty boards that accept a 100-lap Free Practice best and reject a worse repeat

- [ ] **Step 1: Automated**

Run: `npm test && npm run check`

Expected: all tests pass; `tsc` clean.

- [ ] **Step 2: Manual — page**

Open `http://127.0.0.1:8081/leaderboard`.

- Two tabs only.
- Default circuit is Zandvoort (current GP). Default operation is the last setup operation or Addition.
- No All operations. All circuits is a picker value.
- Empty copy is `No 100-lap Addition times at Zandvoort yet` (or the selected operation).
- `/leaderboard?mode=lane-racer` still shows Free Practice, not a third tab.
- `/leaderboard?mode=grand-prix&circuit=hungary&operation=Multiplication` opens Grand Prix / Hungary / Multiplication.

- [ ] **Step 3: Manual — submit**

- Free Practice 25 or 50 laps: no row.
- Free Practice 100 laps, named: row appears; notice “Personal best posted”.
- Same player, same circuit, same operation, worse score: row unchanged; no notice.
- Same player, better score: row updates.
- Race Day: row on the Grand Prix tab with circuit name; pole badge if pole.
- GP Practice / Quali: no row.
- Lane Racer finish: no name prompt, no leaderboard button, no new row.
- Airplane mode submit: results still show; “Couldn’t reach the leaderboard.”

- [ ] **Step 4: Commit only if Step 2–3 forced a fix**

If you changed code to pass QA, commit that fix with a message that says why the climb was wrong. If nothing changed, do not make an empty commit.

---

## Appendix: Supabase SQL

This is the file Task 3 writes to `docs/superpowers/plans/2026-08-17-leaderboards-supabase.sql`:

```sql
create table if not exists fp_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  circuit_id varchar(20) not null,
  circuit_name varchar(50) not null,
  operation varchar(20) not null,
  score integer not null,
  total_time integer not null,
  mistakes integer not null,
  accuracy integer not null,
  difficulty_achieved varchar(20) not null,
  created_at timestamptz default now()
);

create unique index if not exists fp_leaderboard_player_circuit_op
  on fp_leaderboard (player_id, circuit_id, operation);

alter table fp_leaderboard enable row level security;

create policy "fp_leaderboard_select" on fp_leaderboard for select using (true);
create policy "fp_leaderboard_insert" on fp_leaderboard for insert with check (true);
create policy "fp_leaderboard_update" on fp_leaderboard for update using (true);

create table if not exists gp_weekend_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  player_name text not null,
  circuit_id varchar(20) not null,
  circuit_name varchar(50) not null,
  operation varchar(20) not null,
  score integer not null,
  total_time integer not null,
  mistakes integer not null,
  accuracy integer not null,
  difficulty_achieved varchar(20) not null,
  pole_position boolean not null default false,
  created_at timestamptz default now()
);

create unique index if not exists gp_weekend_player_circuit_op
  on gp_weekend_leaderboard (player_id, circuit_id, operation);

alter table gp_weekend_leaderboard enable row level security;

create policy "gp_weekend_select" on gp_weekend_leaderboard for select using (true);
create policy "gp_weekend_insert" on gp_weekend_leaderboard for insert with check (true);
create policy "gp_weekend_update" on gp_weekend_leaderboard for update using (true);
```
