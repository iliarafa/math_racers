# Next Session Handoff

**Branch:** `main` (ahead of `origin/main` by 9 commits — not pushed)  
**App version:** `1.3.12` — aligned in `package.json`, `capacitor.config.ts`, Xcode `MARKETING_VERSION`  
**Current GP:** Round 11 / Hungary — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-21 (end of session)  
**Status:** Hungary weekend + Live Circuit Map are on `main`. **Hungaroring track assets are a mess** — Lane Racer thickness/size work was started then reverted after it resized Spa. Pick that up carefully tomorrow.

---

## Resume here (start here)

**Agent map for Spa-quality Hungary work:** [`docs/spa-quality-circuit-map-guide.md`](spa-quality-circuit-map-guide.md)

```bash
git checkout main
git pull   # only if you want remote; local is 9 commits ahead
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:** `npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`  
Then run on sim (this session used):  
`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604`  
(iPhone 17 / iOS 26.5 — confirm with `xcrun simctl list devices booted`)

---

## ⚠ Hungaroring track assets are a mess (read first)

Do **not** treat Hungary map art as finished. Two different products need two different line weights, and one shared PNG is wrong for both.

| Surface | Asset today | Problem |
|---------|-------------|---------|
| Free Practice / Live Circuit Map / GP setup | `client/src/assets/circuit_hungary.png` (thick ribbon, 667×698) | Iterated many times (Austria weight → Spa weight → crop fights → new reference). Centerline + `ribbon: 26` in `circuitPathData.json` are for this thick art. |
| Lane Racer carousel | **Same** `circuit_hungary.png` via `LaneRacer.tsx` `CIRCUIT_MAP_IMAGES` | Looks much thicker than Spa’s thin `circuit_spa_black.png`. Spa uses dedicated `*_black` line art; Hungary does not. |

### What we tried tonight (and walked back)

1. Pointed Lane Racer at a thin `RaceCircuitHungaroring` line art → Hungary too thin vs Spa.  
2. Dilated a new `circuit_hungary_black.png` to match Spa `strokeRelH` → then “a bit too thick.”  
3. Enlarged the **shared** Lane Racer track stage (`itemHeight` 200, `200×144` stage) for all circuits → **destroyed Spa’s size**. User ordered full revert.  
4. Reverted `LaneRacer.tsx` to original (`itemHeight={140}`, `h-24` + `maxWidth: 140`). Deleted untracked `circuit_hungary_black.png`. Redeployed to iOS sim.

**Working tree is clean** for code (only untracked docs images / quality guide left).

### Source art (outside repo, Cursor assets folder)

Thin Hungaroring references (same bytes ~17KB each):

- `…/assets/RaceCircuitHungaroring-2084592d-f5dc-475a-922b-3feeaf24559c.png` (used for Lane Racer attempts)  
- `…/assets/RaceCircuitHungaroring-a11ed8fa-0a1e-47fc-9f18-69fd8f1958b6.png` (used for Live Map rebuild in `51db1cf`)  

Live Map thick silhouette was rebuilt from the rounded-tip reference + Spa `strokeRelH` dilation + margin — commit `51db1cf`.

### Hard constraint for tomorrow

- **Never change the shared Lane Racer stage size** to “fix” Hungary — that resizes Spa/Monza/etc.  
- Give Hungary its **own** thin `circuit_hungary_black.png` (or equivalent) for Lane Racer only.  
- Keep thick `circuit_hungary.png` for Live Circuit Map / FP.  
- Match **on-screen stroke px** to Spa at the **existing** `h-24` / `maxWidth: 140` stage — do not enlarge the stage.  
- If Hungary still looks small (square vs Spa landscape), fix with **asset framing** (crop/pad) or a Hungary-only CSS scale — not a global stage change.

---

## First order of business tomorrow

Follow [`docs/spa-quality-circuit-map-guide.md`](spa-quality-circuit-map-guide.md) (§ Hungary reproduction map).

1. **Lane Racer Hungary line weight** — add dedicated thin black asset; keep Spa stage untouched; match Spa thickness at current clamps.  
2. Optional: sanity-check FP Live Map Hungary still OK at `/dev/circuit-maps`.  
3. Otherwise pick from **Next optional** below.

---

## Shipped this stretch (on `main`, local)

Recent Hungary map commits (newest first):

- `51db1cf` Rebuild Hungary silhouette from uncropped Hungaroring reference  
- `5498053` Center Hungary progress on the ribbon and stop edge crop  
- `6cff84b` Make Hungary live map crop-proof with Spa-weight Asset_2 art  
- `2fb7dd6` Match Hungary live-map stroke width to Spa  
- (+ rotate/pad/thicken commits before that)  
- `6afe18c` Add Hungary live circuit map with dense centerline  
- `c70ad84` Update Free Practice and Grand Prix to Round 11 / Hungary  

### Live Circuit Map plumbing (still in code)

- `circuitPaths.ts`: `ribbon?: number` on meta  
- `LiveCircuitMap.tsx`: `sectorStroke` from `meta.ribbon`; dynamic `viewPad` / viewBox aspect so strokes/cars don’t clip  
- `extractCircuitCenterline.ts`: `maxOffset` / `jumpLimit` from ridge median; writes `ribbon` into JSON  
- Hungary path entry (verified): **viewBox 667×698**, **1564 points**, **`ribbon: 26`**

### Lane Racer (verified after revert)

- Track drum: `itemHeight={140}`  
- Img: `h-24` + `maxWidth: 140` + `filter: invert(1)`  
- Hungary still imports thick `circuit_hungary.png`

### Key files

| File | Role |
|------|------|
| `client/src/assets/circuit_hungary.png` | Thick Live Map / FP / (wrongly) Lane Racer |
| `client/src/pages/LaneRacer.tsx` | Carousel maps — needs Hungary `_black` |
| `client/src/components/LiveCircuitMap.tsx` | Live map + ribbon stroke |
| `client/src/lib/circuitPaths.ts` / `circuitPathData.json` | Images + path + ribbon |
| `script/extractCircuitCenterline.ts` | Medial extract |
| `client/src/lib/currentGrandPrix.ts` | Round 11 Hungary |
| `docs/spa-quality-circuit-map-guide.md` | Spa→Hungary quality / reproduction guide |
| `docs/spa-live-circuit-map-playbook.md` | Stub → points at quality guide |

### Circuit map coverage

| Circuit | Live map art | Notes |
|---------|--------------|--------|
| Spa, Monaco, Monza, Suzuka, Silverstone, Hungary | Yes | Hungary assets messy — see above |
| Canada, Miami, Barcelona, Austria | Fallback oval | Do not retrace without ask |

Hungary regenerate:  
`npx tsx script/extractCircuitCenterline.ts hungary`

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
| Lane Racer track stage | Keep Spa-era clamps; no global enlarge to fix Hungary |

---

## Next optional (confirm with user)

1. Finish Lane Racer Hungary thin asset (without touching Spa size)  
2. Align Multiplayer race status chrome with Game (Lap\|Limits + `hideFooter`)  
3. Remove or gate `/dev/circuit-maps` in production  
4. Play-test kid ladder + Lane Racer 1:2:3:4 speeds  
5. Discuss Lane Racer setup on iPad  

### Local untracked (not committed — leave unless asked)

- `docs/mockup-map-toggle-real-sectors.png`  
- `docs/mockup-map-toggle-real-track.png`  
- `docs/setup-card-target.png`  
- `docs/spa-quality-circuit-map-guide.md`
- `docs/spa-live-circuit-map-playbook.md` (stub)  

### Out of scope unless asked

- Soft-follow in browser / narrow-only iPad gate  
- Championship unlock redesign  
- Deploy/Harvest re-enable  
- Retracing Canada / Miami / Barcelona / Austria  
- Pushing the 9 local commits to origin  

---

## Note for the next agent

You are on **`main`**, **9 commits ahead of origin**. Current GP is **Hungary (Round 11)**. Live Circuit Map exists for Hungary but **Hungaroring track assets are a mess** — Lane Racer still uses the thick Live Map PNG; a shared stage enlarge was reverted because it broke Spa. Start from [`docs/spa-quality-circuit-map-guide.md`](spa-quality-circuit-map-guide.md). Prefer `http://127.0.0.1:8081`. QA: `/dev/circuit-maps`. iOS: build + `cap sync` + `cap run` to booted sim. Do not invent new map UX or reopen locked difficulty decisions without asking. Do not retrace the four fallback GP circuits. Do not change global Lane Racer map stage size.
