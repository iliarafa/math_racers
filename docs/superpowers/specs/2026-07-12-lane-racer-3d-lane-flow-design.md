# Lane Racer 3D — Continuous Lane Flow

**Date:** 2026-07-12  
**Branch:** `feature/lane-racer-3d`  
**Status:** Approved for planning  
**Scope:** 3D lane-change motion only — continuous lateral slide + light body lean

---

## Goal

From the chase camera, left/right lane changes should read as one continuous slide with light arcade lean — not hard compartment jumps between lane centers.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Focus | Lane-change feel (A) — not forward scroll stutter |
| Feel | Smooth slide + body lean (B) |
| Scope | 3D only (A) — 2D engine timing left alone |
| Approach | Fix continuous X from `carLaneVisual` + lean from transition (approach 1) |
| Gameplay | Integer `carLane` still drives collision; visuals use continuous X / lean |
| Props | Scratched for this pass — roadside props deferred |

## Problem

`carLaneVisual` already eases over ~150ms, but the 3D car positions with `laneXForIndex(carLaneVisual)`, which indexes `LANE_X[lane]`. Fractional lane values do not interpolate (non-integers fall through to the center/`0` fallback), so motion feels stepped or teleporty. Transition duration is also short enough to read as a snap.

## Visual / motion plan

### Lateral slide
- Keep integer `carLane` for input bounds and token collision.
- Keep eased `carLaneVisual` (ease-out cubic: `1 - (1 - t)^3`).
- Raise `LANE_TRANSITION_MS` from **150 → 300** in `laneRacerController3d.ts` only.
- Map visual lane to world X continuously across the three equal lanes:

```ts
carX = LANE_X[0] + carLaneVisual * (LANE_X[1] - LANE_X[0])
```

- Compute `carX` inside the controller each step and expose it on `LaneRacerRenderState`.
- Mid-slide re-input continues to restart from current `carLaneVisual` (existing behavior).

### Body lean
- Expose `carYaw` and `carRoll` on render state (radians).
- Peak magnitudes: yaw **10°**, roll **5°** (convert to radians in code).
- Envelope: `sin(π * transitionProgress)` so lean is 0 at start/end and peaks mid-slide.
- Direction: `sign(carLane - laneTransitionFrom)` (positive = right). When settled (`transitionProgress >= 1`), yaw = 0 and roll = 0.
- Apply: `carYaw = dir * peakYaw * envelope`, `carRoll = -dir * peakRoll * envelope` (roll opposite yaw for inward lean).

### Scene wiring
- `AnimatedPlayerCar` sets `position.x = rs.carX` (not `laneXForIndex(rs.carLaneVisual)`).
- Apply `rotation.y = carYaw`, `rotation.z = carRoll` on the car group each frame.
- Token placement keeps integer `laneXForIndex(token.lane)`.
- Optional: export `laneXVisual(t)` from the controller module for clarity; not required if `carX` is always on render state.

## Non-goals

- 2D `LaneRacerEngine` timing or draw path
- Roadside props (billboards / barriers / grandstands)
- Token readability, rival 3D ghost, camera redesign
- Car silhouette mesh changes
- Collision rule changes (still discrete lanes)
- New dependencies / GLB

## Success criteria

1. Holding left/right, the car slides continuously across lanes — no center snap or teleport mid-transition.
2. Body leans into the move, then settles flat when the lane change completes.
3. Correct / wrong / miss collisions still feel fair under the same discrete-lane rules.
4. 2D mode remains untouched and default.

## Files to change

- `client/src/lib/laneRacerController3d.ts` — transition duration, continuous `carX`, lean fields on render state
- `client/src/components/lane-racer/LaneRacerScene.tsx` — `AnimatedPlayerCar` position/rotation from new render fields
- `docs/lane-racer-3d-handoff.md` — note lane-flow polish; props still later
- `docs/superpowers/specs/2026-07-12-lane-racer-3d-lane-flow-design.md` — this spec

## Verify

- `/lane-racer` → enable **3D** → Start
- Single calm lane change: continuous slide + lean in/out
- Mash left/right mid-slide: no teleport, lean tracks direction
- Answer collisions still register on the discrete lane the player committed to
- Toggle **2D** and confirm unchanged lane feel

## Out of follow-up (not this plan)

- Match 2D transition timing to the new 3D duration
- Roadside props
- Token scale / contrast pass
- Spring-based lateral physics (approach 2 — only if timed ease still feels stiff after tuning)
