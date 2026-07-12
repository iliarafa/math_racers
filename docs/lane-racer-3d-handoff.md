# Lane Racer 3D — Agent Handoff

**Branch:** `feature/lane-racer-3d`  
**Status:** Playable POC — not merge-ready  
**Last updated:** 2026-07-12

---

## Resume here (start here)

```bash
git checkout feature/lane-racer-3d
npm run dev -- --port 8081
# → http://localhost:8081/lane-racer → enable 3D → Start
```

### Done this session (2026-07-12)
- **Conditional lane slide** (supersedes always-on 300ms slide): early vs late chosen at input in `beginLaneTransition()`
  - **Early snap+grip** (token far / empty track): **100ms**, ease-out **quintic**, **no lean** — plants flat on the lane
  - **Late slide** (token in last 30% of track): 300ms, ease-out cubic, yaw 10° / roll 5°; gate `LATE_SLIDE_Z = COLLISION_Z - 0.3 * TRACK_LENGTH`
- Controller: `laneXVisual()`, eased `carLaneVisual` → continuous `carX`/`carYaw`/`carRoll`; mode re-picked on each L/R input
- Scene: `AnimatedPlayerCar` driven from `carX` + rotations (integer `carLane` collision unchanged)

### Done earlier on branch
- Chase-cam F1 rear car polish (thin wing, raised diffuser, darker tilted front wing)
- Soft atmosphere: gradient sky, speckled grass, subtle fog (`FOG_COLOR` `#7a9a8e`, near 32 / far 255)
- Shared fog/clear constants in `client/src/components/lane-racer/atmosphere.ts`
- Grass plane scrolls with `worldScrollZ` (same as road/tokens) — was frozen after speckles landed
- Three.js lazy-load already in place (`LaneRacer.tsx`)

### Suggested next (pick one)
1. **Merge QA** — phone + desktop, 2D regression, your sign-off on 3D vs 2D (merge blockers below)
2. **Roadside props** — billboards / grandstands / barriers (atmosphere-only pass is done)
3. **Token readability** — spawn scale / contrast at distance
4. **Rival** — still DOM ghost progress bar only; 3D ghost is optional later

### Do not reopen without reason
- Car silhouette (v1 locked)
- Conditional slide v1 locked — tune `LATE_SLIDE_FRACTION` only if feel is wrong (not duration/lean peaks)
- Lane-flow v1 locked unless motion still feels stiff (then spring approach 2)
- Soft atmosphere approach (gradient + grass + fog; no props in that pass)
- 2D engine removal
- Power-ups / championship hooks in Lane Racer

---

## What was built

Optional **3D arcade view** for Lane Racer alongside the existing **2D canvas engine**. Players opt in via a single **3D** toggle on the setup screen (defaults to 2D). Choice persists in `localStorage` key `laneRacerRenderer` (`'2d' | '3d'`).

### New dependencies
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@types/three` (dev)

### Key files
| File | Role |
|------|------|
| `client/src/lib/laneRacerController3d.ts` | 3D game logic — lanes, collision, speed/combo |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | R3F Canvas + HUD flash + clear color |
| `client/src/components/lane-racer/LaneRacerScene.tsx` | Scene: sky, grass, road, car, tokens, fog |
| `client/src/components/lane-racer/atmosphere.ts` | Shared `FOG_COLOR` / near / far |
| `client/src/pages/LaneRacer.tsx` | 2D/3D toggle, lazy 3D chunk, rival bar HUD |
| `docs/lane-racer-3d-handoff.md` | This file |
| `docs/superpowers/specs/2026-07-08-lane-racer-3d-atmosphere-design.md` | Atmosphere spec |
| `docs/superpowers/plans/2026-07-08-lane-racer-3d-atmosphere.md` | Atmosphere plan |

### Unchanged (intentionally kept)
| File | Notes |
|------|-------|
| `client/src/lib/laneRacerEngine.ts` | 2D engine — still default when 3D off |
| `client/src/lib/laneRacerHud.ts` | Shared speed math |

---

## Architecture

```
LaneRacer.tsx (setup, HUD, finish, questions)
    │
    ├── renderMode === '2d' → LaneRacerEngine (canvas 2D)
    │
    └── renderMode === '3d' → LaneRacerCanvas3D (R3F, lazy)
              ├── LaneRacerController3D  (game state, tick loop)
              └── LaneRacerScene         (meshes, useFrame updates)
```

**Shared engine API** (both 2D and 3D via ref):  
`moveLeft`, `moveRight`, `spawnTokens`, `needsTokens`, `isFinished`, `pause`, `resume`, `destroy`, `setSafeBottomInset`

**3D scroll principle (critical):** One `scrollAmount` per frame in `LaneRacerController3D.step()`:
- Applied to `token.z` and accumulated in `worldScrollZ`
- Road group: `position.z = mod(worldScrollZ, DASH_PERIOD)`
- Grass ground: `position.z = mod(worldScrollZ, GRASS_TILE)` so runoff streams with the track
- Do **not** leave grass static if it has a visible texture — speckles make freeze obvious

**Rival:** DOM progress-bar ghost only (`LaneRacer.tsx`) — not a 3D opponent.

---

## How to run & test

```bash
git checkout feature/lane-racer-3d
npm run dev -- --port 8081
npm run check
npm run build   # Three.js lazy-loaded on 3D path
```

### Verify checklist
- [ ] 2D mode still works (default)
- [ ] 3D toggle persists
- [ ] Road, dashes, kerbs, **grass**, tokens scroll together
- [ ] Soft horizon (no hard dark fog strip under sky)
- [ ] Answer numbers crisp at spawn
- [ ] Lane switch: early snap flat (100ms / quintic / no lean) far from token; late slide (300ms / cubic / lean) in last 30%; mash L/R mid-slide OK
- [ ] Finish + leaderboard
- [ ] Mobile WebGL acceptable

---

## Known issues & next work

### High priority
1. ~~**Code-split Three.js**~~ — done (`LaneRacer.tsx` lazy + preload)
2. **Scroll wrap tuning** — road `DASH_PERIOD` / grass `GRASS_TILE` if seams appear
3. **Mobile WebGL perf** — iOS/Capacitor; dpr / mesh count

### Visual polish
4. ~~Car~~ — medium F1 silhouette done; GLB optional later
5. ~~Atmosphere~~ — gradient sky, scrolling speckled grass, fog done; **props still open**
6. ~~Lane-flow~~ — conditional early/late `carX` + yaw/roll lean done; tune `LATE_SLIDE_FRACTION` only if band feels wrong
7. Token scale at spawn — optional

### Merge blockers (before `main`)
- [x] Lazy-load 3D route chunk
- [ ] Manual QA on phone + desktop
- [ ] Confirm 2D regression-free
- [ ] User sign-off on 3D feel vs 2D

---

## Design decisions (don't revert without discussion)

| Decision | Rationale |
|----------|-----------|
| Keep 2D engine | User wanted both; 3D is opt-in |
| Single **3D** button | 2D is default |
| Same game rules as 2D | Arcade parity |
| Unified `worldScrollZ` | Road / markings / kerbs / grass / numbers move together |
| Soft atmosphere before props | Depth first; roadside dressing later |
| Conditional lane X + lean | Integer `carLane` for collision; early/late slide via `beginLaneTransition()` + `LATE_SLIDE_Z` |
| Rival stays DOM ghost | Not a 3D opponent in v1 |

---

## Specs & plans

- 2D design: `docs/superpowers/specs/2026-03-14-lane-racer-design.md`
- Car polish: `docs/superpowers/specs/2026-07-08-lane-racer-3d-car-polish-design.md`
- Atmosphere: `docs/superpowers/specs/2026-07-08-lane-racer-3d-atmosphere-design.md`
- Atmosphere plan: `docs/superpowers/plans/2026-07-08-lane-racer-3d-atmosphere.md`
- Lane-flow: `docs/superpowers/specs/2026-07-12-lane-racer-3d-lane-flow-design.md`
- Lane-flow plan: `docs/superpowers/plans/2026-07-12-lane-racer-3d-lane-flow.md`
- Conditional slide: `docs/superpowers/specs/2026-07-12-lane-racer-3d-conditional-slide-design.md`
- Conditional slide plan: `docs/superpowers/plans/2026-07-12-lane-racer-3d-conditional-slide.md`

---

## Git

```bash
git log --oneline feature/lane-racer-3d ^main
git diff main...feature/lane-racer-3d
```

Recent tip commits: conditional slide controller (`49fb4e3`), lane-flow scene (`4948ae2`), lane-flow controller (`beff1f5`), grass scroll (`24f550e`).

**Do not merge to `main` without QA + sign-off.**
