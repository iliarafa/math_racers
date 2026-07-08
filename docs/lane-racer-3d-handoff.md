# Lane Racer 3D — Agent Handoff

**Branch:** `feature/lane-racer-3d`  
**Status:** Playable POC — not merge-ready  
**Last updated:** 2026-07-08

---

## What was built

Optional **3D arcade view** for Lane Racer alongside the existing **2D canvas engine**. Players opt in via a single **3D** toggle on the setup screen (defaults to 2D). Choice persists in `localStorage` key `laneRacerRenderer` (`'2d' | '3d'`).

### New dependencies
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@types/three` (dev)

### New files
| File | Role |
|------|------|
| `client/src/lib/laneRacerController3d.ts` | 3D game logic — lanes, collision, speed/combo (mirrors 2D rules) |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | R3F Canvas wrapper + imperative engine API |
| `client/src/components/lane-racer/LaneRacerScene.tsx` | 3D scene: road, sky, ground, kerbs, car, tokens |
| `docs/lane-racer-3d-handoff.md` | This file |

### Modified files
| File | Change |
|------|--------|
| `client/src/pages/LaneRacer.tsx` | 2D/3D toggle; conditional render of `LaneRacerEngine` vs `LaneRacerCanvas3D` |
| `package.json` / `package-lock.json` | Three.js stack |

### Unchanged (intentionally kept)
| File | Notes |
|------|-------|
| `client/src/lib/laneRacerEngine.ts` | Original 2D engine — still used when 3D toggle is off |
| `client/src/lib/laneRacerHud.ts` | Shared speed math for both engines |

---

## Architecture

```
LaneRacer.tsx (setup, HUD, finish, questions)
    │
    ├── renderMode === '2d' → LaneRacerEngine (canvas 2D)
    │
    └── renderMode === '3d' → LaneRacerCanvas3D (R3F)
              ├── LaneRacerController3D  (game state, tick loop)
              └── LaneRacerScene         (meshes, useFrame updates)
```

**Shared engine API** (both 2D and 3D implement via ref):
`moveLeft`, `moveRight`, `spawnTokens`, `needsTokens`, `isFinished`, `pause`, `resume`, `destroy`, `setSafeBottomInset`

**3D scroll principle (critical):** One `scrollAmount` per frame in `LaneRacerController3D.step()`:
- Applied to `token.z` and accumulated in `worldScrollZ`
- Road group in `LaneRacerScene` sets `position.z = mod(worldScrollZ, DASH_PERIOD)` so road, lane dashes, kerbs, and tokens move in lockstep
- Do **not** reintroduce separate UV-only scrolling for asphalt without matching geometry motion

**Scoring / leaderboard / rival bar:** Unchanged — same as 2D, handled in `LaneRacer.tsx`.

---

## How to run & test

```bash
git checkout feature/lane-racer-3d
npm run dev -- --port 8081
```

Open `http://localhost:8081/lane-racer` → enable **3D** toggle → Start.

```bash
npm run check   # TypeScript
npm run build   # Production build (Three.js lazy-loaded on 3D path via LaneRacer.tsx)
```

### Verify checklist
- [ ] 2D mode still works (default, no toggle)
- [ ] 3D toggle persists across sessions
- [ ] Road, lane dashes, kerbs, answer tokens scroll at **same speed**
- [ ] Lane switch (keyboard / swipe) hits correct answers
- [ ] Speed ramp / penalties feel similar to 2D
- [ ] No blue gaps at screen edges; clean green→blue horizon
- [ ] Kerbs read as **flat painted stripes**, not 3D blocks
- [ ] Answer numbers legible at spawn distance
- [ ] Finish screen + leaderboard submit

---

## Known issues & next work

### High priority
1. ~~**Code-split Three.js**~~ — done: `LaneRacerCanvas3D` lazy-loaded in `LaneRacer.tsx` with preload on 3D toggle (2026-07-08)
2. **Scroll wrap tuning** — `mod(worldScrollZ, 3)` may need adjustment if road/kerb repeat period doesn't match visual seamless loop
3. **Mobile WebGL perf** — test on iOS/Capacitor; cap `dpr`, reduce geometry if needed

### Visual polish
4. ~~Low-poly car is primitive boxes~~ — done: medium-detail F1 silhouette with team colors (2026-07-08). GLB/SVG livery still optional later.
5. ~~Environment atmosphere~~ — done: gradient sky, speckled grass, subtle fog (2026-07-08). Roadside props (grandstands / billboards) and curved track still optional later.
6. Answer tokens use canvas textures on billboards — works well; tune scale at spawn if needed

### Merge blockers (before `main`)
- [x] Lazy-load 3D route chunk
- [ ] Manual QA on phone + desktop
- [ ] Confirm 2D regression-free
- [ ] User sign-off on 3D feel vs 2D

---

## Design decisions (don't revert without discussion)

| Decision | Rationale |
|----------|-----------|
| Keep 2D engine | User explicitly wanted both; 3D is opt-in toggle |
| Single **3D** button (not 2D/3D pair) | 2D is implicit default |
| Same game rules as 2D | Arcade parity; no power-ups in Lane Racer |
| Unified `worldScrollZ` | User stated road/markings/kerbs/numbers must move together |

---

## Original spec (for context)

Design spec: `docs/superpowers/specs/2026-03-14-lane-racer-design.md` (2D top-down; 3D diverges visually but shares question/scoring flow)

---

## Git

```bash
git log --oneline feature/lane-racer-3d ^main   # commits on branch
git diff main...feature/lane-racer-3d           # full branch diff
```

**Do not merge to `main` without QA.**
