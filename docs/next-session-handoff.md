# Next Session Handoff

**Branch:** `main` (up to date with `origin/main`)  
**Tip:** `81d6b41` — *Update Regulations for Adaptive/Locked and Lane Racer.*  
**App version:** `1.3.9` (App Store build published)  
**Current GP:** Round 10 / Spa (Belgium)  
**Last updated:** 2026-07-15  
**Status:** Feature work from this stretch is **on `main`** and shipped. Soft-follow stays **Capacitor native only** (including iPad — narrow-only gate was tried and **reverted**; car crops without soft-follow on iPad). No iOS build/archive follow-up needed.

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

Open the app at **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only; some browsers hit `::1` and get `ERR_CONNECTION_REFUSED`).

### First order of business (do this first)

Confirm with the user: pick a **Discuss next** item (Lane Racer difficulty model, and/or **Lane Racer setup on iPad**) or another optional follow-up below. Do not invent new setup UX or reopen locked decisions without asking.

**Reference implementations (source of truth):**
1. Free Practice — `Game.tsx` (`difficultyMode` / `lockedDifficulty`; Adaptive uses `initDynamicDifficulty` / `updateDynamicDifficulty`)
2. Grand Prix — always adaptive Practice → lock for Quali/Race (`grandPrixLockedDifficulty`) — **no** Adaptive/Locked UI
3. Lane Racer — `LaneRacer.tsx` one-screen setup + `DIFFICULTY_DRUM_OPTIONS` (Adaptive + Karting/F3/F2/F1); separate prefs `laneRacerDifficultyMode` / `laneRacerLockedDifficulty` (does not inherit FP Locked); rival/engine pace beginner when Adaptive, locked level when Locked
4. Multiplayer — host `set_difficulty_settings` + guest Ready; server skips DD updates when Locked
5. Engine — `shared/mathEngine.ts` re-exported through `client/src/lib/gameLogic.ts`

**Locked product decisions (do not reopen without asking):**
| Topic | Decision |
|-------|----------|
| Adaptive default | Factory default on FP / Lane Racer / MP |
| Locked | Fixed Karting/F3/F2/F1 for the race; no promotion/demotion |
| Grand Prix | **Always adaptive Practice**; Quali/Race lock after Practice — no Adaptive/Locked UI |
| Soft-follow 3D cam | **Capacitor native only** (`isNativePlatform()`), **including iPad**. Never enable in browser / localhost. Do **not** re-gate to narrow phones without asking — tried 2026-07-15, reverted (iPad crops the car) |
| Multiplayer difficulty | One shared track per room; host sets mode/level; guest Ready required; host changes clear Ready |
| MP weather on start | Host sends **resolved** `'wet' \| 'dry'` (never literal `'random'`) |
| Selection chrome | Text color / opacity only — no gray selection pills |
| Difficulty colors | Adaptive green · Locked purple (FP/MP mode UI) · Karting electric blue · F3 black · F2 light blue · F1 red · Pro amber |
| Kid difficulty ladder | Karting→F1 compressed kid ranges; Adaptive soft-caps at F1; Pro Locked-only (same digits, harder pace/facts). Spec: `docs/superpowers/specs/2026-07-16-kid-difficulty-ladder-design.md` |
| Lane Racer pace | Series speeds 1:2:3:4 (Karting→F1); Pro=F1 speeds; Adaptive applies on next question spawn |
| Chase Cam on | Bright red (`#ff2800`) |
| Lane Racer setup | **One screen** — Track hero outside glass; Team → Operation → Level → Chase Cam inside; Start at bottom. Fallback A (Track inside glass) only if user asks |
| Garage-preview setup | Tried, **rejected** |

---

## Shipped on `main` (committed)

Tip: **`81d6b41`**. Notable: Adaptive/Locked + Regulations · Lane Racer one-screen hierarchy · Chase Cam chrome · Spa Round 10 / v1.3.9 (`ccf8ec2`) · MP shared dynamic difficulty (earlier).

| Surface | Behavior |
|---------|----------|
| **Free Practice** | Adaptive \| Locked setup; Locked skips `updateDynamicDifficulty` |
| **Lane Racer race** | Adaptive \| Locked via 5-option drum; rival pace = beginner (Adaptive) or locked level |
| **Lane Racer setup** | One screen — Track hero outside glass; glass: Team → Operation → Level → Chase Cam → Start. `HorizontalDrum` + chevrons/swipe |
| **Grand Prix** | Practice always adapts; Quali/Race use achieved lock — unchanged. Config: `currentGrandPrix.ts` → Spa |
| **Multiplayer** | Adaptive \| Locked + guest Ready gate; server-owned bank |
| **Regulations** | `#Difficulty` + Lane Racer article; Adaptive/Locked + GP exception |
| **3D soft-follow** | Native Capacitor only (phones **and** iPads) |

### Specs / plans
- `docs/superpowers/specs/2026-07-14-difficulty-lock-choice-design.md`
- `docs/superpowers/specs/2026-07-14-lane-racer-horizontal-drums-design.md`
- `docs/superpowers/plans/2026-07-14-lane-racer-horizontal-drums.md`
- `docs/superpowers/specs/2026-07-15-lane-racer-setup-hierarchy-design.md`
- `docs/superpowers/plans/2026-07-15-lane-racer-setup-hierarchy.md`
- `docs/superpowers/specs/2026-07-16-kid-difficulty-ladder-design.md`

---

## Next optional (confirm with user)

1. **Play-test kid ladder + Pro + LR 1:2:3:4 speeds** — tune absolute `BASE`/`MAX` in `laneRacerHud.ts` if F1/Pro feel too brutal or Karting too slow; confirm Adaptive never reaches Pro.
2. **Discuss: Lane Racer setup on iPad** — review how the one-screen setup (Track hero + glass drums + Chase Cam) looks/feels on iPad; layout may need an iPad-specific pass. Not decided — discuss before coding.
3. **Manual host/guest play-test** — Locked MP + Ready gate, OVERTAKE under rapid answers; Locked Pro room  
4. **Opponent-paced `slowerThanBot`** — MP hardcodes `false` today  
5. **Reconnect resilience** — rehydrate difficulty + question bank on mid-race rejoin  
6. **Dead-code / copy cleanup** — orphaned helpers; Garage wording  
7. **FP / MP difficulty UI polish** — text-color Adaptive\|Locked already present; layout may still want a pass (Pro button now in Locked row)  
8. **Weekend rotation** — when calendar moves on: `/weekend` skill → Hungary (Round 11) after Spa  

### Out of scope unless asked
- Garage-preview / hotspot setup (tried, rejected)  
- Fallback A (Track inside glass) — only if user asks  
- Soft-follow narrow-only / disable on iPad (tried, reverted)  
- Soft-follow in the web browser  
- Deploy/Harvest re-enable  
- Championship / circuit unlock redesign  
- Making GP Quali/Race fully dynamic  
- Per-player (non-shared) MP difficulty tracks  
- Adaptive/Locked choice on Grand Prix  
- iOS build-number / App Store archive follow-up for 1.3.9 (already published)  

---

## Key file map

| File | Role |
|------|------|
| `shared/mathEngine.ts` | Pure engine: difficulty + `generateQuestion` |
| `client/src/lib/gameLogic.ts` | `DifficultyMode`, prefs, `CHASE_CAM_ACTIVE_COLOR`, selection colors |
| `client/src/lib/currentGrandPrix.ts` | Weekly GP config (Spa Round 10) |
| `client/src/pages/Game.tsx` | Free Practice lock UI + skip updates when Locked |
| `client/src/pages/LaneRacer.tsx` | One-screen setup; drums; Chase Cam; race logic |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | 3D canvas; soft-follow = `isNativePlatform()` |
| `client/src/pages/Multiplayer.tsx` | Host settings, guest Ready, start gate |
| `server/websocket.ts` | Room mode/level/Ready; skip DD when Locked |
| `docs/next-session-handoff.md` | This file |

---

## Note for the next agent

On **`main`**, tip **`81d6b41`**, synced with origin. Soft-follow must stay **all native** (including iPad). Top discussions: (1) Lane Racer hardness via **speed**, not multi-digit math; (2) **Lane Racer setup screen on iPad**. GP is Spa Round 10 / v1.3.9 (published). Prefer `http://127.0.0.1:8081` for local browser.
