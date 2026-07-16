# Next Session Handoff

**Branch:** `feature/live-circuit-map` (not merged to `main`)  
**Tip:** see latest commit on this branch after pull  
**App version:** `1.3.9` in `package.json` (local `ios/.../project.pbxproj` may show `1.3.10` marketing version — uncommitted / unrelated unless you intend a release bump)  
**Current GP:** Round 10 / Spa (Belgium) — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-16  
**Status:** Live Circuit Map HUD is implemented and play-tested on phone. Branch is ahead of `main` by the live-map commits; ready for polish / PR when user asks.

---

## Resume here (start here)

```bash
git checkout feature/live-circuit-map
git status
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:** after web changes, `npm run build && npx cap sync ios`, then rebuild/run in Xcode/simulator.

### First order of business (do this first)

Ask the user what they want next. Sensible defaults from this branch:

1. **PR / merge** `feature/live-circuit-map` → `main` (if HUD feels done)
2. **Trace map paths** for Canada / Miami / Barcelona / Austria (today they use the fallback oval in `LiveCircuitMap`)
3. **Multiplayer track HUD parity** — MP still uses under-map footer; Game race HUD uses Lap|Level|Limits above keypad
4. Otherwise pick from **Next optional** below (Lane Racer / weekend / etc.)

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
2. Trace real paths + black art for Canada / Miami / Barcelona / Austria  
3. Align Multiplayer status chrome with Game (Lap\|Limits above keypad)  
4. Remove or gate `/dev/circuit-maps` before App Store if you do not want it in production  

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

You are on **`feature/live-circuit-map`**, not `main`. Live map is the active feature; phone HUD crop was fixed by removing HUD `max-h`. Prefer `http://127.0.0.1:8081`. For iOS verification: `npm run build && npx cap sync ios`. Ask before merging or tracing the four fallback GP circuits.
