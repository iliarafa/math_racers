# Leaderboards — Design

**Date:** 2026-08-17  
**Status:** Approved for implementation

Two public boards: Free Practice and Grand Prix. Empty start. One best per player × Grand Prix × operation. Rank by the existing points formula, series factor capped at F1.

## Goals

- Boards people will climb: a person, a circuit, one operation, one number.
- Honest comparisons: never rank mixed operations; every row names the Grand Prix.
- Dead boards are a clean break: no migration of old rows.

## Out of scope

- Lane Racer public leaderboard (submits stop; table stays unused).
- Authenticated accounts / anti-cheat beyond today’s anon `playerId`.
- Weekly reset or championship points.
- Changing Race Day length, the 100-lap Free Practice gate, or Practice/Quali rules.
- Server `/api/leaderboard` and `/api/lane-racer-leaderboard` (client already talks to Supabase; leave those routes as legacy).

## Ranking

Same formula on both boards:

```
score = (laps / timeInSeconds) × (correct / laps) × seriesFactor × 1000
```

Capped at 100,000. Rounded to an integer.

| Series   | Factor |
|----------|--------|
| Karting  | 1.0    |
| F3       | 1.5    |
| F2       | 2.0    |
| F1       | 3.0    |
| Pro      | 3.0    |

Pro remains a Locked training mode. It may show as a badge; it does not get 3.5×.

Sort: score descending, then time ascending. Lower time wins a tie on points.

Replace a stored row only when the new score is **strictly higher**. Equal score keeps the existing row (and its time).

## Identity of a record

One row per `(playerId, circuitId, operation)` on each board.

- **playerId** — existing local `state.playerId`.
- **circuitId / circuitName** — `CURRENT_GRAND_PRIX.circuitId` and `circuitName` at submit time (e.g. `zandvoort` / `Zandvoort`). Display the proper circuit name, not the country.
- **operation** — Addition, Subtraction, Multiplication, Division, Variables.

A Zandvoort Addition and a Monza Addition are different records. A Zandvoort Addition and a Zandvoort Multiplication are different records.

If the player’s name has changed, the winning upsert updates `playerName` on that row.

## Who can submit

| Board          | Eligible session                         | Circuit stored      | Does not submit                          |
|----------------|------------------------------------------|---------------------|------------------------------------------|
| Free Practice  | Complete **100 laps**                    | Current Grand Prix  | 25-lap, 50-lap, End Session early        |
| Grand Prix     | Complete **Race Day**                    | Current Grand Prix  | GP Practice, Qualifying, Quick Race      |
| (none)         | Lane Racer                               | —                   | All Lane Racer finishes                  |

Grand Prix rows also store `polePosition` (true if they started Race Day from pole). Pole does not change the unique key. The existing 1.25× pole factor on `calculateGPScore` stays.

## Data

Two new empty Supabase tables. The app stops reading and writing `pst_leaderboard`, `gp_leaderboard`, and `lane_racer_leaderboard`.

### `fp_leaderboard`

`id`, `player_id`, `player_name`, `circuit_id`, `circuit_name`, `operation`, `score`, `total_time`, `mistakes`, `accuracy`, `difficulty_achieved`, `created_at`

Unique: `(player_id, circuit_id, operation)`

### `gp_weekend_leaderboard`

Same columns as Free Practice, plus `pole_position` (boolean, default false).

Unique: `(player_id, circuit_id, operation)`

### Writes

Client → Supabase (same pattern as `client/src/lib/supabase.ts` today).

Upsert: insert if no row for that key; update only if `new.score > existing.score`. On a winning update, refresh name, time, mistakes, accuracy, series, score, and (GP) pole.

RLS: public `SELECT` + `INSERT`, and `UPDATE` so upsert can replace a best. Same trust model as today (anon key, client `playerId`).

Drizzle schemas in `shared/schema.ts` match the new tables. Apply the unique indexes and RLS on the live Supabase project (`pslagmyvlvrpwnbhwqpp`) as part of implementation — empty tables, no backfill.

## Page (`/leaderboard`)

Two tabs: **Free Practice** | **Grand Prix**. No Lane Racer tab.

### Default view

- Circuit: `CURRENT_GRAND_PRIX` (this weekend).
- Operation: the operation already persisted on game state (last Free Practice / Grand Prix / Quick Race choice). If none, Addition.
- No “All operations” ranked list. Operation is a required picker.

### Filters

- **Operation** — five operations. Changing it reloads the list. There is no All.
- **Circuit** — this weekend first, then every other circuit in `GP_HISTORY` (`grandPrixHistory.ts`), plus **All circuits**. If `CURRENT_GRAND_PRIX` is missing from history, it still appears first.
- **All circuits** is a ranked list for the **selected operation only**. Every row still shows the circuit name.
- Switching tabs keeps the current circuit and operation.

### Row

Rank · name (YOU if `playerId` matches) · **circuit** · operation · series · time · accuracy · points.  
Grand Prix: POLE badge when `polePosition` is true.

### Empty / error

- Empty, one circuit: `No 100-lap {operation} times at {circuit} yet` / `No Race Day {operation} times at {circuit} yet`.
- Empty, all circuits: `No 100-lap {operation} times yet` / `No Race Day {operation} times yet`.
- Fetch fail: existing “Leaderboard Unavailable” (not a fake empty board).
- Remove the “57-lap PST cycle” copy.

### Deep links

Finish CTAs and Garage open `/leaderboard?mode=free-practice|grand-prix&circuit={id}&operation={op}` so the list matches the session just finished. Unknown or missing params fall back to the defaults above. `mode=pst` (old links) maps to Free Practice. `mode=lane-racer` maps to Free Practice (Lane Racer board is gone).

Search-by-name and the first-50 / Show All behaviour stay.

## Submit UX

Results always show. The board is best-effort:

- No `playerName` → existing name prompt (max 20 characters), then one submit.
- New personal best → optional short confirmation that it posted.
- Score not higher → no extra message.
- Network / Supabase error → one line, e.g. “Couldn’t reach the leaderboard.” Do not block Finish / Home.

Lane Racer results drop “This will appear on the global leaderboard” and do not call a submit helper.

## App copy

- **Regulations** Competition / Garage: two boards only; 100-lap Free Practice; Race Day Grand Prix; one best per Grand Prix per operation; series factor capped at F1.
- **Garage** leaderboard tile: unchanged destination, new page.
- **Finish screens:** Free Practice and Race Day keep a leaderboard link; Lane Racer does not.

## Score helpers

`calculatePSTScore` and `calculateGPScore` (and the unused Lane Racer helper, for consistency) set `pro: 3.0`. Call sites pass the current Grand Prix circuit into the new submit helpers.

## Tests

- Pro multiplier is 3.0 in both score helpers; F1 remains 3.0; a Pro run and an F1 run with the same time/accuracy/laps produce the same score.
- Upsert replaces only when score is strictly greater; equal score keeps the first row.
- Free Practice submit is skipped unless `raceLength >= 100`.
- Grand Prix submit runs only on Race Day completion.
- Leaderboard page: two tabs; default circuit is current GP; operation has no All; `mode=lane-racer` does not show a Lane Racer tab.
