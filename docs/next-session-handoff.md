# Next Session Handoff

**Branch:** `feature/live-circuit-map` (not merged to `main`)  
**App version:** `1.3.9` in `package.json` (local `ios/.../project.pbxproj` may show `1.3.10` marketing version — uncommitted / unrelated unless you intend a release bump)  
**Current GP:** Round 10 / Spa (Belgium) — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-16 (late night)  
**Status:** Live map + Spa apex polish + sectors HUD layout + pre-race Map toggle (**done**). Ready for PR/merge when you want. iOS sync after last web changes if you need simulator.

---

## Resume here (start here)

```bash
git checkout feature/live-circuit-map
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:** after web changes, `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`, then rebuild/run in Xcode/simulator.

### First order of business

1. **PR / merge** `feature/live-circuit-map` → `main` (if everything below feels done)
2. **Multiplayer track HUD parity** — MP race still uses under-map footer; Game track view uses Lap|Level|Limits above keypad
3. Otherwise pick from **Next optional** below

QA Spa path: **http://127.0.0.1:8081/dev/circuit-maps** — zoom Spa “PNG + centerline”.

---

## Just finished this session

### 1. Sectors race HUD layout (committed earlier)

On `raceMapView === 'sectors'` only (track map untouched):

- Sector square grid sits **above keypad** (fills gap above AERO/OT)
- **TRACK LIMITS** badge is in-flow between answer and grid (no longer overlays timer)
- Same pattern in `Game.tsx` + `Multiplayer.tsx`
- `SectorProgressGrid` accepts optional `className`

### 2. Pre-race Map toggle (this commit)

Moved Track/Sectors off Garage onto setup cards:

- **Free Practice / Grand Prix** selecting cards (`Game.tsx`): no Math Type (redundant after operation select); rows are `Adaptive | Difficulty | Locked` and `Track | Map | Sectors` via `SetupChoiceRow`; weather unchanged; circuit map size unchanged
- **Multiplayer** track-select: Map row added (keeps Math Type / operation — no prior op screen)
- **Garage:** Track/Sectors tile **removed**
- Persists via existing `raceMapView` / `setRaceMapView` on `GameState`

Shared UI: [`client/src/components/SetupChoiceRow.tsx`](../client/src/components/SetupChoiceRow.tsx) — three-column text row (left option | center label | right option). Dark/light variants.

Approved visual reference (if present locally): `docs/setup-card-target.png`.

### Spa centerline (prior commits on branch)

Root cause for tip spikes: DT ridge lies when the silhouette kisses the PNG edge. Fix in `script/extractCircuitCenterline.ts` (`roundSharpApex` / `roundSharpSideApex` via geometric mids). Regenerate: `git checkout HEAD -- client/src/lib/circuitPathData.json && npx tsx script/extractCircuitCenterline.ts spa`.

Do NOT retry tracing Canada / Miami / Barcelona / Austria — wrong shapes, user reverted. Keep fallback oval.

Do not invent new map UX or reopen locked difficulty decisions without asking.

---

## What this branch shipped (Live Circuit Map)

| Theme | Behavior |
|-------|----------|
| Track vs Sectors | `raceMapView` on `GameState` (default `'track'`); toggle on **pre-race setup**, not Garage |
| Live circuit map | Branded black silhouette + sector paint + path-following cars |
| Lap wrapping | Map tours cap at `RACE_LENGTH` (20); FP 100 Q = multiple tours |
| Phone HUD (track) | Lap\|Level\|Limits above keypad; TRACK LIMITS overlays timer |
| Phone HUD (sectors) | Grid above keypad; TRACK LIMITS between answer and grid |
| Setup card | No Math Type on FP/GP; Adaptive\|Difficulty\|Locked + Track\|Map\|Sectors |
| Spa apex polish | Centered/smoothed top crest, bottom dip, right tip |

### Key files

| File | Role |
|------|------|
| `client/src/components/LiveCircuitMap.tsx` | Map + `formatMapLapLabel` + `hideFooter` |
| `client/src/components/SectorProgressGrid.tsx` | Classic sector squares (+ optional `className`) |
| `client/src/components/SetupChoiceRow.tsx` | Pre-race Adaptive/Locked + Track/Map/Sectors rows |
| `client/src/lib/circuitPaths.ts` | Images + path smoothing |
| `client/src/lib/circuitPathData.json` | Traced paths |
| `client/src/pages/Game.tsx` | Race HUD + FP/GP setup cards |
| `client/src/pages/Multiplayer.tsx` | MP race HUD + track-select Map row |
| `client/src/pages/Garage.tsx` | Settings grid (**no** map toggle) |
| `client/src/pages/DevCircuitMaps.tsx` | QA `/dev/circuit-maps` |
| `script/extractCircuitCenterline.ts` | Medial extract + Spa apex rounding |

### Circuit map coverage

| Circuit | Map art | Notes |
|---------|---------|--------|
| Spa, Monaco, Monza, Suzuka, Silverstone | Yes | |
| Canada, Miami, Barcelona, Austria | Fallback oval | Do not retrace without ask |

---

## Locked product decisions (still in force)

| Topic | Decision |
|-------|----------|
| Adaptive default | Factory default on FP / Lane Racer / MP |
| Locked | Fixed Karting/F3/F2/F1 for the race; no promotion/demotion |
| Grand Prix | Always adaptive Practice; Quali/Race lock after Practice — no Adaptive/Locked UI on GP setup card |
| Soft-follow 3D cam | Capacitor native only (`isNativePlatform()`), including iPad — never in browser |
| Selection chrome | Text color / opacity only — no gray selection pills |
| Kid difficulty ladder | Karting→F1 compressed; Adaptive soft-caps at F1; Pro Locked-only |

---

## Next optional (confirm with user)

**This branch**
1. Open PR / merge live circuit map  
2. Align Multiplayer race status chrome with Game (Lap\|Limits above keypad for track view)  
3. Remove or gate `/dev/circuit-maps` before App Store if unwanted in production  

**Broader backlog**
1. Play-test kid ladder + Lane Racer 1:2:3:4 speeds  
2. Discuss Lane Racer setup on iPad  
3. Manual host/guest MP Locked + Ready play-test  
4. Weekend rotation — `/weekend` skill → Hungary (Round 11) when calendar moves  

### Out of scope unless asked
- Soft-follow in browser / narrow-only iPad gate  
- Championship unlock redesign  
- Deploy/Harvest re-enable  
- Retracing Canada / Miami / Barcelona / Austria  

---

## Note for the next agent

You are on **`feature/live-circuit-map`**, not `main`. Map toggle lives on **pre-race setup** (`SetupChoiceRow`), not Garage. Sectors HUD: grid above keypad, TRACK LIMITS under answer. Prefer `http://127.0.0.1:8081`. QA: `/dev/circuit-maps`. For iOS: `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`. Ask before merging. Do not retrace the four fallback GP circuits.
