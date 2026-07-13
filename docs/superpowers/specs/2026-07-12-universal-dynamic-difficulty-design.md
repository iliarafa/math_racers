# Universal Dynamic Difficulty — Design

**Date:** 2026-07-12  
**Status:** Approved for planning  
**Branch context:** `main`  
**Related handoff:** `docs/next-session-handoff.md`

## Goal

Players no longer pick Karting / F3 / F2 / F1 (or equivalent) before racing. In-scope race modes adapt question difficulty during the race using the existing Free Practice (PST) dynamic-difficulty engine. Setup UI keeps real choices (track, operation, weather, team, power-ups) and drops series/difficulty pickers.

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Start difficulty | Always `beginner` (Karting) |
| Grand Prix | Keep lock-after-Practice: Practice is dynamic; Qualifying + Race Day use the locked difficulty from Practice |
| Multiplayer (this pass) | Defer mid-race dynamic difficulty. Force fixed `beginner` questions / Karting `driverId`. No series picker reliance on `lastSelectedDriverId` |
| Championship / series unlocks | No unlock gates. All circuits available. Difficulty is only the live (or GP-locked) adaptive label |
| Implementation approach | Mode-by-mode wiring reusing `initDynamicDifficulty` / `updateDynamicDifficulty` (Approach 1). Extract a shared helper only if copy-paste hurts |

## Current landscape (relevant)

Active modes today: **Free Practice**, **Lane Racer**, **Grand Prix**, **Multiplayer** (elsewhere). Classic Career circuit/series carousel is effectively gone from mode select.

- **Free Practice:** Already dynamic; operation select already forces Karting driver.
- **Grand Prix:** Dynamic in Practice, then locks — keep this.
- **Lane Racer:** Setup has a Level drum (Karting→F1); difficulty fixed for the race — primary UI + wiring work.
- **Multiplayer:** No visible series drum; questions use `selectedDriver.difficulty` (often from `lastSelectedDriverId`) — force beginner this pass.
- **Deploy Harvest:** Archived — out of scope.

## Behavior model

### Dynamic modes (this pass)

Applies to: Free Practice, Lane Racer, Grand Prix Practice.

1. On race start: `dynamicDifficultyRef = initDynamicDifficulty('beginner')` and HUD shows Karting.
2. On each correct/wrong answer: `updateDynamicDifficulty(...)` updates live difficulty + HUD label (Karting / F3 / F2 / F1 colors, same treatment as PST).
3. Next question is generated with the current live difficulty.
4. End state records `difficultyAchieved` (or existing equivalent) from the final live difficulty.

### Grand Prix Qualifying + Race Day

- Use `grandPrixLockedDifficulty` from the end of Practice.
- Do **not** promote/demote mid-phase.
- HUD shows the locked series label.
- Bot pacing continues to use the locked difficulty (existing behavior).

### Multiplayer (this pass only)

- Generate the pre-baked question bank at `beginner`.
- Persist/send `driverId` as Karting (`beginner` driver).
- Do not read `lastSelectedDriverId` for difficulty.
- No mid-race `updateDynamicDifficulty` yet (follow-up: host/server-owned questions or per-answer sync).

## UI changes

| Surface | Change |
|---------|--------|
| Lane Racer setup | Remove **Level** drum. Keep **Team** + **Track**; tighten combination lock to 2 columns |
| Free Practice / GP setup | No series picker to remove; ensure start/init is explicitly `beginner` |
| Multiplayer | No drum to remove; force beginner under the hood |
| In-race HUD | Live difficulty label on Free Practice (already), Lane Racer, and other dynamic races; GP Quali/Race show locked label |
| Regulations / blurbs | Light copy pass where text still implies “pick your series” |
| Keep | Track, operation, weather, team, power-ups, GP phase tabs, GP lock explanation copy |

## Engine / data

- Source of truth remains `client/src/lib/gameLogic.ts`:
  - `initDynamicDifficulty(start)`
  - `updateDynamicDifficulty(state, correct, responseTime, operationType, slowerThanBot?)`
  - Rolling score thresholds across `beginner → easy → medium → hard`
- No rewrite of the dynamic engine in this pass.
- Bot / rival pacing in Lane Racer: prefer live (or final achieved) difficulty; if that is awkward in the first cut, use a neutral beginner baseline and note a follow-up — do not reintroduce a player-facing series picker.

## Files to touch

| File | Work |
|------|------|
| `client/src/pages/LaneRacer.tsx` | Remove Level drum; wire dynamic difficulty; HUD; `difficultyAchieved` |
| `client/src/pages/Game.tsx` | Harden Free Practice + GP Practice init to `'beginner'`; confirm HUD/end-state alignment |
| `client/src/pages/Multiplayer.tsx` | Force Karting/`beginner` for question gen + room `driverId` |
| `client/src/pages/Regulations.tsx` | Light copy fixes if needed |
| `client/src/lib/gameLogic.ts` | Touch only if a tiny shared constant/helper is clearly useful; no engine rewrite |

## Out of scope

- Full multiplayer mid-race dynamic difficulty / WebSocket question sync
- Deploy Harvest re-enable
- Championship progression redesign (beyond “no unlock gates”)
- Large shared “dynamic race session” abstraction (optional later if drift appears)

## Implementation order

1. Lane Racer — UI removal + dynamic wiring + HUD  
2. Game.tsx — beginner init hardening for Free Practice + GP Practice  
3. Multiplayer — force beginner  
4. Regulations copy pass  
5. `npm run check` + spot-check setup + in-race HUD on phone and desktop  

## Acceptance criteria

1. No in-scope race mode’s primary setup asks the player to pick Karting / F3 / F2 / F1 (or equivalent).
2. Free Practice, Lane Racer, and GP Practice adapt difficulty with the Free Practice algorithm; GP Quali/Race stay locked after Practice.
3. HUD communicates current (or locked) difficulty where it matters.
4. Lane Racer, Free Practice, GP, and Multiplayer still start and finish cleanly; leaderboards / end states still get `difficultyAchieved` (or locked GP difficulty) where applicable.
5. Multiplayer races use fixed beginner questions for this pass.
6. `npm run check` passes.

## Follow-ups (explicitly later)

- Multiplayer dynamic difficulty with shared/synced questions (host- or server-owned generation).
- Optional shared helper/hook if Game + Lane Racer drift.
- Lane Racer rival pacing polish if first cut uses a neutral baseline.
