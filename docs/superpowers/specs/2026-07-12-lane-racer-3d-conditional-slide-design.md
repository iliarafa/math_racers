# Lane Racer 3D — Conditional Late-Steer Slide

**Date:** 2026-07-12  
**Branch:** `feature/lane-racer-3d`  
**Status:** Approved for planning  
**Scope:** Gate the full lane slide behind a near-token distance band; early lane changes snap onto the lane with grip

---

## Goal

Keep continuous lane motion from the lane-flow polish, but reserve the long slide + full lean for **last-minute** steers when the answer row is close. Early lane changes should **snap+grip** (short plant onto the road), not soft-slide every time.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Near trigger | Distance to answer row (A) — last ~30% of spawn→collision |
| Early feel | Snap+grip — 100ms, ease-out quintic, yaw 7° / roll 3.5° (revised from soft 200ms flow) |
| Empty track | Always soft flow (A) — no late slide without live tokens |
| Approach | Mode chosen at input time (approach 1) |
| Scope | 3D controller only; scene already consumes `carX` / lean |
| Gameplay | Integer `carLane` still drives collision |

## Problem

Always-on 300ms slide + full lean makes every lane change feel like a last-second dodge. The slide is best when the player reacts late to the answer tiles.

## Motion plan

### Modes

| Mode | When | Duration | Ease | Yaw peak | Roll peak |
|------|------|----------|------|----------|-----------|
| Early (snap+grip) | No tokens, or token `z` below near band | 100ms | ease-out quintic `1-(1-t)^5` | 7° | 3.5° |
| Late (slide) | Tokens present and `z >= LATE_SLIDE_Z` | 300ms | ease-out cubic `1-(1-t)^3` | 10° | 5° |

Shared for both modes:
- Continuous `carX` via `laneXVisual(carLaneVisual)`
- Lean envelope `sin(π * transitionProgress)`; roll opposite yaw for inward lean
- Mid-slide re-input restarts from current `carLaneVisual` and **re-picks mode** from current token distance
- Active ease power stored per move (`activeEasePower`) alongside duration / lean peaks

### Near band

- `TOKEN_SPAWN_Z = -48`, `COLLISION_Z = 1.2`, `TRACK_LENGTH ≈ 49.2`
- Last ~30% of approach: `LATE_SLIDE_Z = COLLISION_Z - 0.3 * TRACK_LENGTH` ≈ **-13.56**
- Late if any token (row) has `z >= LATE_SLIDE_Z`
- Single tunable constant / fraction — adjust if the chase cam makes “late” feel early or too late

### Input-time selection

On `moveLeft` / `moveRight`:
1. If `tokens.length === 0` → early  
2. Else if row `z >= LATE_SLIDE_Z` → late  
3. Else → early  
4. Store active transition duration + lean peaks for this move; `step()` uses those until the transition settles or a new move starts

## Non-goals

- 2D `LaneRacerEngine` changes
- Scene / car silhouette / atmosphere / props
- Spring-based lateral physics
- Revealing correct-answer lane in the motion rules
- Changing collision bands or scroll speed

## Success criteria

1. Far from tiles or empty track: snap+grip ~100ms plant with short lean — not the full slide.
2. Near tiles (past the distance band): full ~300ms slide with full lean.
3. Collision still fair on discrete lanes; 2D unchanged.
4. Mode switches cleanly on mid-slide re-input when distance crosses the band.

## Files to change

- `client/src/lib/laneRacerController3d.ts` — early/late constants, mode pick on move, `step()` uses active duration/peaks
- `docs/lane-racer-3d-handoff.md` — note conditional late-slide; always-on slide superseded
- `docs/superpowers/specs/2026-07-12-lane-racer-3d-conditional-slide-design.md` — this spec

## Verify

- `/lane-racer` → 3D → Start
- Change lanes while tokens are far / missing → snap+grip plant
- Wait until tiles are close, then steer → full slide
- Mash mid-slide across the band → mode re-picks without teleport
- 2D toggle unchanged

## Out of follow-up

- Time-to-collision trigger instead of distance
- Blended continuous duration from distance
- Matching 2D early/late timing
