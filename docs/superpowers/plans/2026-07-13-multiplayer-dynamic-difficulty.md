# Multiplayer Dynamic Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Free Practice dynamic difficulty into Multiplayer with one shared server-owned difficulty track and freeze-on-first-touch question slots synced over WebSocket.

**Architecture:** Extract pure math/difficulty/question helpers into `shared/mathEngine.ts` so the Node WebSocket server can generate questions. The server holds one `DynamicDifficultyState` per room, updates it from both players’ answers, mints question slots at the live difficulty when first needed, and broadcasts `difficulty_sync` + `questions_patch`. Clients stop pre-baking the bank and drive HUD/energy/OVERTAKE from the shared live difficulty.

**Tech Stack:** React 19 + TypeScript, Express/`ws`, existing `initDynamicDifficulty` / `updateDynamicDifficulty` / `generateQuestion`, Vite/`npm run check` (tsc) — no unit-test runner in this repo.

## Global Constraints

- Sync model **B**: server owns difficulty + questions; broadcast over WS
- **One** shared difficulty track for both players
- Start difficulty: always `beginner`
- Same question-slot index → same `{ display, answer }` for both players
- `slowerThanBot: false` in MP v1
- Do not enable soft-follow on web; do not make GP Quali/Race dynamic
- Reuse Free Practice algorithm — no rewrite of thresholds
- Spec: `docs/superpowers/specs/2026-07-13-multiplayer-dynamic-difficulty-design.md`
- Branch: `main` (or a short-lived feature branch; do not force-push)
- Commits: include commit steps below; skip creating git commits if the user has not asked for them in the session

---

## File map

| File | Role |
|------|------|
| `shared/mathEngine.ts` | **Create** — pure `Difficulty`, dynamic difficulty, ranges, `generateQuestion`, `getHarderDifficulty`, `getExpectedTime`, `calculateEnergyHarvest`, slim circuit→operation map |
| `client/src/lib/gameLogic.ts` | Re-export moved symbols from `@shared/mathEngine`; keep React/`useGameState`/UI `CIRCUITS`/`DRIVERS` here |
| `server/websocket.ts` | Room dynamic state; mint slots; `difficulty_sync` / `questions_patch`; answer-driven updates on `progress_update` + `mistake_update` |
| `client/src/pages/Multiplayer.tsx` | Stop full bank pre-bake; consume sync/patch; HUD; live difficulty for energy/OVERTAKE; show achieved difficulty on finish |
| `server/routes.ts` | Accept optional `raceLength` on room create so client need not send a fake questions array |
| `docs/next-session-handoff.md` | Tip/status after ship |

---

### Task 1: Extract shared math engine

**Files:**
- Create: `shared/mathEngine.ts`
- Modify: `client/src/lib/gameLogic.ts`

**Interfaces:**
- Consumes: existing pure helpers currently in `client/src/lib/gameLogic.ts` (approx. lines 435–924 for complexity/bot/ranges/dynamic/`generateQuestion`, plus `getExpectedTime` / `calculateEnergyHarvest` / `getHarderDifficulty` / `getEasierDifficulty`)
- Produces: `@shared/mathEngine` exports listed below; `gameLogic.ts` re-exports the same public names so Game / Lane Racer imports keep working

**Public exports from `shared/mathEngine.ts` (exact names):**

```typescript
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard';

export interface Question {
  display: string;
  answer: number;
  botTime: number;
  num1?: number;
  num2?: number;
  operation?: string;
}

export interface DynamicDifficultyState {
  currentDifficulty: Difficulty;
  rollingScore: number;
  consecutiveSlowSectors: number;
}

/** circuitId → default operation type (Addition | Subtraction | …) */
export const CIRCUIT_OPERATION_TYPES: Record<string, string>;

export function initDynamicDifficulty(start: Difficulty): DynamicDifficultyState;
export function updateDynamicDifficulty(
  state: DynamicDifficultyState,
  correct: boolean,
  responseTime: number,
  operationType: string,
  slowerThanBot?: boolean
): DynamicDifficultyState;
export function getHarderDifficulty(current: Difficulty): Difficulty;
export function getEasierDifficulty(current: Difficulty): Difficulty;
export function getExpectedTime(difficulty: Difficulty, operationType: string): number;
export function calculateEnergyHarvest(
  responseTime: number,
  difficulty: Difficulty,
  operationType: string
): number;
export function generateQuestion(
  circuitId: string,
  difficulty?: Difficulty,
  isWet?: boolean,
  boostFactor?: number,
  previousDisplay?: string,
  operationOverride?: string
): Question;
```

- [ ] **Step 1: Create `shared/mathEngine.ts` by moving pure logic**

Move **verbatim** (do not change algorithm) from `client/src/lib/gameLogic.ts` into `shared/mathEngine.ts`:

- `Difficulty` type (and keep a local `Question` interface matching the fields above)
- `countCarries`, `calculateComplexity`, `calculateBotTime`
- `OperationRanges`, `BASE_RANGES`, `BOOSTED_HARD_RANGES`, `getNextDifficulty`, `interpolateRange`, `getOperationRanges`
- `EXPECTED_TIMES`, `getExpectedTime`, `calculateEnergyHarvest`
- `getHarderDifficulty`, `getEasierDifficulty`
- `DynamicDifficultyState`, `initDynamicDifficulty`, `updateDynamicDifficulty`
- `generateQuestion`

Add a slim circuit map used only for default operation type when `operationOverride` is omitted:

```typescript
export const CIRCUIT_OPERATION_TYPES: Record<string, string> = {
  spa: 'Addition',
  monaco: 'Subtraction',
  monza: 'Multiplication',
  suzuka: 'Division',
  silverstone: 'Variables',
  canada: 'Addition',
  miami: 'Multiplication',
  barcelona: 'Variables',
  austria: 'Variables',
};
```

In `generateQuestion`, replace `CIRCUITS.find(...)` with:

```typescript
const effectiveType =
  operationOverride ||
  CIRCUIT_OPERATION_TYPES[circuitId] ||
  CIRCUIT_OPERATION_TYPES.spa;
```

Do **not** import React or `localStorage` in this file.

- [ ] **Step 2: Re-export from `gameLogic.ts` and remove moved bodies**

At the top of `client/src/lib/gameLogic.ts` (after any remaining local imports), add:

```typescript
export type { Difficulty, Question, DynamicDifficultyState } from '@shared/mathEngine';
export {
  initDynamicDifficulty,
  updateDynamicDifficulty,
  getHarderDifficulty,
  getEasierDifficulty,
  getExpectedTime,
  calculateEnergyHarvest,
  generateQuestion,
} from '@shared/mathEngine';
```

Remove the duplicated type/function bodies that were moved. Keep `export type Difficulty` / `export interface Question` **only** via the re-export (delete local duplicates). Keep full UI `CIRCUITS`, `DRIVERS`, `useGameState`, scores, aero helpers, rival helpers in `gameLogic.ts`.

If TypeScript complains about `Question` / `Difficulty` used before re-export in the same file, import types for local use:

```typescript
import type { Difficulty, Question } from '@shared/mathEngine';
```

…and still re-export them.

- [ ] **Step 3: Typecheck**

Run: `npm run check`  
Expected: PASS (no errors related to `@shared/mathEngine` or missing exports)

- [ ] **Step 4: Commit (if user requested commits)**

```bash
git add shared/mathEngine.ts client/src/lib/gameLogic.ts
git commit -m "$(cat <<'EOF'
Extract shared math engine for server-safe question generation.

EOF
)"
```

---

### Task 2: Server — room state, mint slot 0, broadcast on race start

**Files:**
- Modify: `server/websocket.ts`
- Modify: `server/routes.ts` (optional `raceLength` on create)

**Interfaces:**
- Consumes: `initDynamicDifficulty`, `generateQuestion` from `@shared/mathEngine`
- Produces: room fields below; on countdown start, clients receive initial difficulty + slot 0 via `countdown_start` (and/or immediate `difficulty_sync` + `questions_patch`)

**New / extended `GameRoom` fields:**

```typescript
import {
  initDynamicDifficulty,
  generateQuestion,
  updateDynamicDifficulty,
  type DynamicDifficultyState,
  type Difficulty,
} from '@shared/mathEngine';

// on GameRoom:
circuitId: string | null;
operation: string | null;
isWet: boolean;
dynamicDifficulty: DynamicDifficultyState | null;
/** Sparse bank: index = question slot (currentQuestionIndex semantics) */
questionsBySlot: Array<{ display: string; answer: number } | undefined>;
hostQuestionIndex: number;
guestQuestionIndex: number;
```

Initialize these in both `createRoom(...)` and the `rooms.set` inside `handleJoinRoom` when creating a missing room (match existing pattern — every `rooms.set` must include the new fields).

- [ ] **Step 1: Add helpers at bottom of `websocket.ts` (before or after `createRoom`)**

```typescript
function mintSlotIfNeeded(room: GameRoom, slot: number): { index: number; display: string; answer: number } | null {
  if (slot < 0) return null;
  if (room.questionsBySlot[slot]) {
    const q = room.questionsBySlot[slot]!;
    return { index: slot, display: q.display, answer: q.answer };
  }
  if (!room.circuitId || !room.dynamicDifficulty) return null;
  const generated = generateQuestion(
    room.circuitId,
    room.dynamicDifficulty.currentDifficulty,
    room.isWet,
    0,
    room.questionsBySlot[slot - 1]?.display,
    room.operation || undefined
  );
  room.questionsBySlot[slot] = { display: generated.display, answer: generated.answer };
  return { index: slot, display: generated.display, answer: generated.answer };
}

function broadcastDifficulty(roomCode: string, room: GameRoom) {
  if (!room.dynamicDifficulty) return;
  broadcastToRoom(roomCode, {
    type: 'difficulty_sync',
    difficulty: room.dynamicDifficulty.currentDifficulty as Difficulty,
  });
}

function broadcastQuestionsPatch(
  roomCode: string,
  patches: Array<{ index: number; display: string; answer: number }>
) {
  if (patches.length === 0) return;
  broadcastToRoom(roomCode, { type: 'questions_patch', questions: patches });
}
```

- [ ] **Step 2: Initialize shared difficulty + slot 0 in `handleStartCountdown`**

Inside `handleStartCountdown`, after resetting progress/power-ups and **before** the `countdown_start` broadcast:

1. Persist race config on the room:
   - `room.circuitId = circuitId ?? room.circuitId`
   - `room.operation = operation ?? room.operation`
   - `room.isWet = weather === 'wet'` (if weather is `'random'`, treat as dry for generation unless the client already resolved wet/dry — prefer the host sending resolved `'wet' | 'dry'` as today)
2. `room.dynamicDifficulty = initDynamicDifficulty('beginner')`
3. `room.questionsBySlot = []`
4. `room.hostQuestionIndex = 0`
5. `room.guestQuestionIndex = 0`
6. `const slot0 = mintSlotIfNeeded(room, 0)`

Change the `countdown_start` broadcast to **prefer server questions**, not the client-supplied bank:

```typescript
broadcastToRoom(roomCode, {
  type: 'countdown_start',
  circuitId,
  driverId,
  weather,
  operation,
  powerUpsEnabled: room.powerUpsEnabled,
  aeroZones: room.aeroZones,
  difficulty: room.dynamicDifficulty?.currentDifficulty ?? 'beginner',
  questions: slot0
    ? [{ index: 0, display: slot0.display, answer: slot0.answer }]
    : [],
});
```

Ignore the incoming `questions` argument for the shared bank (leave parameter for now to avoid breaking the message switch, but do not store client questions as the race bank).

Also broadcast once when race actually starts (optional belt-and-suspenders):

```typescript
// inside the countdown interval when count hits 0, before/after race_start:
broadcastDifficulty(roomCode, room);
if (slot0) broadcastQuestionsPatch(roomCode, [slot0]);
```

Capture `slot0` in a const outer to the interval so it remains in scope.

- [ ] **Step 3: Optional `raceLength` on room create**

In `server/routes.ts` `POST /api/rooms`:

```typescript
const { hostId, hostName, circuitId, driverId, questions, raceLength: bodyRaceLength } = req.body;
// ...
const raceLength = bodyRaceLength || questions?.length || 20;
if (questions) {
  await storage.updateRoom(roomCode, { questions });
}
createRoom(roomCode, hostId, raceLength);
```

- [ ] **Step 4: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 5: Commit (if user requested commits)**

```bash
git add server/websocket.ts server/routes.ts
git commit -m "$(cat <<'EOF'
Mint multiplayer question slot 0 on the server at beginner.

EOF
)"
```

---

### Task 3: Server — update shared difficulty on answers + mint next slots

**Files:**
- Modify: `server/websocket.ts`

**Interfaces:**
- Consumes: `updateDynamicDifficulty` from `@shared/mathEngine`; helpers from Task 2
- Produces: after each answer, `difficulty_sync`; after question advance, `questions_patch` for newly minted slots

- [ ] **Step 1: Extend `handleProgressUpdate` message type**

```typescript
function handleProgressUpdate(ws: WebSocket, message: {
  roomCode: string;
  progress: number;
  mistakes: number;
  aeroBonus?: boolean;
  overtakeBonus?: boolean;
  sectorColor?: string;
  responseTime?: number;
  correct?: boolean; // true = correct answer; false = standard-mode wrong that still advances
}) {
```

After existing progress validation / sector-best / `opponent_progress` broadcast logic succeeds, apply difficulty **then** mint (order required by spec):

```typescript
  const operationType = room.operation || 'Addition';
  if (room.dynamicDifficulty && typeof message.responseTime === 'number') {
    const wasCorrect = message.correct !== false; // default true for older clients mid-deploy
    room.dynamicDifficulty = updateDynamicDifficulty(
      room.dynamicDifficulty,
      wasCorrect,
      message.responseTime,
      operationType,
      false // slowerThanBot — MP v1
    );
    broadcastDifficulty(message.roomCode, room);
  }

  const isHostPlayer = clientInfo.playerId === room.hostId;
  if (isHostPlayer) {
    room.hostQuestionIndex += 1;
  } else {
    room.guestQuestionIndex += 1;
  }
  const nextSlot = isHostPlayer ? room.hostQuestionIndex : room.guestQuestionIndex;
  const minted = mintSlotIfNeeded(room, nextSlot);
  if (minted) {
    broadcastQuestionsPatch(message.roomCode, [minted]);
  }
```

Note: one `progress_update` = one question-slot advance (+1), even when progress jumps +2 from AERO/OVERTAKE.

- [ ] **Step 2: Extend `handleMistakeUpdate`**

```typescript
function handleMistakeUpdate(ws: WebSocket, message: {
  roomCode: string;
  mistakes: number;
  responseTime?: number;
}) {
  // ... existing mistake / opponent_progress logic ...

  if (room.dynamicDifficulty && typeof message.responseTime === 'number') {
    room.dynamicDifficulty = updateDynamicDifficulty(
      room.dynamicDifficulty,
      false,
      message.responseTime,
      room.operation || 'Addition',
      false
    );
    broadcastDifficulty(message.roomCode, room);
  }
}
```

Do **not** increment question indices or mint on mistake-only retries.

- [ ] **Step 3: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 4: Commit (if user requested commits)**

```bash
git add server/websocket.ts
git commit -m "$(cat <<'EOF'
Sync shared MP difficulty and mint question slots on answers.

EOF
)"
```

---

### Task 4: Multiplayer client — consume sync, stop pre-bake, HUD

**Files:**
- Modify: `client/src/pages/Multiplayer.tsx`

**Interfaces:**
- Consumes: `difficulty_sync`, `questions_patch`, `countdown_start.difficulty` / indexed questions from server
- Produces: local `questions` sparse array merged by index; `dynamicDifficultyDisplay` HUD; no client-generated shared bank

- [ ] **Step 1: Add difficulty display state**

Near other race state:

```typescript
const [dynamicDifficultyDisplay, setDynamicDifficultyDisplay] = useState<Difficulty>('beginner');

const difficultyLabel =
  DRIVERS.find(d => d.difficulty === dynamicDifficultyDisplay)?.label || 'Karting';
const difficultyColor =
  dynamicDifficultyDisplay === 'hard' ? '#ef4444'
    : dynamicDifficultyDisplay === 'medium' ? '#38bdf8'
      : dynamicDifficultyDisplay === 'easy' ? '#e5e5e5'
        : '#22c55e';
```

Import `Difficulty` if not already (already imported from `gameLogic`).

- [ ] **Step 2: Handle `difficulty_sync` + `questions_patch` in `handleWebSocketMessage`**

```typescript
case 'difficulty_sync':
  if (message.difficulty) {
    setDynamicDifficultyDisplay(message.difficulty as Difficulty);
  }
  break;
case 'questions_patch':
  if (Array.isArray(message.questions)) {
    setQuestions(prev => {
      const next = prev.slice();
      for (const q of message.questions) {
        if (typeof q.index === 'number') {
          next[q.index] = { display: q.display, answer: q.answer, botTime: 0 };
        }
      }
      return next;
    });
  }
  break;
```

Update `countdown_start` question handling to accept either legacy full arrays or indexed patches:

```typescript
if (message.difficulty) {
  setDynamicDifficultyDisplay(message.difficulty as Difficulty);
}
if (message.questions) {
  if (message.questions.length && message.questions[0]?.index !== undefined) {
    const next: Question[] = [];
    for (const q of message.questions) {
      next[q.index] = { display: q.display, answer: q.answer, botTime: 0 };
    }
    setQuestions(next);
  } else {
    setQuestions(message.questions.map((q: any) => ({
      display: q.display,
      answer: q.answer,
      botTime: 0,
    })));
  }
}
setCurrentQuestionIndex(0);
```

On `race_start`, keep resetting timers as today; do not regenerate questions.

- [ ] **Step 3: Stop pre-baking banks in `createRoom` / start countdown**

**`createRoom`:** remove the `tempQuestions` loop. POST body:

```typescript
body: JSON.stringify({
  hostId: playerIdRef.current,
  hostName: playerName,
  circuitId: circuit.id,
  driverId: driver.id,
  raceLength: getRaceLength(circuit.id, state.simMode),
})
```

Do not `setQuestions(tempQuestions)` — leave `questions` empty until `countdown_start` / patches.

**Start-race path** (where host generates `newQuestions` and PUTs/sends them): remove local `generateQuestion` loop for the shared bank. Keep weather resolution, circuit, power-ups, aero zones. `start_countdown` payload:

```typescript
wsRef.current.send(JSON.stringify({
  type: 'start_countdown',
  roomCode,
  circuitId: selectedCircuit.id,
  driverId: driver.id,
  weather: /* resolved wet/dry string as today */,
  operation: selectedOperation,
  powerUpsEnabled,
  raceLength,
  aeroZones,
  // omit questions — server mints
}));
```

Also stop sending `questions` in the REST room update if that path only existed to sync the bank.

Reset `dynamicDifficultyDisplay` to `'beginner'` when starting countdown.

- [ ] **Step 4: Send `correct` + `responseTime` on answer paths**

**Correct `progress_update`:** already has `responseTime` — add `correct: true`.

**Standard-mode wrong `progress_update`:** add `responseTime` and `correct: false`.

**Sim-mode `mistake_update`:** add `responseTime` (same `responseTime` variable already computed at submit).

- [ ] **Step 5: Guard UI on missing question**

Where the racing UI reads `questions[currentQuestionIndex]`, if missing show a short waiting state (or disable submit) instead of crashing — race the patch:

```typescript
const currentQuestion = overtakeActive && overtakeQuestion
  ? overtakeQuestion
  : questions[currentQuestionIndex];
// in submit: if (!currentQuestion) return;
```

- [ ] **Step 6: Add HUD strip in racing view**

Mirror Lane Racer — a slim bar above the question (or under the timer row):

```tsx
<div
  className="text-xs uppercase tracking-wider font-bold text-center py-1 shrink-0"
  style={{ fontFamily: 'Oxanium, sans-serif', color: difficultyColor, background: 'black' }}
>
  {difficultyLabel}
</div>
```

Place it in the existing racing layout near the question display (`gameStatus === "racing"` block ~line 1582).

- [ ] **Step 7: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 8: Commit (if user requested commits)**

```bash
git add client/src/pages/Multiplayer.tsx server/routes.ts
git commit -m "$(cat <<'EOF'
Drive multiplayer questions and HUD from server difficulty sync.

EOF
)"
```

---

### Task 5: Live difficulty for energy/OVERTAKE, finish copy, handoff, verify

**Files:**
- Modify: `client/src/pages/Multiplayer.tsx`
- Modify: `docs/next-session-handoff.md`

**Interfaces:**
- Consumes: `dynamicDifficultyDisplay` from Task 4; `getHarderDifficulty`, `calculateEnergyHarvest`
- Produces: energy/OVERTAKE use live shared level; finish UI can show achieved label; handoff points at next polish

- [ ] **Step 1: Replace hard-coded beginner in energy + OVERTAKE**

Everywhere Multiplayer currently uses `'beginner'` for harvest / harder overlay (including the OVERTAKE `useEffect` and post-correct harder regen), use `dynamicDifficultyDisplay`:

```typescript
const energyGain = calculateEnergyHarvest(
  responseTime,
  dynamicDifficultyDisplay,
  circuit.type
);

const harderDifficulty = getHarderDifficulty(dynamicDifficultyDisplay);
```

Keep OVERTAKE overlay **client-local** (do not write overlay into shared `questions`).

- [ ] **Step 2: Show achieved difficulty on finished screen (light touch)**

On the finished UI, add a single line using `dynamicDifficultyDisplay` / `difficultyLabel` (final shared level), e.g. under the win/lose header: `Difficulty: {difficultyLabel}`. No new leaderboard API required for this pass unless an existing MP finish payload already has a field — do not invent DB writes.

- [ ] **Step 3: Update handoff**

Rewrite `docs/next-session-handoff.md` tip/status to:

- MP shared dynamic difficulty **shipped** (server-owned, one track, freeze-on-first-touch)
- Next optional: opponent-paced `slowerThanBot`, reconnect resilience, dead-code cleanup from prior handoff
- Soft-follow still native-only

Keep resume commands and key file map accurate.

- [ ] **Step 4: Typecheck + manual host/guest spot-check**

Run: `npm run check`  
Expected: PASS

Manual (dev server `npm run dev -- --port 8081`):

1. Host + guest join; start race — both see Karting + same first question  
2. Answer several correctly/fast on one client — both HUD labels promote together  
3. Trailing player reaches a slot the leader already opened — same question text/answer  
4. Wrong answers in realism mode demote/affect shared difficulty without changing the current question  
5. OVERTAKE still swaps a harder overlay; race finishes cleanly  

- [ ] **Step 5: Commit (if user requested commits)**

```bash
git add client/src/pages/Multiplayer.tsx docs/next-session-handoff.md
git commit -m "$(cat <<'EOF'
Finish MP dynamic difficulty wiring and refresh session handoff.

EOF
)"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Server owns difficulty + questions (B) | 2, 3 |
| One shared track; both players’ answers update it | 3 |
| Start `beginner`; mint slot 0 | 2 |
| Freeze-on-first-touch per question slot | 2, 3 |
| `difficulty_sync` / `questions_patch` | 2, 3, 4 |
| Clients stop pre-bake | 4 |
| HUD live label | 4 |
| OVERTAKE overlay local; energy uses live difficulty | 5 |
| `slowerThanBot: false` | 3 |
| Shared pure engine (no React on server) | 1 |
| `npm run check` + host/guest verify | 1–5 |
| Handoff update | 5 |
| Out of scope (soft-follow web, GP Quali dynamic, per-player tracks) | Not scheduled |

## Placeholder / consistency scan

- Event names fixed: `difficulty_sync`, `questions_patch`
- Slot index = client `currentQuestionIndex` semantics (+1 per advancing answer)
- Difficulty type name: `Difficulty` everywhere
- Mint-after-update order called out in Task 3
