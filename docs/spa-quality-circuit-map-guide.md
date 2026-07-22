# Spa-Quality Circuit Map Guide

**Purpose:** Spa is the reference implementation for Live Circuit Map + Lane Racer track art. Use this doc as the agent map to finish **Hungary** (and future circuits) at the same quality bar.

**Verified against code on 2026-07-22:** `script/extractCircuitCenterline.ts`, `client/src/lib/circuitPaths.ts`, `client/src/lib/circuitPathData.json`, `client/src/components/LiveCircuitMap.tsx`, `client/src/pages/LaneRacer.tsx`.

**Related:** [`docs/next-session-handoff.md`](next-session-handoff.md) (session resume). This file supersedes [`docs/spa-live-circuit-map-playbook.md`](spa-live-circuit-map-playbook.md).

---

## Quality bar (“done”)

### Live Circuit Map (Free Practice / GP Track view)

1. **Track ribbon** = black silhouette PNG (pixel-perfect underlay).
2. **Cars + sector glow** ride a **dense medial centerline** that stays visually centered in that ribbon — especially at sharp tips that touch the image edge.
3. No V-spikes, no chord-across-hairpin, no sag below the ribbon.
4. Sector paint width comes from per-circuit `ribbon` when present (`LiveCircuitMap` uses `meta.ribbon`).
5. QA at **http://127.0.0.1:8081/dev/circuit-maps** (PNG + centerline overlay).

### Lane Racer carousel

1. Thin black line-art asset (Spa pattern: `circuit_*_black.png`), **not** the thick Live Map ribbon.
2. Displayed at the **existing** stage clamps — do not enlarge the shared stage to fix one circuit.
3. On-screen stroke thickness matches Spa at those clamps.

### Spa reference numbers (today)

| Item | Value |
|------|--------|
| Live Map / extract asset | `client/src/assets/circuit_spa_black.png` (**358×225**) |
| Path JSON | `spa`: viewBox **358×225**, ~**1074** polyline samples in `d` |
| `ribbon` in JSON | **absent** for Spa → `LiveCircuitMap` falls back to stroke **8** (race) / **10** (results) |
| Lane Racer asset | same `circuit_spa_black.png` via `CIRCUIT_MAP_IMAGES.spa` |
| Lane Racer stage | track drum `itemHeight={140}`; img `h-24` + `maxWidth: 140` + `filter: invert(1)` |

---

## Architecture (Option A) — do not reopen

```text
LiveCircuitMap
  ├── <image> circuit_*_black.png / circuit_hungary.png   ← visual track (art)
  └── SVG path d = dense centerline                     ← cars + sector dashes
        (Catmull-Rom → cubic at runtime via smoothCircuitPath)
```

| Layer | Source | Role |
|-------|--------|------|
| Silhouette | PNG in `client/src/assets/` | Black track art; also the **mask** for extraction |
| Path data | `client/src/lib/circuitPathData.json` | Closed polyline `d`, `w`, `h`, optional `ribbon` |
| Resolve | `getCircuitMapMeta()` in `circuitPaths.ts` | Loads PNG URL + Catmull-Rom on `d` |
| Render | `LiveCircuitMap.tsx` | PNG as `<image>`, path for measure / sectors / cars |

**Do not** draw the black track from the path stroke when a PNG exists — the image is the ground truth for shape.

---

## Transferable rules (from Spa pain)

1. **Never draw black track from SVG when PNG exists.** Path is for motion + sector dashes only.
2. **Normal-only ridge snap** (`snapToRidgeAlongNormal`) — no free disc search. Disc jumps to parallel arms (Bus Stop / chicanes).
3. **Edge-kissing tips → geometric band midpoints** (`bandGeomMid`), not DT max (`medialInBand`). When the silhouette kisses the PNG border, distance transform peaks on the **outer** pixel → off-center path / V-spikes.
4. **Always regenerate from the committed seed.** Never densify/polish on top of an already-polished `d` (corrections compound). Workflow:

   ```bash
   git checkout HEAD -- client/src/lib/circuitPathData.json
   npx tsx script/extractCircuitCenterline.ts <id>
   ```

   If checkout wiped another circuit’s newer extract, re-run that id after.
5. **Spa-only apex helpers only when needed.** Copy the *method* (geom mids / short circular arc), not Spa’s `x0,x1` / `y0,y1` windows. Retune windows per circuit.
6. **Two products = two assets.** Live Map needs a thick ribbon for sector paint; Lane Racer needs thin `_black` line art. Sharing one PNG is wrong when weights differ.
7. **Never enlarge the shared Lane Racer stage** (`itemHeight`, `h-24`, `maxWidth: 140`) to “fix” one circuit — that resizes Spa/Monza/etc. Fix with asset framing (crop/pad) or a **circuit-only** CSS scale.

---

## Spa pipeline (reference procedure)

Run from repo root. Extractor: `script/extractCircuitCenterline.ts`.

```bash
git checkout HEAD -- client/src/lib/circuitPathData.json
npx tsx script/extractCircuitCenterline.ts spa
```

### Step-by-step (what the script does)

1. **Load mask** from `ASSET_BY_ID[id]` (Spa → `circuit_spa_black.png`).  
   Track pixel if `alpha > 10` and luminance `L < 120`.
2. **Chamfer distance transform (DT)** of the track mask. Used for ridge snap along the path **normal**. Unreliable at image edges (see rules above).
3. **Seed polyline** = existing `d` from JSON, scaled to PNG pixel space if `w/h` differ. If no entry: `bootstrapSeedFromMask`.
4. **Spa only:** `fixSpaBusStopAndLaSource` — rewrite Bus Stop → La Source approach along lower-band medial so the path does not chord the hairpin.
5. **Densify** seed at spacing **1.8** px.
6. **`snapToRidgeAlongNormal`** — each sample slides only along the local normal. `maxOffset` / `jumpLimit` derived from ridge median (`maxOffset = max(6, ceil(ridgeMed * 1.5) + 4)`).
7. **Light `cleanup`** (dedupe / micro-stutter only — not RDP; RDP kills chicanes).
8. **Spa only:** tip-spike filter (drops samples that dart to `x ≤ 2` after the hairpin climb).
9. **Spa only — apex polish** (geometric mids, not DT tip):

   | Pass | Function | Window | Method |
   |------|----------|--------|--------|
   | Top crest (Raidillon) | `roundSharpApex(..., 'top', 220, 290)` | x ∈ [220, 290] | Upper-band geom mids + heavy smooth + soft tip pin |
   | Bottom dip | `roundSharpApex(..., 'bottom', 280, 330)` | x ∈ [280, 330] | Lower-band geom mids + short circular arc + light smooth |
   | Right tip | `roundSharpSideApex(..., 'right', 40, 85)` | y ∈ [40, 85] | Per-row geom mids + smooth |

10. **Map back** to JSON viewBox; write `points`, `ribbon` (`max(8, round(ridgeMed * 2))`), quantized `d`.
11. **Runtime:** `getResolvedPathD` always applies Catmull-Rom cubics so L-segment staircasing disappears in the overlay.

### Visual QA checklist (Spa or any circuit)

1. `npm run dev -- --port 8081` → **http://127.0.0.1:8081/dev/circuit-maps**
2. Inspect PNG + centerline overlay (`shapeRendering: geometricPrecision` helps at tips).
3. Check: crest / sharp tips centered and round; hairpins follow ribbon (no shortcut chord); no outward V at image-edge tips.
4. In-race: Free Practice / GP with **Map → Track**; cars and sector dashes follow the ribbon.

---

## Failed approaches (do not reopen)

| Approach | Why it failed |
|----------|----------------|
| Hand SVG / sparse polyline as the black track | Never matches art (~8/10 max) |
| CSS luminance mask of PNG for the track fill | Broke on iOS WKWebView |
| Catmull-Rom alone on sparse waypoints | Invents corners; does not follow the bitmap |
| Skeleton / both-side contour walk | Double outline, zig-zags — auto-trace of other circuits was **reverted** |
| Free disc max-DT snap | Jumps Bus Stop / parallel arms |
| Hermite blends at edge-kissing tips | Chord, lens outside ribbon, V-spikes |
| DT tip selection at image border | False ridge on outer pixel |
| Drawing black track from the same SVG as cars (Option B) | Makes path errors *more* visible; abandoned for Option A |
| Auto-trace Canada / Miami / Barcelona / Austria | Wrong shapes; keep fallback oval unless explicitly asked |
| Enlarge shared Lane Racer stage to fix Hungary | Resized Spa and other circuits — full revert |

---

## Hungary reproduction map (the point)

### Current state (verified)

| Surface | Asset / data today | Status |
|---------|-------------------|--------|
| Live Map / FP / GP setup | `circuit_hungary.png` **667×698** | Thick ribbon; path in JSON |
| Path JSON `hungary` | viewBox **667×698**, ~**1564** samples, **`ribbon: 26`** | Written by extract |
| Extract asset | `ASSET_BY_ID.hungary` → `circuit_hungary.png` | Same thick PNG |
| Lane Racer | `CIRCUIT_MAP_IMAGES.hungary` → **same** `circuit_hungary.png` | **Gap vs Spa** — Spa uses thin `_black` |
| Lane Racer stage | `itemHeight={140}`, `h-24`, `maxWidth: 140` | **Do not change** |

Hungary Live Map was rebuilt toward Spa weight (see commits `6afe18c` … `51db1cf`). Treat Live Map as **mostly Spa-modeled**; treat Lane Racer as **not done**.

### Live Map checklist

- [ ] Open `/dev/circuit-maps` — Hungary PNG + centerline centered in ribbon (no edge sag / V-spikes).
- [ ] If a tip kisses the image border and DT lies: add **Hungary-tuned** geom-mid polish (copy Spa *method*, new windows). Do not paste Spa `220–290` / `280–330` / `40–85`.
- [ ] Confirm `LiveCircuitMap` uses `meta.ribbon` (Hungary `26` → race stroke `max(8, 24)`). `viewPad` is derived from stroke + car pad so edge-tight art does not clip.
- [ ] Visual weight target is **Spa**, not Austria. Do not reopen dilate/pad/crop loops casually; if weight is wrong, fix the **PNG**, then re-extract from committed seed.
- [ ] Regenerate only when art or seed policy changes:

  ```bash
  git checkout HEAD -- client/src/lib/circuitPathData.json
  npx tsx script/extractCircuitCenterline.ts hungary
  # re-run spa (and any other ids) if checkout wiped them
  ```

### Lane Racer checklist (first job)

Spa pattern: dedicated thin `circuit_spa_black.png`. Hungary still points at the thick Live Map PNG.

- [ ] Add **`client/src/assets/circuit_hungary_black.png`** (thin line art for Lane Racer **only**).
- [ ] Wire `LaneRacer.tsx` `CIRCUIT_MAP_IMAGES.hungary` → that thin asset. Leave `circuitPaths.ts` / extract on thick `circuit_hungary.png`.
- [ ] Keep shared clamps: `itemHeight={140}`, `className="h-24 object-contain"`, `maxWidth: 140`, `filter: invert(1)`.
- [ ] Match **on-screen** stroke px to Spa at those clamps (eyeball side-by-side in carousel). If a prior dilate was “a bit too thick,” dial stroke down in the **asset**, not via global stage size.
- [ ] If Hungary looks small (square art vs Spa landscape): fix with **asset framing** (crop/pad) or a **Hungary-only** CSS scale on that img — never a global stage enlarge.
- [ ] QA on device/sim after: `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios` (then `cap run` to booted sim).

### Source art notes (outside repo)

Thin Hungaroring references used in prior sessions (Cursor assets folder; same ~17KB bytes):

- `RaceCircuitHungaroring-2084592d-f5dc-475a-922b-3feeaf24559c.png` — Lane Racer attempts  
- `RaceCircuitHungaroring-a11ed8fa-0a1e-47fc-9f18-69fd8f1958b6.png` — Live Map rebuild (`51db1cf`)

Live Map thick silhouette was rebuilt from rounded-tip reference + Spa-weight dilation + margin.

### Commands cheat sheet

```bash
# Dev (prefer 127.0.0.1 — server listens IPv4)
npm run dev -- --port 8081
# QA: http://127.0.0.1:8081/dev/circuit-maps

# Safe regenerate (one circuit)
git checkout HEAD -- client/src/lib/circuitPathData.json
npx tsx script/extractCircuitCenterline.ts hungary
npx tsx script/extractCircuitCenterline.ts spa   # if checkout wiped Spa

# iOS after shipping path / HUD / asset wiring
npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
```

---

## Runtime wiring (do not break)

- `CIRCUIT_IMAGES` in `circuitPaths.ts`: `spa` → `circuit_spa_black.png`, `hungary` → `circuit_hungary.png`.
- JSON `w` / `h` are the path coordinate system. Extract snaps in PNG space, then scales back; keeps JSON `w/h` even if PNG pixels differ (today Spa/Hungary PNG sizes match JSON).
- `LiveCircuitMap` uses `<image href={meta.image} width={meta.w} height={meta.h} preserveAspectRatio="none" />` plus transparent measure path `d={meta.d}`.
- Sector paint shares **one** `d` with `pathLength` + dash offsets.
- Fallback oval circuits (Canada, Miami, Barcelona, Austria): **do not retrace** without an explicit ask.

---

## Appendix A — Spa chronology (why these rules)

Short evidence trail. Prefer the rules above over re-litigating history.

| When | What | Commit / thread |
|------|------|-----------------|
| Round 10 | GP weekend → Spa | `ccf8ec2` |
| 2026-07-16 | Live Circuit Map HUD (Track vs Sectors) | `3a58e80`; [Live Map MVP](dd367989-3bf4-4c23-886f-8f97f154f9b4) |
| | Cars smooth along path | `a2e25b9` |
| | **Option A:** PNG underlay + dense medial centerline + extractor | `895b42f`; [Option A Centerline](86e0b22a-2c75-4e3d-ae8e-f33ae9b4b83f) |
| | Crest / bottom apex mid-failures (Hermite, edge DT) | [Raidillon Crest Fix](e553ed3f-20f4-4681-ba43-118a3bed305b) |
| | Apex polish via geom band mids (kept after La Source reopen reverted) | `fdafa88`; [Apex Polish](bf115c16-5146-4d4c-b897-aad37676f9b3) |
| Round 11 | Hungary weekend; port Spa pipeline; Lane Racer stage enlarge reverted | `c70ad84` … `51db1cf`; [Hungary vs Spa](5d4813b6-1d53-4143-8491-27cb2cb7cef8) |

**Locked product decision that came out of Option A:** ground truth is the PNG; dense centerline is extracted from that PNG; do not chase “99%” by hand-editing thousands of JSON points.

---

## Appendix B — Key files

| Path | Role |
|------|------|
| `client/src/assets/circuit_spa_black.png` | Spa Live Map + Lane Racer + extract mask |
| `client/src/assets/circuit_hungary.png` | Hungary Live Map + extract mask (thick) |
| `client/src/assets/circuit_hungary_black.png` | **To add** — Lane Racer thin line art only |
| `client/src/lib/circuitPathData.json` | Stored centerlines + optional `ribbon` |
| `client/src/lib/circuitPaths.ts` | `CIRCUIT_IMAGES` + Catmull-Rom resolve |
| `client/src/lib/smoothCircuitPath.ts` | Closed Catmull-Rom → cubic SVG |
| `script/extractCircuitCenterline.ts` | Offline extract; Spa-only apex polish |
| `client/src/components/LiveCircuitMap.tsx` | Race HUD map |
| `client/src/pages/LaneRacer.tsx` | Carousel maps + stage clamps |
| `client/src/pages/DevCircuitMaps.tsx` | QA page `/dev/circuit-maps` |

---

## Out of scope / do not reopen casually

- Hand-drawing or manually editing thousands of path points in JSON  
- Replacing the PNG underlay with a stroked path for Spa/Hungary Live Map  
- “Improving” Canada / Miami / Barcelona / Austria traces without user request  
- Changing live-map HUD layout while regenerating paths  
- Soft-follow in browser / global Lane Racer stage resize  
- Pushing the local-ahead commits unless asked  
