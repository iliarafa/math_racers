# Multiplayer Dynamic Difficulty — Design

**Date:** 2026-07-13  
**Status:** Approved for planning (user approved Approach 1 + shared track)  
**Branch context:** `main`  
**Related:** `docs/next-session-handoff.md`, `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md`

## Goal

Multiplayer races adapt question difficulty mid-race using the Free Practice dynamic-difficulty engine, with **one shared difficulty track** and **server-owned** difficulty + question generation so host and guest stay fair and in sync.

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Sync model | **B** — Server owns difficulty + next question; broadcast over WebSocket |
| Difficulty tracks | **One** shared track for both players |
| Start difficulty | Always `beginner` (Karting) |
| Question identity | Same question-slot index → same `{display, answer}` for both players |
| Algorithm | Reuse Free Practice `initDynamicDifficulty` / `updateDynamicDifficulty` |
| Soft-follow / GP Quali-Race / Championship | Out of scope (unchanged) |

## Current behavior (baseline)

- Host pre-generates a full question bank at fixed `beginner` and sends it on room create / `start_countdown`.
- Each client advances `currentQuestionIndex` by **+1 per correct answer** (not by progress). Progress may jump +2 with AERO/OVERTAKE; question index still +1.
- Wrong answers (realism retries) stay on the same question; casual path may advance after wrong — preserve existing retry/DNF rules.
- OVERTAKE swaps in a locally generated harder question overlay; base bank question is unchanged.
- Server validates sequential `progress_update` but does not own difficulty or mint questions today.

## Behavior model

### Shared difficulty

1. On race start (`race_start` / countdown end): server initializes `dynamicDifficulty = initDynamicDifficulty('beginner')` on the in-memory room.
2. **Both** players’ answer outcomes update that single state (serialized on the server message handler — no parallel races on the same room).
3. Inputs match Free Practice: `correct`, `responseTime`, `operationType`. Use `slowerThanBot: false` for v1 (no bot; avoid coupling to opponent sector times in the first cut).
4. Server broadcasts `difficulty_sync` with `{ difficulty, label }` whenever the shared level or rolling state that clients need for HUD changes (at minimum after every processed answer that calls `updateDynamicDifficulty`).
5. Both HUDs show the same live Karting / F3 / F2 / F1 treatment as Free Practice / Lane Racer.
6. End state / any persisted `difficultyAchieved` uses the **final shared** `currentDifficulty`.

### Questions — freeze on first touch (Approach 1)

1. Room stores a sparse (or growing) `questions[]` keyed by **question slot index** (= each player’s `currentQuestionIndex` semantics: 0-based count of correctly advanced questions).
2. At race start, server mints **slot 0** at `beginner` and includes it in countdown/`race_start` payload (or an immediate `questions_patch`) so both players can begin.
3. When a player answers **correctly** and will advance to slot `n`:
   - Server updates shared difficulty from that answer.
   - If `questions[n]` is missing, mint it with `generateQuestion(...)` at the **post-update** shared difficulty, store it, and broadcast a `questions_patch` (index + display + answer).
   - If `questions[n]` already exists (other player already opened that slot), reuse it — do not regenerate.
4. When a player answers **wrong**:
   - Server updates shared difficulty (`correct: false`).
   - Do **not** mint a new question for the current slot; player keeps the same stored question (existing retry UX).
5. Clients **must not** generate the shared race bank locally. They merge patches into local `questions` and only use `questions[currentQuestionIndex]` for the base (non-OVERTAKE) prompt.
6. Stop sending a full pre-baked bank on room create / `start_countdown` for difficulty purposes. Room create may keep an empty/`null` questions field or only slot 0 once racing starts — avoid dual sources of truth.

### OVERTAKE / AERO

- Progress validation (+1 / +2) unchanged on the server.
- OVERTAKE harder-question **overlay** stays client-local: generate with `getHarderDifficulty(sharedLiveDifficulty)` (not hard-coded `beginner`). Overlay does not enter the shared bank.
- Energy harvest uses the **shared live difficulty** from the last `difficulty_sync`, not fixed beginner.

### Who may start the race

- Host still starts countdown; circuit / weather / operation / race length / power-ups / aero zones remain host-driven as today.
- `driverId` may remain Karting for compatibility with existing room schema; live difficulty is independent of `driverId`.

## Protocol (WebSocket)

### Server → client (new / extended)

| Event | Payload (conceptual) | When |
|-------|----------------------|------|
| `difficulty_sync` | `{ difficulty: Difficulty }` | After shared difficulty update; also once at race start |
| `questions_patch` | `{ questions: Array<{ index: number; display: string; answer: number }> }` | When new slot(s) minted |
| Existing `countdown_start` / `race_start` | Include initial `difficulty` + slot 0 (or follow immediately with patch/sync) | Race begin |

### Client → server

| Path | Behavior |
|------|----------|
| Correct answer | Existing `progress_update` **plus** fields needed for difficulty: at least `responseTime` (already present), plus explicit `correct: true` if not implied. Prefer extending `progress_update` rather than a second racey message. |
| Wrong answer | Extend `mistake_update` (or equivalent) with `responseTime` + `correct: false` so difficulty demotes even when progress does not advance. |

Server applies difficulty update **before** minting the next slot on correct answers.

### Ordering / fairness

- Single-threaded handler per process: process one WS message fully before the next for that room’s difficulty + question mint.
- Late-joining mid-race is out of scope (rooms already require both present before start).
- Reconnect: out of scope for this pass unless existing disconnect auto-finish already covers it.

## Engine / code placement

`client/src/lib/gameLogic.ts` imports React and uses `localStorage` inside hooks — **do not** import the whole module into the Node WebSocket server.

**Required:** Extract (or duplicate-minimally then extract) server-safe pure functions into something both sides can import, e.g. `shared/mathEngine.ts` (name flexible):

- `initDynamicDifficulty` / `updateDynamicDifficulty` (+ types)
- `generateQuestion` and its pure helpers (`getOperationRanges`, circuit/operation metadata needed for generation)
- `getHarderDifficulty` if useful for docs; OVERTAKE overlay may stay client-only if it already imports from client

Client `gameLogic.ts` re-exports or imports from that shared module so Free Practice / Lane Racer behavior does not fork.

## Files to touch (expected)

| File | Work |
|------|------|
| `shared/` (new module) | Pure dynamic difficulty + question generation |
| `client/src/lib/gameLogic.ts` | Delegate to shared; keep React/`useGameState` here |
| `server/websocket.ts` | Room dynamic state; mint/patch questions; `difficulty_sync`; answer-driven updates |
| `client/src/pages/Multiplayer.tsx` | Stop full beginner bank; consume sync/patch; HUD; energy/OVERTAKE use live difficulty; finish `difficultyAchieved` |
| `server/routes.ts` / `shared/schema.ts` | Only if room create must stop requiring full `questions` array — adjust validation lightly |
| `docs/next-session-handoff.md` | Point tip at shipped MP dynamic + any leftover polish |

## Out of scope

- Per-player difficulty tracks
- Host-as-authority (Approach 2) or full-bank mid-race rewrite (Approach 3)
- `slowerThanBot` / opponent-paced demotion in MP
- Soft-follow in browser
- Making GP Qualifying / Race Day fully dynamic
- Championship unlock redesign
- Deploy/Harvest
- Cheating-hardened answer verification (server does not re-check math answers in v1; trust client correct/wrong flag as today trusts progress)

## Acceptance criteria

1. MP setup still has no series picker; races start at shared `beginner`.
2. Shared difficulty promotes/demotes from **both** players’ answers using the Free Practice algorithm.
3. Host and guest always see the same base question for the same slot index; HUD difficulty labels match.
4. New slots are minted on the server at the live shared difficulty and broadcast; clients do not privately generate the shared bank.
5. OVERTAKE overlay / AERO progress bonuses still work; energy harvest uses live shared difficulty.
6. Race finish remains clean; `difficultyAchieved` reflects final shared difficulty where recorded.
7. `npm run check` passes; host+guest spot-check on phone + desktop.

## Implementation order (guidance for plan)

1. Extract shared pure engine; wire client re-exports; `npm run check`.
2. Server room state + mint slot 0 + `difficulty_sync` / `questions_patch` on start.
3. Server update-on-answer (progress + mistake paths) + mint next slot.
4. Multiplayer client: consume sync, remove pre-bake, HUD, energy/OVERTAKE live difficulty.
5. Room create API cleanup if needed; handoff doc; manual host/guest verify.
