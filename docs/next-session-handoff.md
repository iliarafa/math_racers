# Next Session Handoff

**Branch:** `feature/live-circuit-map` (not merged to `main`)  
**App version:** `1.3.9` in `package.json` (local `ios/.../project.pbxproj` may show `1.3.10` marketing version — uncommitted / unrelated unless you intend a release bump)  
**Current GP:** Round 10 / Spa (Belgium) — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-16 (late evening)  
**Status:** Spa centerline apex polish **done** (top crest, bottom dip, right tip). Ready for PR/merge when you want.

---

## Resume here (start here)

```bash
git checkout feature/live-circuit-map
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:** after web changes, `npm run build && npx cap sync ios`, then rebuild/run in Xcode/simulator.

### First order of business

1. **PR / merge** `feature/live-circuit-map` → `main` (if HUD + Spa path feel done)
2. **Multiplayer track HUD parity** — MP still uses under-map footer; Game race HUD uses Lap|Level|Limits above keypad
3. Otherwise pick from **Next optional** below

QA Spa path: **http://127.0.0.1:8081/dev/circuit-maps** — zoom Spa “PNG + centerline”.

### Spa centerline polish (just finished)

Root cause for tip spikes: DT ridge lies when the silhouette kisses the PNG edge. Fix in `script/extractCircuitCenterline.ts`:

- `roundSharpApex` — top/bottom via **geometric band midpoints** + smooth / short circular tip
- `roundSharpSideApex` — right tip via **per-row** geom mids + smooth
- Always regenerate from committed seed: `git checkout HEAD -- client/src/lib/circuitPathData.json && npx tsx script/extractCircuitCenterline.ts spa`

Also kept: Catmull-Rom on dense paths (`circuitPaths.ts`), `geometricPrecision` on QA overlay.

`ios/.../project.pbxproj` `1.3.10` bump remains **unstaged** on purpose.

Do NOT retry tracing Canada / Miami / Barcelona / Austria — attempted earlier, wrong shapes, user reverted. Keep fallback oval.

Do not invent new map UX or reopen locked difficulty decisions without asking.

---

## What this branch shipped (Live Circuit Map)

| Commit theme | Behavior |
|--------------|----------|
| Track vs Sectors HUD | Garage toggle `raceMapView`: `'track' \| 'sectors'` (default `'track'`) on `GameState` |
| Live circuit map | Branded black silhouette (luminance mask) + sector paint + path-following cars |
| Lap wrapping | Map tours cap at `RACE_LENGTH` (20); FP 100 Q = multiple tours |
| Phone HUD polish | No map legend; no FREE PRACTICE pill; TRACK LIMITS overlays (no reserved `h-12`); Lap\|Level\|Limits row above keypad aligned to AERO / energy / OT columns |
| Crop fix | HUD stage has **no `max-h`** (phone `max-h-40` was cropping Spa/Suzuka); SVG `viewPad = 14`; `overflow-visible` |
| Spa apex polish | Centered/smoothed top crest, bottom dip, and right tip on the centerline |

### Key files

| File | Role |
|------|------|
| `client/src/components/LiveCircuitMap.tsx` | Map + `formatMapLapLabel` + `hideFooter` + motion |
| `client/src/components/SectorProgressGrid.tsx` | Classic sector squares |
| `client/src/lib/circuitPaths.ts` | Images + `getCircuitMapMeta` |
| `client/src/lib/circuitPathData.json` | Traced paths: spa, monaco, monza, suzuka, silverstone |
| `client/src/pages/Game.tsx` | Race HUD wiring; status row; Free Practice |
| `client/src/pages/Multiplayer.tsx` | Track map in MP race / finish |
| `client/src/pages/Garage.tsx` | Track ↔ Sectors toggle |
| `client/src/pages/DevCircuitMaps.tsx` | QA page at `/dev/circuit-maps` (phone-width all circuits) |
| `client/src/App.tsx` | Route `/dev/circuit-maps` |
| `script/extractCircuitCenterline.ts` | Medial extract + Spa apex rounding |

### Circuit map coverage (verified 2026-07-16)

| Circuit | Map art | Notes |
|---------|---------|--------|
| Spa, Monaco, Monza, Suzuka, Silverstone | Yes | Aspect + path overflow OK at 390px after crop fix |
| Canada, Miami, Barcelona, Austria | Fallback oval | No entries in `circuitPathData.json` / `CIRCUIT_IMAGES` |

QA: **http://127.0.0.1:8081/dev/circuit-maps**

---

## Locked product decisions (still in force)

Carry forward from prior handoff — do not reopen without asking:

| Topic | Decision |
|-------|----------|
| Adaptive default | Factory default on FP / Lane Racer / MP |
| Locked | Fixed Karting/F3/F2/F1 for the race; no promotion/demotion |
| Grand Prix | Always adaptive Practice; Quali/Race lock after Practice — no Adaptive/Locked UI |
| Soft-follow 3D cam | Capacitor native only (`isNativePlatform()`), including iPad — never in browser |
| Selection chrome | Text color / opacity only — no gray selection pills |
| Kid difficulty ladder | Karting→F1 compressed; Adaptive soft-caps at F1; Pro Locked-only |

---

## Next optional (confirm with user)

**This branch**
1. Open PR / merge live circuit map  
2. Align Multiplayer status chrome with Game (Lap\|Limits above keypad)  
3. Remove or gate `/dev/circuit-maps` before App Store if you do not want it in production  

(~~Trace Canada / Miami / Barcelona / Austria~~ — attempted 2026-07-16, traced shapes were wrong, user reverted and descoped. They keep the fallback oval. Don't retry without being asked.)

**Broader backlog**
1. Play-test kid ladder + Lane Racer 1:2:3:4 speeds  
2. Discuss Lane Racer setup on iPad  
3. Manual host/guest MP Locked + Ready play-test  
4. Weekend rotation — `/weekend` skill → Hungary (Round 11) when calendar moves  

### Out of scope unless asked
- Soft-follow in browser / narrow-only iPad gate (reverted before)  
- Championship unlock redesign  
- Deploy/Harvest re-enable  

---

## Note for the next agent

You are on **`feature/live-circuit-map`**, not `main`. Spa apex polish is done; next is PR/merge or MP HUD parity. Prefer `http://127.0.0.1:8081`. QA: `/dev/circuit-maps`. For iOS: `npm run build && npx cap sync ios`. Ask before merging. Do not retrace the four fallback GP circuits.
