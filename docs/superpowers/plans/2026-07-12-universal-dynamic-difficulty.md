# Universal Dynamic Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove series/difficulty pickers from in-scope race setups and adapt question difficulty mid-race with the Free Practice `initDynamicDifficulty` / `updateDynamicDifficulty` engine, starting every dynamic race from `beginner`.

**Architecture:** Mode-by-mode wiring (no engine rewrite). Lane Racer drops the Level drum and tracks live difficulty via refs + HUD state. Game.tsx Free Practice / GP Practice always init from `'beginner'`. Multiplayer stays fixed `beginner` this pass (no WS question sync). GP Quali/Race keep lock-after-Practice.

**Tech Stack:** React 19 + TypeScript, existing `gameLogic.ts` dynamic difficulty API, Vite/`npm run check` (tsc) — no unit-test runner in this repo.

## Global Constraints

- Start difficulty: always `beginner` (Karting)
- GP: lock after Practice (Quali + Race use `grandPrixLockedDifficulty`)
- Multiplayer this pass: fixed `beginner` questions / Karting `driverId` — no mid-race dynamic
- No championship unlock gates; do not reintroduce series pickers
- Reuse `initDynamicDifficulty` / `updateDynamicDifficulty` — no rewrite
- Deploy Harvest out of scope
- Spec: `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md`
- Branch: `main` (or a short-lived feature branch if the executor prefers; do not force-push)

---

## File map

| File | Role |
|------|------|
| `client/src/pages/LaneRacer.tsx` | Remove Level drum; wire dynamic difficulty; HUD label; score/`difficultyAchieved` from live level; rival estimate locked at beginner for the race |
| `client/src/pages/Game.tsx` | Free Practice + GP Practice: `initDynamicDifficulty('beginner')` and display start at beginner |
| `client/src/pages/Multiplayer.tsx` | Force Karting/`beginner` for room create, question gen, energy/overtake harder-Q math |
| `client/src/pages/Regulations.tsx` | Copy: series are adaptive levels, not a pre-race pick |
| `client/src/lib/gameLogic.ts` | No required changes (engine already correct) |

No new files.

---

### Task 1: Lane Racer — remove Level drum (2-column setup)

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`

**Interfaces:**
- Consumes: existing Team + Track drums, `OPERATION_OPTIONS` math chips
- Produces: setup UI with only Team + Track drums; `selectedDifficulty` remains `'beginner'` for now (Task 2 replaces usage)

- [ ] **Step 1: Delete Level-only constants and state**

Remove:

```ts
const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Karting', value: 'beginner' },
  { label: 'F3', value: 'easy' },
  { label: 'F2', value: 'medium' },
  { label: 'F1', value: 'hard' },
];
```

Remove `currentLevelIndex` state and `levelSwipeStartXRef`.

Keep `selectedDifficulty` state as `'beginner'` temporarily (Task 2 migrates it to live difficulty).

- [ ] **Step 2: Strip Level drum from the combination lock**

In the setup `gameStatus === 'setup'` block:

1. Delete `seriesColors`, `levelDisplayNames`, `goToNextLevel` / `goToPrevLevel`, `levelSwipe`.
2. Delete the entire `{/* LEVEL Drum */}` column and the first vertical divider after it.
3. Leave Team + Track drums side by side (two columns + one divider between them).
4. Update the setup comment from `series + track` to `team + track`.

- [ ] **Step 3: Typecheck**

Run: `npm run check`  
Expected: PASS (no unused `DIFFICULTY_OPTIONS` / level refs).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "$(cat <<'EOF'
Remove Lane Racer series level drum from setup.

Players keep team and track; difficulty selection moves to live adaptive in the next step.
EOF
)"
```

---

### Task 2: Lane Racer — wire Free Practice dynamic difficulty

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`

**Interfaces:**
- Consumes: `initDynamicDifficulty`, `updateDynamicDifficulty`, `DynamicDifficultyState`, `DRIVERS` (for labels), `Difficulty` from `@/lib/gameLogic`
- Produces:
  - `dynamicDifficultyRef: RefObject<DynamicDifficultyState | null>`
  - `currentDifficultyRef: RefObject<Difficulty>` (always mirrors live level for spawn)
  - `dynamicDifficultyDisplay: Difficulty` state for HUD
  - `questionStartTimeRef` for response-time deltas
  - Rival estimate locked to `'beginner'` for the race (avoids mid-race rival jumps)
  - Engine / 3D `difficulty` prop stays `'beginner'` for the race (avoids remount when level promotes)
  - Score + `difficultyAchieved` use final live difficulty

- [ ] **Step 1: Expand imports**

Change the `gameLogic` import to include:

```ts
import {
  useGameState,
  generateQuestion,
  generateWrongAnswers,
  CIRCUITS,
  RACE_LENGTH,
  SIM_LAP_COUNTS,
  calculateLaneRacerScore,
  estimateRivalRaceTimeMs,
  rivalProgress,
  rivalPosition,
  DRIVERS,
  initDynamicDifficulty,
  updateDynamicDifficulty,
} from "@/lib/gameLogic";
import type { Difficulty, DynamicDifficultyState } from "@/lib/gameLogic";
```

- [ ] **Step 2: Replace fixed difficulty state with dynamic refs + HUD state**

Replace:

```ts
const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');
```

with:

```ts
const dynamicDifficultyRef = useRef<DynamicDifficultyState | null>(null);
const currentDifficultyRef = useRef<Difficulty>('beginner');
const questionStartTimeRef = useRef<number>(Date.now());
const [dynamicDifficultyDisplay, setDynamicDifficultyDisplay] = useState<Difficulty>('beginner');
```

Add a small label helper near the top of the component (or inline where needed):

```ts
const difficultyLabel =
  DRIVERS.find(d => d.difficulty === dynamicDifficultyDisplay)?.label || 'Karting';
const difficultyColor =
  dynamicDifficultyDisplay === 'hard' ? '#ef4444'
  : dynamicDifficultyDisplay === 'medium' ? '#38bdf8'
  : dynamicDifficultyDisplay === 'easy' ? '#000000'
  : '#22c55e';
```

(Use white-friendly colors on the black HUD if `#000000` for F3 is unreadable — prefer `#e5e5e5` or `#a3a3a3` for the easy/F3 label on Lane Racer’s black strip only.)

Recommended Lane Racer HUD colors (match PST intent, readable on black):

```ts
const difficultyColor =
  dynamicDifficultyDisplay === 'hard' ? '#ef4444'
  : dynamicDifficultyDisplay === 'medium' ? '#38bdf8'
  : dynamicDifficultyDisplay === 'easy' ? '#e5e5e5'
  : '#22c55e';
```

- [ ] **Step 3: Init dynamic difficulty in `startGame`**

At the start of `startGame()`:

```ts
dynamicDifficultyRef.current = initDynamicDifficulty('beginner');
currentDifficultyRef.current = 'beginner';
setDynamicDifficultyDisplay('beginner');
```

- [ ] **Step 4: Spawn questions from live difficulty + stamp start time**

Update `spawnQuestion`:

```ts
const spawnQuestion = useCallback(() => {
  const difficulty = currentDifficultyRef.current;
  const q = generateQuestion(
    selectedCircuit.id,
    difficulty,
    false,
    0,
    prevDisplayRef.current,
    selectedOperation,
  );
  prevDisplayRef.current = q.display;
  const wrong = generateWrongAnswers(q.answer, 2);
  setQuestionDisplay(q.display);
  setQuestionNum(prev => prev + 1);
  questionStartTimeRef.current = Date.now();
  engineRef.current?.spawnTokens(q.answer, wrong);
}, [selectedCircuit.id, selectedOperation]);
```

- [ ] **Step 5: Update dynamic difficulty on correct / wrong / miss**

Replace `handleCorrect` / `handleWrong` / `handleMiss` so each answer updates the engine:

```ts
const applyDynamicDifficulty = useCallback((correct: boolean) => {
  if (!dynamicDifficultyRef.current) return;
  const responseTime = Date.now() - questionStartTimeRef.current;
  // Lane Racer has no bot sector clock; omit slowerThanBot (default false).
  const updated = updateDynamicDifficulty(
    dynamicDifficultyRef.current,
    correct,
    responseTime,
    selectedOperation,
  );
  dynamicDifficultyRef.current = updated;
  currentDifficultyRef.current = updated.currentDifficulty;
  setDynamicDifficultyDisplay(updated.currentDifficulty);
}, [selectedOperation]);

const handleCorrect = useCallback(() => {
  applyDynamicDifficulty(true);
  setCorrectCount(prev => prev + 1);
  if (state.soundEnabled) playBeep(880, 0.1);
}, [applyDynamicDifficulty, state.soundEnabled]);

const handleWrong = useCallback(() => {
  applyDynamicDifficulty(false);
  if (state.soundEnabled) playBeep(220, 0.2);
}, [applyDynamicDifficulty, state.soundEnabled]);

const handleMiss = useCallback(() => {
  applyDynamicDifficulty(false);
  if (state.soundEnabled) playBeep(220, 0.2);
}, [applyDynamicDifficulty, state.soundEnabled]);
```

- [ ] **Step 6: Lock engine + rival at beginner; score from achieved**

1. Engine init and `LaneRacerCanvas3D` `difficulty` prop: pass `'beginner'` (literal), **not** a changing state — remove `selectedDifficulty` from the engine `useEffect` dependency array.
2. Rival estimate:

```ts
const rivalTargetMs = useMemo(
  () => estimateRivalRaceTimeMs(raceLength, 'beginner', selectedOperation),
  [raceLength, selectedOperation],
);
```

3. Leaderboard / finished score — replace every `selectedDifficulty` with:

```ts
const achieved = dynamicDifficultyRef.current?.currentDifficulty ?? dynamicDifficultyDisplay;
```

Use `achieved` in `calculateLaneRacerScore(...)` and `difficultyAchieved: achieved`.

Places: finished auto-submit `useEffect`, and the finished-screen score display block (~line 852).

- [ ] **Step 7: HUD live series label**

In the countdown/racing HUD top strip, add a centered (or under the Q counter) series label:

```tsx
<div
  className="text-xs uppercase tracking-wider font-bold"
  style={{ fontFamily: 'Oxanium, sans-serif', color: difficultyColor }}
>
  {difficultyLabel}
</div>
```

Keep the existing Q / timer / ✓ layout readable — e.g. put the label as a second row under the top strip, or replace the green ✓ color logic only for the series name. Preferred: thin second row centered under the top strip so Q/timer/✓ stay put.

- [ ] **Step 8: Typecheck + manual spot-check**

Run: `npm run check`  
Expected: PASS.

Manual (http://localhost:8081 → Lane Racer):
1. Setup shows Team + Track only (no Karting→F1 drum).
2. Race starts; HUD shows Karting.
3. Fast correct answers eventually promote label toward F3/F2/F1.
4. Finish screen / submit uses achieved difficulty (not stuck on a pre-picked series).

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "$(cat <<'EOF'
Adapt Lane Racer difficulty live like Free Practice.

Questions and HUD follow the dynamic engine from beginner; setup no longer picks a series.
EOF
)"
```

---

### Task 3: Game.tsx — always init Free Practice / GP Practice from beginner

**Files:**
- Modify: `client/src/pages/Game.tsx` (countdown init ~lines 888–898)

**Interfaces:**
- Consumes: existing `initDynamicDifficulty`, `dynamicDifficultyRef`, `setDynamicDifficultyDisplay`
- Produces: dynamic races start at `'beginner'` regardless of `selectedDriver.difficulty`

- [ ] **Step 1: Harden race difficulty + dynamic init**

In the countdown `useEffect`, replace the difficulty block so Practice-dynamic paths start beginner, and non-dynamic paths keep existing lock / driver behavior:

```ts
const isDynamicPractice =
  (isGrandPrix && grandPrixPhase === 'rw_practice') || isPreSeasonTesting;

const raceDifficulty = (isGrandPrix && grandPrixLockedDifficulty && grandPrixPhase !== 'rw_practice')
  ? grandPrixLockedDifficulty
  : isDynamicPractice
    ? 'beginner'
    : selectedDriver.difficulty;
currentDifficultyRef.current = raceDifficulty;

if (isDynamicPractice) {
  dynamicDifficultyRef.current = initDynamicDifficulty('beginner');
  setDynamicDifficultyDisplay('beginner');
}
```

Do **not** change Quali/Race lock behavior or `updateDynamicDifficulty` call sites (already gated to Practice / PST).

- [ ] **Step 2: Typecheck**

Run: `npm run check`  
Expected: PASS.

- [ ] **Step 3: Manual spot-check**

1. Free Practice: HUD starts Karting even if `lastSelectedDriverId` was F1.
2. GP Practice → finish: locks achieved level; Quali questions stay at that lock.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Game.tsx
git commit -m "$(cat <<'EOF'
Start Free Practice and GP Practice from beginner.

Dynamic difficulty no longer inherits a leftover selected series.
EOF
)"
```

---

### Task 4: Multiplayer — force beginner / Karting

**Files:**
- Modify: `client/src/pages/Multiplayer.tsx`

**Interfaces:**
- Consumes: `DRIVERS` (Karting entry), `generateQuestion`, `getHarderDifficulty`
- Produces: room create / start / overtake harder-Q all use `beginner` / Karting `driverId`

- [ ] **Step 1: Resolve Karting driver once**

Near other constants / top of component:

```ts
const KARTING_DRIVER = DRIVERS.find(d => d.id === 'karting') ?? DRIVERS[0];
```

- [ ] **Step 2: Stop reading `lastSelectedDriverId` for difficulty**

Replace the `selectedDriver` initializer:

```ts
const [selectedDriver, setSelectedDriver] = useState<Driver | null>(KARTING_DRIVER);
```

Wherever host/guest sync sets driver from `message.driverId` / `data.room.driverId`, still apply the message for protocol compatibility, but when **creating** or **regenerating** questions as host, force Karting:

In `createRoom` and the start-countdown question generation path:

```ts
const driver = KARTING_DRIVER;
setSelectedDriver(driver);
// generateQuestion(..., driver.difficulty, ...)  // beginner
// body.driverId: driver.id
```

- [ ] **Step 3: Force beginner in overtake harder-question paths**

Replace `selectedDriver.difficulty` and `driverDifficulty` fallbacks used for question gen / energy with:

```ts
const driverDifficulty: Difficulty = 'beginner';
// getHarderDifficulty('beginner') for overtake harder Qs
```

Keep `selectedDriver` in state for any UI that shows series only if such UI exists — there is no series drum today; forcing Karting is enough.

- [ ] **Step 4: Typecheck + smoke**

Run: `npm run check`  
Expected: PASS.

Manual: create a room after previously playing Lane Racer / GP at a high label — questions should still be Karting-scale.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Multiplayer.tsx
git commit -m "$(cat <<'EOF'
Force multiplayer races to Karting difficulty for now.

Defers mid-race dynamic sync; avoids leftover series selection leaking into rooms.
EOF
)"
```

---

### Task 5: Regulations copy + final verification

**Files:**
- Modify: `client/src/pages/Regulations.tsx`

**Interfaces:**
- Consumes: existing `#Series` article copy
- Produces: copy that describes series as adaptive levels, not a pre-race pick

- [ ] **Step 1: Update Race article series wording**

In the `race` article `details`, replace the `#Series` block with:

```ts
"#Difficulty",
"Difficulty adapts during the race from your speed and accuracy (starts at Karting).",
"Karting — numbers 1 to 10",
"F3 — numbers 10 to 50",
"F2 — numbers 20 to 100",
"F1 — numbers 50 to 200",
```

In Grand Prix details, keep lock-after-Practice lines (already accurate). Optionally clarify Free Practice / Lane Racer share the same adaptive model — only if a one-line addition fits without bloating.

Update Garage “Racer Log — your race history grouped by series” only if misleading; otherwise leave (log may still group by stored series id).

- [ ] **Step 2: Final typecheck**

Run: `npm run check`  
Expected: PASS with no errors.

- [ ] **Step 3: Acceptance spot-check checklist**

1. Lane Racer setup: no Karting/F3/F2/F1 drum.
2. Lane Racer race: HUD series label moves with performance.
3. Free Practice: starts Karting; still adapts.
4. GP Practice → Quali: lock holds.
5. Multiplayer: beginner questions even after high `lastSelectedDriverId`.
6. No mode asks to pick series before racing.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Regulations.tsx
git commit -m "$(cat <<'EOF'
Clarify regulations: difficulty adapts in-race.

Series labels describe number ranges, not a pre-race picker.
EOF
)"
```

- [ ] **Step 5: Update handoff (optional but recommended)**

Update `docs/next-session-handoff.md` tip/status to note universal dynamic difficulty shipped for Lane Racer + FP/GP Practice beginner init + MP fixed beginner; next = MP mid-race dynamic sync.

```bash
git add docs/next-session-handoff.md
git commit -m "$(cat <<'EOF'
Point handoff at multiplayer dynamic difficulty follow-up.
EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Start every dynamic race at beginner | 2, 3 |
| GP lock-after-Practice unchanged | 3 (explicit non-change) |
| MP deferred dynamic; force beginner | 4 |
| No championship unlock work | — none (already gone) |
| Lane Racer remove Level drum | 1 |
| Lane Racer dynamic + HUD + difficultyAchieved | 2 |
| FP/GP Practice init beginner | 3 |
| Regulations copy | 5 |
| `npm run check` | every task |
| Out of scope: Deploy Harvest, MP WS sync, engine rewrite | — none |

No placeholders. Types match existing `Difficulty` / `DynamicDifficultyState` / `Driver` APIs.
