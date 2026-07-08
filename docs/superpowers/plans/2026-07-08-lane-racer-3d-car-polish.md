# Lane Racer 3D Car Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the box-stack `PlayerCar` in the 3D Lane Racer scene with a medium-detail low-poly F1 silhouette that uses the selected team color on body/sidepods.

**Architecture:** Keep all geometry inline in `LaneRacerScene.tsx`. Rewrite only the `PlayerCar` function component as a `<group>` of ~15–20 primitive meshes. `AnimatedPlayerCar` continues to set lane X and punch scale; controller, camera, tokens, and 2D engine stay untouched.

**Tech Stack:** React Three Fiber, Three.js primitives (`boxGeometry`, `cylinderGeometry`), existing `TEAMS` colors from `@/lib/carSvgs`.

## Global Constraints

- Car only — no environment, token, camera, collision, or 2D engine changes
- No GLB, SVG extrusion, or car textures
- Body/sidepods use `TEAMS[teamId].color`; wings/tires/halo/floor stay near-black
- Overall length ~1.8, width ~0.9–1.4 (match current footprint)
- Mesh count ~15–20
- Keep existing ambient + directional lighting; no shadows
- Branch: `feature/lane-racer-3d`

---

## File map

| File | Role |
|------|------|
| `client/src/components/lane-racer/LaneRacerScene.tsx` | Rewrite `PlayerCar` only |
| `docs/lane-racer-3d-handoff.md` | Mark car polish item done after ship |
| `docs/superpowers/specs/2026-07-08-lane-racer-3d-car-polish-design.md` | Spec (already committed) |

No new files.

---

### Task 1: Rewrite `PlayerCar` mesh

**Files:**
- Modify: `client/src/components/lane-racer/LaneRacerScene.tsx` (function `PlayerCar`, currently ~lines 188–223)
- Test: visual at `http://localhost:8081/lane-racer` + `npm run check`

**Interfaces:**
- Consumes: `teamId: TeamId`, `teamColor(teamId)` helper already in file
- Produces: same `PlayerCar({ teamId })` React component used by `AnimatedPlayerCar`

- [ ] **Step 1: Confirm current `PlayerCar` footprint**

Open `client/src/components/lane-racer/LaneRacerScene.tsx` and note the existing car uses:
- Body box ~`[0.9, 0.35, 1.8]` at y `0.35`
- Wheels at x `±0.55`, z `±0.55`
- Group origin at ground; `AnimatedPlayerCar` places group at `(laneX, 0, 1.2)`

Keep that overall envelope when rebuilding.

- [ ] **Step 2: Replace `PlayerCar` with the medium-detail F1 group**

Replace the entire `PlayerCar` function with:

```tsx
function PlayerCar({ teamId }: { teamId: TeamId }) {
  const color = teamColor(teamId);
  const dark = '#1a1a1a';
  const tire = '#111111';
  const carbon = '#0d0d0d';

  return (
    <group>
      {/* Floor / bargeboard lip */}
      <mesh position={[0, 0.06, 0.05]}>
        <boxGeometry args={[1.15, 0.04, 1.55]} />
        <meshStandardMaterial color={carbon} metalness={0.2} roughness={0.8} fog={false} />
      </mesh>

      {/* Main body / monocoque */}
      <mesh position={[0, 0.28, 0.05]}>
        <boxGeometry args={[0.55, 0.28, 1.35]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} fog={false} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0.22, -0.85]}>
        <boxGeometry args={[0.28, 0.16, 0.55]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} fog={false} />
      </mesh>
      <mesh position={[0, 0.18, -1.15]}>
        <boxGeometry args={[0.16, 0.1, 0.22]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} fog={false} />
      </mesh>

      {/* Sidepods */}
      <mesh position={[-0.42, 0.22, 0.15]}>
        <boxGeometry args={[0.32, 0.22, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} fog={false} />
      </mesh>
      <mesh position={[0.42, 0.22, 0.15]}>
        <boxGeometry args={[0.32, 0.22, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} fog={false} />
      </mesh>

      {/* Cockpit tub */}
      <mesh position={[0, 0.42, 0.05]}>
        <boxGeometry args={[0.38, 0.16, 0.55]} />
        <meshStandardMaterial color={dark} metalness={0.3} roughness={0.5} fog={false} />
      </mesh>

      {/* Halo */}
      <mesh position={[0, 0.58, 0.05]}>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color={dark} metalness={0.6} roughness={0.3} fog={false} />
      </mesh>
      <mesh position={[0, 0.52, -0.12]}>
        <boxGeometry args={[0.08, 0.18, 0.08]} />
        <meshStandardMaterial color={dark} metalness={0.6} roughness={0.3} fog={false} />
      </mesh>

      {/* Front wing */}
      <mesh position={[0, 0.12, -1.28]}>
        <boxGeometry args={[1.35, 0.05, 0.22]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>
      <mesh position={[-0.62, 0.2, -1.28]}>
        <boxGeometry args={[0.06, 0.2, 0.2]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>
      <mesh position={[0.62, 0.2, -1.28]}>
        <boxGeometry args={[0.06, 0.2, 0.2]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>

      {/* Rear wing */}
      <mesh position={[0, 0.72, 0.85]}>
        <boxGeometry args={[1.15, 0.05, 0.18]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>
      <mesh position={[-0.5, 0.55, 0.85]}>
        <boxGeometry args={[0.05, 0.35, 0.16]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>
      <mesh position={[0.5, 0.55, 0.85]}>
        <boxGeometry args={[0.05, 0.35, 0.16]} />
        <meshStandardMaterial color={dark} metalness={0.35} roughness={0.45} fog={false} />
      </mesh>

      {/* Mirrors */}
      <mesh position={[-0.32, 0.48, -0.15]}>
        <boxGeometry args={[0.12, 0.04, 0.08]} />
        <meshStandardMaterial color={dark} fog={false} />
      </mesh>
      <mesh position={[0.32, 0.48, -0.15]}>
        <boxGeometry args={[0.12, 0.04, 0.08]} />
        <meshStandardMaterial color={dark} fog={false} />
      </mesh>

      {/* Wheels — cylinders rotated to axle axis */}
      {([
        [-0.55, -0.55],
        [0.55, -0.55],
        [-0.55, 0.55],
        [0.55, 0.55],
      ] as const).map(([sx, sz]) => (
        <mesh key={`${sx}-${sz}`} position={[sx, 0.18, sz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.22, 12]} />
          <meshStandardMaterial color={tire} metalness={0.1} roughness={0.9} fog={false} />
        </mesh>
      ))}
    </group>
  );
}
```

Do not change `AnimatedPlayerCar`, `teamColor`, lighting, or any other scene function.

- [ ] **Step 3: Typecheck**

Run: `npm run check`  
Expected: exit 0, no errors in `LaneRacerScene.tsx`

- [ ] **Step 4: Visual QA in browser**

1. Ensure dev server is on port 8081 (`npm run dev -- --port 8081` if needed)
2. Open `http://localhost:8081/lane-racer`
3. Toggle **3D**, pick each team (Mercedes / Ferrari / McLaren / Red Bull), Start
4. Confirm:
   - Car reads as F1 (nose, wings, halo, sidepods) not stacked boxes
   - Team color shows on body/sidepods
   - Lane switches still hit correct tokens
   - Punch scale on correct answer still works
   - 2D mode (toggle off) unchanged

- [ ] **Step 5: Commit**

```bash
git add client/src/components/lane-racer/LaneRacerScene.tsx
git commit -m "$(cat <<'EOF'
Polish Lane Racer 3D player car into a low-poly F1 silhouette.

EOF
)"
```

---

### Task 2: Update handoff note

**Files:**
- Modify: `docs/lane-racer-3d-handoff.md` (Visual polish section)

**Interfaces:**
- Consumes: Task 1 complete
- Produces: handoff reflects car polish done; environment still open

- [ ] **Step 1: Update known-issues car bullet**

In `docs/lane-racer-3d-handoff.md`, under **Visual polish**, change item 4 from:

```markdown
4. Low-poly car is primitive boxes — consider GLB models or extruded team SVGs
```

to:

```markdown
4. ~~Low-poly car is primitive boxes~~ — done: medium-detail F1 silhouette with team colors (2026-07-08). GLB/SVG livery still optional later.
```

Leave environment (item 5) and token (item 6) bullets unchanged.

- [ ] **Step 2: Commit**

```bash
git add docs/lane-racer-3d-handoff.md
git commit -m "$(cat <<'EOF'
Note Lane Racer 3D car polish in handoff.

EOF
)"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Shared silhouette + team accents | Task 1 |
| Medium detail (~15–20 meshes) | Task 1 (floor, body, nose×2, sidepods×2, cockpit, halo×2, front wing×3, rear wing×3, mirrors×2, wheels×4 ≈ 21; trim mirrors or endplates if over budget during QA) |
| Inline in `LaneRacerScene.tsx` | Task 1 |
| No GLB/SVG/textures | Task 1 |
| Keep lighting | Task 1 (untouched) |
| Footprint ~1.8 × ~0.9–1.4 | Task 1 |
| Non-goals (env/tokens/2D) | Explicitly untouched |
| Handoff update | Task 2 |

If mesh count feels heavy on device during Step 4, drop the two mirrors first (still clearly F1).
