# Lane Racer 3D Conditional Late-Steer Slide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use full lane slide + lean only when the answer row is near; early lane changes use a shorter soft-flow motion.

**Architecture:** On each `moveLeft`/`moveRight`, pick early vs late from token distance, store that move’s duration and lean peaks, and drive `step()` from those active values. Scene already reads `carX`/`carYaw`/`carRoll` — no scene changes.

**Tech Stack:** Existing `LaneRacerController3D` TypeScript (R3F scene unchanged).

## Global Constraints

- 3D only — do not change `laneRacerEngine.ts`
- Integer `carLane` still drives collision
- Early: 200ms, yaw 5°, roll 2.5°
- Late: 300ms, yaw 10°, roll 5°
- `LATE_SLIDE_Z = COLLISION_Z - 0.3 * TRACK_LENGTH` (≈ -13.56)
- Empty token list → always early
- No scene / props / silhouette / new dependencies
- Branch: `feature/lane-racer-3d`
- Spec: `docs/superpowers/specs/2026-07-12-lane-racer-3d-conditional-slide-design.md`

---

## File map

| File | Role |
|------|------|
| `client/src/lib/laneRacerController3d.ts` | Early/late constants, mode pick, active transition fields |
| `docs/lane-racer-3d-handoff.md` | Note conditional slide; always-on slide superseded |

No new files. Verify with `npm run check` + manual 3D play.

---

### Task 1: Early/late mode in the 3D controller

**Files:**
- Modify: `client/src/lib/laneRacerController3d.ts`
- Test: `npm run check`

**Interfaces:**
- Consumes: existing `tokens`, `carLane`, `carLaneVisual`, `laneTransitionFrom`, `laneTransitionStart`, `LANE_X` / lean math
- Produces:
  - `LANE_EARLY_MS = 200`, `LANE_LATE_MS = 300`
  - `LANE_EARLY_YAW` / `LANE_EARLY_ROLL` (5° / 2.5°)
  - `LANE_LATE_YAW` / `LANE_LATE_ROLL` (10° / 5°) — replace current single `LANE_LEAN_*` peaks
  - `LATE_SLIDE_FRACTION = 0.3`, `LATE_SLIDE_Z = COLLISION_Z - LATE_SLIDE_FRACTION * TRACK_LENGTH`
  - Private: `activeTransitionMs`, `activeLeanYaw`, `activeLeanRoll`
  - `private beginLaneTransition()` called from `moveLeft`/`moveRight`

- [ ] **Step 1: Replace single transition constants with early/late set**

Near the top of `laneRacerController3d.ts`, replace:

```ts
const LANE_TRANSITION_MS = 300;
const LANE_LEAN_YAW = (10 * Math.PI) / 180;
const LANE_LEAN_ROLL = (5 * Math.PI) / 180;
```

with:

```ts
const LANE_EARLY_MS = 200;
const LANE_LATE_MS = 300;
const LANE_EARLY_YAW = (5 * Math.PI) / 180;
const LANE_EARLY_ROLL = (2.5 * Math.PI) / 180;
const LANE_LATE_YAW = (10 * Math.PI) / 180;
const LANE_LATE_ROLL = (5 * Math.PI) / 180;
```

After `TRACK_LENGTH` is defined, add:

```ts
/** Last 30% of spawn→collision: late-slide band. */
const LATE_SLIDE_FRACTION = 0.3;
const LATE_SLIDE_Z = COLLISION_Z - LATE_SLIDE_FRACTION * TRACK_LENGTH;
```

- [ ] **Step 2: Add active transition fields + mode picker**

On the class, next to `laneTransitionStart` / `laneTransitionFrom`, add:

```ts
private activeTransitionMs = LANE_EARLY_MS;
private activeLeanYaw = LANE_EARLY_YAW;
private activeLeanRoll = LANE_EARLY_ROLL;
```

Add private helpers:

```ts
private isLateSlideWindow(): boolean {
  if (this.tokens.length === 0) return false;
  return this.tokens[0].z >= LATE_SLIDE_Z;
}

private beginLaneTransition() {
  this.laneTransitionFrom = this.carLaneVisual;
  this.laneTransitionStart = performance.now();
  if (this.isLateSlideWindow()) {
    this.activeTransitionMs = LANE_LATE_MS;
    this.activeLeanYaw = LANE_LATE_YAW;
    this.activeLeanRoll = LANE_LATE_ROLL;
  } else {
    this.activeTransitionMs = LANE_EARLY_MS;
    this.activeLeanYaw = LANE_EARLY_YAW;
    this.activeLeanRoll = LANE_EARLY_ROLL;
  }
}
```

Update `moveLeft` / `moveRight`:

```ts
moveLeft() {
  if (this.carLane > 0) {
    this.beginLaneTransition();
    this.carLane--;
  }
}

moveRight() {
  if (this.carLane < 2) {
    this.beginLaneTransition();
    this.carLane++;
  }
}
```

- [ ] **Step 3: Drive `step()` from active duration / peaks**

In `step()`, replace the transition block that uses `LANE_TRANSITION_MS` / `LANE_LEAN_YAW` / `LANE_LEAN_ROLL` with:

```ts
const transitionProgress = Math.min(
  (timestamp - this.laneTransitionStart) / this.activeTransitionMs,
  1,
);
const eased = 1 - Math.pow(1 - transitionProgress, 3);
this.carLaneVisual =
  this.laneTransitionFrom + (this.carLane - this.laneTransitionFrom) * eased;

if (transitionProgress >= 1) {
  this.carYaw = 0;
  this.carRoll = 0;
} else {
  const dir = Math.sign(this.carLane - this.laneTransitionFrom) || 0;
  const envelope = Math.sin(Math.PI * transitionProgress);
  this.carYaw = dir * this.activeLeanYaw * envelope;
  this.carRoll = -dir * this.activeLeanRoll * envelope;
}
```

Do not change collision code.

- [ ] **Step 4: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 5: Manual verify (3D)**

```bash
npm run dev -- --port 8081
# → http://localhost:8081/lane-racer → enable 3D → Start
```

Checklist:
- [ ] No tokens / far tokens: soft ~200ms flow, light lean
- [ ] Tokens past near band: full ~300ms slide, full lean
- [ ] Mid-slide mash across the band: re-picks mode, no teleport
- [ ] 2D toggle unchanged

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/laneRacerController3d.ts
git commit -m "$(cat <<'EOF'
Gate Lane Racer 3D full slide to late steers near tokens.

EOF
)"
```

---

### Task 2: Update handoff doc

**Files:**
- Modify: `docs/lane-racer-3d-handoff.md`
- Create already exists: plan file (commit with handoff if untracked)
- Test: read-through

**Interfaces:**
- Consumes: Task 1 behavior
- Produces: handoff noting conditional late-slide; always-on slide superseded

- [ ] **Step 1: Refresh handoff**

In `docs/lane-racer-3d-handoff.md`:
- Set **Last updated** to 2026-07-12
- Under done: note conditional early (200ms / half lean) vs late (300ms / full lean) gated by `LATE_SLIDE_Z`
- Under do-not-reopen: lock conditional slide v1 (tune `LATE_SLIDE_FRACTION` only if feel is wrong)
- Link spec: `docs/superpowers/specs/2026-07-12-lane-racer-3d-conditional-slide-design.md`
- Link plan: `docs/superpowers/plans/2026-07-12-lane-racer-3d-conditional-slide.md`
- Keep roadside props / merge QA in suggested next

- [ ] **Step 2: Commit**

```bash
git add docs/lane-racer-3d-handoff.md docs/superpowers/plans/2026-07-12-lane-racer-3d-conditional-slide.md
git commit -m "$(cat <<'EOF'
Note conditional late-steer slide in Lane Racer 3D handoff.

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Early 200ms / 5° / 2.5° | Task 1 |
| Late 300ms / 10° / 5° | Task 1 |
| `LATE_SLIDE_Z` last 30% | Task 1 |
| Empty track → early | Task 1 (`isLateSlideWindow`) |
| Mode at input time; re-pick on re-input | Task 1 (`beginLaneTransition`) |
| No scene / 2D changes | Global + Task 1 scope |
| Handoff update | Task 2 |

No placeholders. Active field names consistent across steps.
