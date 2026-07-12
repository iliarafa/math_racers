# Lane Racer 3D Continuous Lane Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 3D lane changes a continuous lateral slide with light yaw/roll lean, fixing the broken fractional-lane X mapping.

**Architecture:** Keep integer `carLane` for collision/input. Keep eased `carLaneVisual`, but compute continuous `carX` plus `carYaw`/`carRoll` in `LaneRacerController3D.step()` and apply them in `AnimatedPlayerCar`. Leave the 2D engine untouched.

**Tech Stack:** Existing TypeScript controller + React Three Fiber scene (`useFrame` on car group).

## Global Constraints

- 3D only — do not change `laneRacerEngine.ts` transition timing or draw path
- Integer `carLane` still drives collision; visuals use continuous X / lean
- Peak lean: yaw 10°, roll 5°; envelope `sin(π * transitionProgress)`
- `LANE_TRANSITION_MS` = 300 (was 150)
- No roadside props, no car silhouette changes, no new dependencies
- Branch: `feature/lane-racer-3d`
- Spec: `docs/superpowers/specs/2026-07-12-lane-racer-3d-lane-flow-design.md`

---

## File map

| File | Role |
|------|------|
| `client/src/lib/laneRacerController3d.ts` | Duration, `laneXVisual`, `carX` / lean on render state |
| `client/src/components/lane-racer/LaneRacerScene.tsx` | `AnimatedPlayerCar` uses `carX` + rotations |
| `docs/lane-racer-3d-handoff.md` | Note lane-flow polish; props still later |

No new files. No unit-test runner in this repo — verify with `npm run check` + manual 3D play.

---

### Task 1: Continuous carX + lean in the 3D controller

**Files:**
- Modify: `client/src/lib/laneRacerController3d.ts`
- Test: `npm run check`

**Interfaces:**
- Consumes: existing `LANE_X`, `carLane`, `carLaneVisual`, `laneTransitionFrom`, `laneTransitionStart`
- Produces:
  - `export function laneXVisual(lane: number): number`
  - `LaneRacerRenderState.carX: number`
  - `LaneRacerRenderState.carYaw: number` (radians)
  - `LaneRacerRenderState.carRoll: number` (radians)
  - `LANE_TRANSITION_MS = 300`
  - Peak constants: `LANE_LEAN_YAW = (10 * Math.PI) / 180`, `LANE_LEAN_ROLL = (5 * Math.PI) / 180`

- [ ] **Step 1: Extend render state + constants**

In `laneRacerController3d.ts`, update the interface and constants:

```ts
export interface LaneRacerRenderState {
  carLane: number;
  carLaneVisual: number;
  /** Continuous world X from carLaneVisual (not discrete lane centers). */
  carX: number;
  /** Yaw (rad) during lane change — 0 when settled. */
  carYaw: number;
  /** Roll (rad) during lane change — 0 when settled. */
  carRoll: number;
  worldScrollZ: number;
  scrollDelta: number;
  tokens: AnswerToken3D[];
  flashColor: 'green' | 'red' | null;
  flashAlpha: number;
  speedKmh: number;
  popupLabel: string;
  popupAlpha: number;
  shakeMagnitude: number;
  carPunchScale: number;
  particles: Array<{ x: number; y: number; z: number; life: number; maxLife: number; color: string }>;
}

const LANE_TRANSITION_MS = 300;
const LANE_LEAN_YAW = (10 * Math.PI) / 180;
const LANE_LEAN_ROLL = (5 * Math.PI) / 180;
```

Keep `laneXForIndex` for **integer** token/particle placement. Add:

```ts
/** Continuous X across lanes 0..2 (fractional lane values interpolate). */
export function laneXVisual(lane: number): number {
  return LANE_X[0] + lane * (LANE_X[1] - LANE_X[0]);
}
```

- [ ] **Step 2: Initialize and sync new render fields**

In `readonly renderState` defaults, add:

```ts
carX: laneXVisual(1),
carYaw: 0,
carRoll: 0,
```

In `syncRenderState()`, after assigning `carLaneVisual`, set:

```ts
rs.carX = laneXVisual(this.carLaneVisual);
rs.carYaw = this.carYaw;
rs.carRoll = this.carRoll;
```

Add private fields on the class:

```ts
private carYaw = 0;
private carRoll = 0;
```

- [ ] **Step 3: Compute lean + carX inside `step()`**

Replace the lane-transition block in `step()` with:

```ts
const transitionProgress = Math.min(
  (timestamp - this.laneTransitionStart) / LANE_TRANSITION_MS,
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
  this.carYaw = dir * LANE_LEAN_YAW * envelope;
  this.carRoll = -dir * LANE_LEAN_ROLL * envelope;
}
```

`syncRenderState()` (already called at end of `step`) will publish `carX` / lean.

Do **not** change collision code — it must keep using integer `this.carLane`.

- [ ] **Step 4: Typecheck**

Run: `npm run check`  
Expected: PASS (no new TS errors in controller / scene yet may error until Task 2 if scene still compiles — scene does not read new fields yet, so check should pass).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/laneRacerController3d.ts
git commit -m "$(cat <<'EOF'
Add continuous 3D lane X and lean to Lane Racer controller.

EOF
)"
```

---

### Task 2: Wire AnimatedPlayerCar to carX / lean

**Files:**
- Modify: `client/src/components/lane-racer/LaneRacerScene.tsx` (`AnimatedPlayerCar` only)
- Test: `npm run check` + manual at `http://localhost:8081/lane-racer`

**Interfaces:**
- Consumes: `rs.carX`, `rs.carYaw`, `rs.carRoll` from Task 1
- Produces: car group positioned/rotated continuously each frame

- [ ] **Step 1: Update `AnimatedPlayerCar` `useFrame`**

Replace the position-only update with:

```tsx
useFrame(() => {
  const rs = controller.renderState;
  if (!groupRef.current) return;
  groupRef.current.position.set(rs.carX, 0, 1.2);
  groupRef.current.rotation.y = rs.carYaw;
  groupRef.current.rotation.z = rs.carRoll;
  groupRef.current.scale.setScalar(rs.carPunchScale);
});
```

Leave token placement on `laneXForIndex(token.lane)` unchanged. Do not remove the `laneXForIndex` import if tokens still use it.

- [ ] **Step 2: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 3: Manual verify (3D)**

```bash
npm run dev -- --port 8081
# → http://localhost:8081/lane-racer → enable 3D → Start
```

Checklist:
- [ ] Single left/right: continuous slide (~300ms), lean in mid-slide, settle flat
- [ ] Mash left/right mid-slide: no teleport to center; lean tracks direction
- [ ] Answer collisions still feel fair
- [ ] Toggle 2D: lane feel unchanged from before

- [ ] **Step 4: Commit**

```bash
git add client/src/components/lane-racer/LaneRacerScene.tsx
git commit -m "$(cat <<'EOF'
Drive Lane Racer 3D car from continuous X and lean.

EOF
)"
```

---

### Task 3: Update handoff doc

**Files:**
- Modify: `docs/lane-racer-3d-handoff.md`
- Test: read-through only

**Interfaces:**
- Consumes: completed Tasks 1–2
- Produces: handoff that lists lane-flow as done; props still later

- [ ] **Step 1: Refresh “Done this session” / suggested next**

Update the top of `docs/lane-racer-3d-handoff.md`:

- Add bullet: continuous 3D lane slide + yaw/roll lean (`LANE_TRANSITION_MS` 300, `carX`/`carYaw`/`carRoll`)
- Keep roadside props under suggested next (deferred)
- Under “Do not reopen”: note lane-flow v1 locked unless motion still feels stiff (then spring approach 2)
- Point to spec: `docs/superpowers/specs/2026-07-12-lane-racer-3d-lane-flow-design.md`
- Point to plan: `docs/superpowers/plans/2026-07-12-lane-racer-3d-lane-flow.md`
- Set **Last updated** to 2026-07-12

- [ ] **Step 2: Commit**

```bash
git add docs/lane-racer-3d-handoff.md docs/superpowers/plans/2026-07-12-lane-racer-3d-lane-flow.md
git commit -m "$(cat <<'EOF'
Note Lane Racer 3D lane-flow polish in handoff.

EOF
)"
```

(Include this plan file in the same commit if it is not committed yet.)

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Continuous `carX` from `carLaneVisual` | Task 1 |
| `LANE_TRANSITION_MS` 300 | Task 1 |
| Yaw 10° / roll 5° / `sin(π·t)` envelope | Task 1 |
| Scene uses `carX` + rotations | Task 2 |
| Integer collision unchanged | Task 1 (no collision edits) |
| 2D untouched | Global constraint |
| Handoff update | Task 3 |
| Manual verify checklist | Task 2 Step 3 |

No placeholders. Types `carX` / `carYaw` / `carRoll` consistent across tasks.
