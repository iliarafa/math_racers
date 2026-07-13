# Lane Racer 3D — Car Visual Polish

**Date:** 2026-07-08  
**Branch:** `feature/lane-racer-3d`  
**Status:** Approved for planning  
**Scope:** Replace the primitive box-stack player car with a medium-detail low-poly F1 silhouette. Environment and tokens are out of scope.

---

## Goal

From the chase camera, the player car should clearly read as a low-poly Formula 1 car in the selected team’s color, without changing gameplay, collision, camera, or the 2D engine.

## Decisions (locked)

| Choice | Decision |
|--------|----------|
| Focus | Car only (not environment / tokens) |
| Team look | Shared F1 silhouette + team color accents |
| Detail level | Medium (~15–20 meshes) |
| Implementation | Inline mesh group in `LaneRacerScene.tsx` (`PlayerCar`) |
| Assets | No GLB, no SVG extrusion, no car textures |

## Mesh plan

Replace `PlayerCar` with one `<group>` of primitives. `AnimatedPlayerCar` keeps driving lane X and punch scale unchanged.

**Parts:**
- Nose cone + main body — team color
- Sidepods — team color (optional slight darken)
- Cockpit tub + halo — dark
- Front wing + rear wing — dark
- Floor lip / bargeboard hint — dark, thin
- Mirrors — dark, small
- Four wheels — black cylinders

**Colors:** Body/sidepods from `TEAMS[teamId].color`. Wings, tires, halo, and floor stay near-black.

**Proportions:** Keep overall length ~1.8 and width ~0.9–1.4 so lane spacing and collision feel stay the same.

## Lighting

Keep existing ambient + single directional light. No shadows. No extra lights on the car.

## Non-goals

- Grandstands, billboards, curved track, richer roadside
- GLB models, SVG-mapped liveries, car textures
- Gameplay, collision, camera, scroll, or token changes
- Any changes to the 2D `LaneRacerEngine`
- Environment polish (deferred)

## Success criteria

1. Chase-cam view reads as a low-poly F1 car, not stacked boxes.
2. Selected team color is obvious on body/sidepods.
3. Lane switch and punch scale feel unchanged.
4. Mesh count stays in the ~15–20 range for mobile WebGL friendliness.
5. 2D mode remains untouched and default.

## Files to change

- `client/src/components/lane-racer/LaneRacerScene.tsx` — rewrite `PlayerCar` only
- Optionally update `docs/lane-racer-3d-handoff.md` known-issues note after ship

## Out of follow-up (not this plan)

- Environment polish (handoff item 5)
- Token scale tuning (handoff item 6)
- Three.js lazy-load already done; scroll wrap / mobile dpr remain separate
