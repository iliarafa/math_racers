# Lane Racer 3D Soft Atmosphere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add soft chase-cam depth to Lane Racer 3D via a gradient sky, speckled grass texture, and subtle linear fog — without props, gameplay changes, or washing out answer tokens.

**Architecture:** Keep all work inline in `LaneRacerScene.tsx` using the same canvas-texture helpers already used for asphalt/kerbs. Add scene fog once; keep `fog={false}` on car, tokens, particles, sky, and road markings. Optionally align WebGL clear color in `LaneRacerCanvas3D.tsx`.

**Tech Stack:** React Three Fiber, Three.js (`CanvasTexture`, `Fog`, `meshBasicMaterial`), existing scene constants.

## Global Constraints

- Soft atmosphere only — no billboards, grandstands, trees, barriers, or curved track
- Subtle haze — answer tokens must stay crisp at spawn
- No gameplay, collision, camera, scroll, rival-bar, or 2D engine changes
- No new dependencies, no photo textures, no GLB
- Branch: `feature/lane-racer-3d`
- Spec: `docs/superpowers/specs/2026-07-08-lane-racer-3d-atmosphere-design.md`

---

## File map

| File | Role |
|------|------|
| `client/src/components/lane-racer/LaneRacerScene.tsx` | Sky gradient, grass texture, scene fog, selective `fog` flags |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | Clear color match to horizon/fog tint |
| `docs/lane-racer-3d-handoff.md` | Mark atmosphere done; props still later |
| `docs/superpowers/specs/2026-07-08-lane-racer-3d-atmosphere-design.md` | Spec (already committed) |

No new files.

---

### Task 1: Sky, grass, fog, and clear color

**Files:**
- Modify: `client/src/components/lane-racer/LaneRacerScene.tsx`
- Modify: `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` (`gl.setClearColor`)
- Test: visual at `http://localhost:8081/lane-racer` (3D on) + `npm run check`

**Interfaces:**
- Consumes: existing `SKY_RADIUS`, `GROUND_SIZE`, `GRASS_GREEN`, canvas-texture pattern from `makeKerbTexture` / asphalt
- Produces: `makeSkyGradientTexture()`, `makeGrassTexture()`, updated `Sky` / `Ground`, scene `<fog>`, constants `FOG_COLOR` / `HORIZON_SKY`

- [ ] **Step 1: Add atmosphere color constants**

Near the top of `LaneRacerScene.tsx` (after `GRASS_GREEN`), replace/extend sky constants:

```tsx
const SKY_RADIUS = 500;
const GRASS_GREEN = '#2a5230';
/** Zenith / upper sky (deeper). */
const SKY_ZENITH = '#5BA3D0';
/** Near-horizon sky — desaturated blue-green so the join with grass softens. */
const SKY_HORIZON = '#9bb8c4';
/** Linear fog tint — mid mix of grass + horizon sky. */
const FOG_COLOR = '#4a6a5c';
const FOG_NEAR = 32;
const FOG_FAR = 220;
```

Remove unused `SKY_BLUE` if nothing else references it.

- [ ] **Step 2: Add `makeSkyGradientTexture` and `makeGrassTexture`**

Place after `makeLaneDashTexture` (before `Sky`):

```tsx
/** Vertical gradient for the inside of the sky sphere (v: bottom→top). */
function makeSkyGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  // Canvas y=0 is top of texture → maps toward sphere north (zenith) with default UVs.
  g.addColorStop(0, SKY_ZENITH);
  g.addColorStop(0.55, SKY_HORIZON);
  g.addColorStop(1, '#6a8a78'); // soft ground-side fill if UVs show below horizon
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makeGrassTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = GRASS_GREEN;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const lift = Math.floor(Math.random() * 28) - 10;
    const r = Math.max(0, Math.min(255, 0x2a + lift));
    const g = Math.max(0, Math.min(255, 0x52 + lift));
    const b = Math.max(0, Math.min(255, 0x30 + lift));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1 + (Math.random() > 0.7 ? 1 : 0), 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
```

If the sky looks upside-down in the browser, swap the color stops (zenith ↔ ground) — do not change geometry.

- [ ] **Step 3: Rewrite `Sky` and `Ground`**

```tsx
function Sky() {
  const skyTex = useMemo(() => makeSkyGradientTexture(), []);
  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 24, 12]} />
      <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

function Ground() {
  const grassTex = useMemo(() => makeGrassTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} renderOrder={0}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      {/* Fog ON — distant grass softens into haze */}
      <meshBasicMaterial map={grassTex} toneMapped={false} />
    </mesh>
  );
}
```

- [ ] **Step 4: Attach scene fog and align background**

In `LaneRacerScene`, replace the opening of the returned fragment:

```tsx
export function LaneRacerScene({ controller, teamId }: LaneRacerSceneProps) {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[4, 16, 8]} intensity={1.15} castShadow={false} />
      <directionalLight position={[-6, 8, 4]} intensity={0.35} castShadow={false} />

      <Sky />
      <Ground />
      <Road controller={controller} />

      <AnimatedTokens controller={controller} />
      <AnimatedPlayerCar controller={controller} teamId={teamId} />
      <Particles controller={controller} />
    </>
  );
}
```

Confirm road asphalt / dashes / kerbs already use `fog={false}` (they do today — leave them). Confirm every `PlayerCar` material keeps `fog={false}`.

- [ ] **Step 5: Force tokens + particles off fog**

In `AnswerTokenFace`, set `fog={false}` on the material:

```tsx
<meshBasicMaterial
  map={texture}
  transparent
  toneMapped={false}
  depthWrite={false}
  fog={false}
/>
```

In `Particles`, ensure particle materials include `fog={false}` (already present — verify, do not remove).

- [ ] **Step 6: Match WebGL clear color**

In `LaneRacerCanvas3D.tsx`, change:

```tsx
gl.setClearColor('#2a5230');
```

to:

```tsx
gl.setClearColor('#4a6a5c');
```

(same hex as `FOG_COLOR` — keep literals in sync if you do not export a shared constant).

- [ ] **Step 7: Typecheck**

Run: `npm run check`  
Expected: exit 0, no errors in the two lane-racer files.

- [ ] **Step 8: Visual verify**

1. `npm run dev` (port 8081 if that is the project default)
2. Open `http://localhost:8081/lane-racer`
3. Enable **3D**, start a race
4. Check:
   - Sky is a soft vertical gradient, not flat `#87CEEB`
   - Grass has subtle speckles and softens toward the horizon
   - Answer numbers stay crisp at spawn
   - Road dashes / kerbs do not wash out
   - Car still reads clearly
5. If fog is too strong: raise `FOG_FAR` toward `280` or raise `FOG_NEAR` toward `40`
6. If fog is invisible: lower `FOG_FAR` toward `180`

- [ ] **Step 9: Commit**

```bash
git add client/src/components/lane-racer/LaneRacerScene.tsx client/src/components/lane-racer/LaneRacerCanvas3D.tsx
git commit -m "$(cat <<'EOF'
Add soft atmosphere to Lane Racer 3D chase view.

Gradient sky, speckled grass, and subtle fog give depth without props or washing out answer tokens.
EOF
)"
```

---

### Task 2: Update handoff note

**Files:**
- Modify: `docs/lane-racer-3d-handoff.md`
- Test: read-back of Visual polish section

**Interfaces:**
- Consumes: Task 1 shipped atmosphere
- Produces: accurate handoff for next agent (props still open)

- [ ] **Step 1: Update known-issues / visual polish**

In `docs/lane-racer-3d-handoff.md`:

1. Under **High priority**, strike or note that code-split is already done (lazy-load exists in `LaneRacer.tsx`) if that line is still stale.
2. Under **Visual polish**, change environment item from open work to:

```markdown
5. ~~Environment atmosphere~~ — done: gradient sky, speckled grass, subtle fog (2026-07-08). Roadside props (grandstands / billboards) and curved track still optional later.
```

3. Fix the build blurb that still says “not code-split yet” if present — Three.js is lazy-loaded on the 3D path.

- [ ] **Step 2: Commit**

```bash
git add docs/lane-racer-3d-handoff.md
git commit -m "$(cat <<'EOF'
Note Lane Racer 3D atmosphere polish in handoff.
EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Gradient sky | Task 1 Steps 2–3 |
| Speckled grass + fog on grass | Task 1 Steps 2–3 |
| Subtle linear fog | Task 1 Step 4 |
| `fog={false}` on car / tokens / sky / road markings | Task 1 Steps 4–5 |
| Clear-color match | Task 1 Step 6 |
| No props / no gameplay / no 2D | Global constraints |
| Handoff update | Task 2 |

No placeholders. Fog near/far are concrete starting values with tune instructions in Step 8.
