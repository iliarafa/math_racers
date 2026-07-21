# Next Session Handoff

**Branch:** `main`  
**App version:** `1.3.12` — Xcode `MARKETING_VERSION` 1.3.12 (`package.json`, `capacitor.config.ts`, `ios/.../project.pbxproj` aligned)  
**Current GP:** Round 11 / Hungary — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-21  
**Status:** Hungary weekend rotation shipped (`c70ad84`) + Hungary Live Circuit Map (PNG underlay + dense centerline) at **1.3.12**.

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:** after web changes, `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`, then rebuild/run in Xcode/simulator.

### First order of business

1. **Multiplayer track HUD parity** — MP race still shows Lap/Limits under the map (`LiveCircuitMap` footer); Game track view uses Lap|Level|Limits above keypad + `hideFooter`  
2. Otherwise pick from **Next optional** below  

QA Hungary path: **http://127.0.0.1:8081/dev/circuit-maps** — scroll to Hungary “PNG + centerline”.

---

## Shipped this stretch (now on `main`)

### Round 11 / Hungary weekend

- `currentGrandPrix.ts`: Round 11 / HUNGARY, 70 sim laps, flag + silhouette + detail map  
- `gameLogic.ts` / `LaneRacer.tsx` / `grandPrixHistory.ts`: new circuit + 2025 race/quali  

### Hungary Live Circuit Map (1.3.12)

- Wired `circuit_hungary.png` into `CIRCUIT_IMAGES`  
- Extract script bootstraps a seed from the PNG mask when none exists, then densify → ridge-snap  
- Dense path in `circuitPathData.json` (viewBox 600×600)  
- Free Practice Track HUD shows Hungaroring (not fallback oval)

### Live Circuit Map (earlier — PR #5 / #6)

| Theme | Behavior |
|-------|----------|
| Track vs Sectors | `raceMapView` on `GameState` (default `'track'`); toggle on **pre-race setup**, not Garage |
| Live Circuit Map | Branded black silhouette + sector paint + path-following cars |
| Phone HUD (track) | Lap\|Level\|Limits above keypad; TRACK LIMITS overlays timer |
| Phone HUD (sectors) | Grid above keypad; TRACK LIMITS between answer and grid |
| Live Circuit Map iPad size | Native iPad only (`isNativeIPad()`) |

### Key files

| File | Role |
|------|------|
| `client/src/components/LiveCircuitMap.tsx` | Map + `formatMapLapLabel` + `hideFooter` + iPad size |
| `client/src/lib/circuitPaths.ts` | Images + path smoothing |
| `client/src/lib/circuitPathData.json` | Traced / extracted paths |
| `script/extractCircuitCenterline.ts` | Medial extract + seed bootstrap + Spa apex rounding |
| `client/src/pages/DevCircuitMaps.tsx` | QA `/dev/circuit-maps` |
| `client/src/lib/currentGrandPrix.ts` | Weekly GP config |

### Circuit map coverage

| Circuit | Map art | Notes |
|---------|---------|--------|
| Spa, Monaco, Monza, Suzuka, Silverstone, **Hungary** | Yes | |
| Canada, Miami, Barcelona, Austria | Fallback oval | Do not retrace without ask |

Hungary regenerate:  
`npx tsx script/extractCircuitCenterline.ts hungary`

Spa regenerate (if needed):  
`git checkout HEAD -- client/src/lib/circuitPathData.json && npx tsx script/extractCircuitCenterline.ts spa`  
(then re-run hungary extract if the checkout wiped it)

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
| Live Circuit Map iPad size | Native iPad only (`isNativeIPad()`), not browser / not iPhone |

---

## Next optional (confirm with user)

1. Align Multiplayer race status chrome with Game (Lap\|Limits above keypad for track view + `hideFooter`)  
2. Remove or gate `/dev/circuit-maps` if unwanted in production builds  
3. Play-test kid ladder + Lane Racer 1:2:3:4 speeds  
4. Discuss Lane Racer setup on iPad  
5. Manual host/guest MP Locked + Ready play-test  

### Local untracked (not committed)

- `docs/mockup-map-toggle-real-sectors.png`  
- `docs/mockup-map-toggle-real-track.png`  
- `docs/setup-card-target.png`  

### Out of scope unless asked

- Soft-follow in browser / narrow-only iPad gate  
- Championship unlock redesign  
- Deploy/Harvest re-enable  
- Retracing Canada / Miami / Barcelona / Austria  

---

## Note for the next agent

You are on **`main`**. Current GP is **Hungary (Round 11)**. Feature name for players/App Store: **Live Circuit Map**. Map toggle lives on **pre-race setup** (`SetupChoiceRow`), not Garage. Prefer `http://127.0.0.1:8081`. QA: `/dev/circuit-maps`. For iOS: `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`. Do not invent new map UX or reopen locked difficulty decisions without asking. Do not retrace the four fallback GP circuits.
