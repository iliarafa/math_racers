# Lane Racer 3D — Soft Atmosphere Polish

**Date:** 2026-07-08  
**Branch:** `feature/lane-racer-3d`  
**Status:** Approved for planning  
**Scope:** Soft depth only — gradient sky, textured grass, subtle fog. No roadside props.

---

## Goal

From the chase camera, the world should read as open track with soft atmospheric depth — not a flat green slab under a flat blue dome — without adding props or changing gameplay, collision, camera, scroll, tokens, or the 2D engine.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Feel | Atmosphere first (handoff track C) |
| Props this pass | None (soft only — A) |
| Haze strength | Subtle (A) — tokens stay crisp at spawn |
| Approach | Gradient sky + procedural grass + light fog (approach 1) |
| Implementation | Inline in `LaneRacerScene.tsx` (canvas textures, same pattern as asphalt/kerbs) |
| Assets | No photos, no GLB, no new dependencies |

## Visual plan

### Sky
- Keep the large backface sphere.
- Replace flat sky color with a vertical gradient texture: zenith slightly deeper blue → softer, desaturated blue-green near the horizon so the sky/grass join does not hard-cut.
- `fog={false}` on the sky material (sky is the backdrop; fog must not grey it out).

### Grass
- Keep the large ground plane.
- Procedural canvas texture: base `#2a5230` plus sparse lighter/darker green speckles (same idea as asphalt noise, coarser and greener).
- Soft UV repeat so chase-cam does not read obvious wallpaper tiling.
- Allow fog on grass so distance softens into haze.

### Fog
- `THREE.Fog` (linear), color ≈ mid mix of grass + horizon sky (muted teal-green).
- Near: past the car / mid-road (~25–40).
- Far: before the visual horizon (~180–280) — subtle only.
- If road dashes wash out, push `far` out and/or set `fog={false}` on asphalt, dashes, and kerbs.
- Explicit `fog={false}`: player car, answer tokens, particles, sky. Prefer fog off on road surface + markings so the track stays readable.

### Lighting
- Keep current ambient + two directionals.
- Nudge intensities only if the gradient makes the car look dull.
- No new lights. No shadows.

## Non-goals

- Billboards, grandstands, trees, barriers, curved track
- Rival / ghost progress-bar changes
- Token scale, gameplay, collision, camera, or scroll logic
- Any changes to the 2D `LaneRacerEngine`
- GLB models or photographic environment textures

## Success criteria

1. Horizon reads softer / deeper than the current flat sky + flat grass.
2. Far grass is not a uniform color slab.
3. Answer numbers remain crisp at spawn distance.
4. No new props; mesh/texture cost stays mobile-friendly.
5. 2D mode remains untouched and default.

## Files to change

- `client/src/components/lane-racer/LaneRacerScene.tsx` — `Sky`, `Ground`, scene fog, selective `fog` flags; helpers `makeSkyGradientTexture()` / `makeGrassTexture()`
- `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` — optional clear-color tweak to match horizon tint
- `docs/lane-racer-3d-handoff.md` — note atmosphere done; props still later

## Out of follow-up (not this plan)

- Roadside props / packed arcade strip
- Rival 3D ghost
- Token readability pass
- Scroll-wrap / mobile dpr QA (merge blockers, separate)
