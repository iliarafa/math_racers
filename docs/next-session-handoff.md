# Next Session Handoff

**Branch:** `feature/lane-racer-horizontal-drums` (ahead of origin by **4** — tip will be HEAD after this commit; layout at `fb5eb86` not pushed)  
**Last updated:** 2026-07-15  
**Status:** Working tree **clean**. Difficulty Lock Choice shipped on this branch (FP / Lane Racer / MP). Lane Racer setup hierarchy redesign **done** — **one screen** with Track hero outside glass. **Grand Prix Practice stays always adaptive.** Soft-follow remains Capacitor-native only.

---

## Resume here (start here)

```bash
git checkout feature/lane-racer-horizontal-drums
git status   # expect clean; branch may be ahead of origin by 4+
git push     # if tip not on remote yet
npm run dev -- --port 8081
```

Open the app at **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only; some browsers hit `::1` and get `ERR_CONNECTION_REFUSED`).

### First order of business (do this first)

Confirm with the user: **merge/PR this branch**, **push tip**, or pick an optional follow-up below. Do not invent new setup UX without asking — garage preview was tried and rejected as too complicated.

Do **not** invent a new mode or reopen locked product decisions without asking.

**Reference implementations (source of truth):**
1. Free Practice — `Game.tsx` (`difficultyMode` / `lockedDifficulty`; Adaptive uses `initDynamicDifficulty` / `updateDynamicDifficulty`)
2. Grand Prix — always adaptive Practice → lock for Quali/Race (`grandPrixLockedDifficulty`) — **no** Adaptive/Locked UI
3. Lane Racer — `LaneRacer.tsx` one-screen setup hierarchy + `DIFFICULTY_DRUM_OPTIONS` (Adaptive + Karting/F3/F2/F1); rival/engine pace beginner when Adaptive, locked level when Locked
4. Multiplayer — host `set_difficulty_settings` + guest Ready; server skips DD updates when Locked
5. Engine — `shared/mathEngine.ts` re-exported through `client/src/lib/gameLogic.ts` (`DifficultyMode`, prefs helpers, selection colors)

**Locked product decisions (do not reopen without asking):**
| Topic | Decision |
|-------|----------|
| Adaptive default | Factory default on FP / Lane Racer / MP |
| Locked | Fixed Karting/F3/F2/F1 for the race; no promotion/demotion |
| Grand Prix | **Always adaptive Practice**; Quali/Race lock after Practice — no Adaptive/Locked UI |
| Soft-follow 3D cam | **Capacitor native only** (`isNativePlatform()`). Never enable in browser / localhost |
| Multiplayer difficulty | One shared track per room; host sets mode/level; guest Ready required; host changes clear Ready |
| MP weather on start | Host sends **resolved** `'wet' \| 'dry'` (never literal `'random'`) |
| Selection chrome | Text color / opacity only — no gray selection pills |
| Difficulty colors | Adaptive green · Locked purple (FP/MP mode UI) · Karting electric blue · F3 black · F2 light blue · F1 red |
| Chase Cam on | Bright red (`#ff2800`) |
| Lane Racer setup | **One screen** — Track hero outside glass; Team (car) / Diff / Math / Cam inside; whisper labels. Fallback A (Track inside glass) only if user asks |

---

## Shipped on this branch (committed)

Tip of branch: **`fb5eb86`** — *Restructure Lane Racer setup into one-screen Track-hero hierarchy.*  
Notable recent commits: `988ac08` variable HorizontalDrum height · `2964b9c` Adaptive vs Locked · `452c446` earlier two-screen setup (superseded) · drums/spec earlier on branch.

| Surface | Behavior |
|---------|----------|
| **Free Practice** | Adaptive \| Locked setup; Locked skips `updateDynamicDifficulty` |
| **Lane Racer race** | Adaptive \| Locked via 5-option drum (Adaptive, Karting, F3, F2, F1); rival pace = beginner (Adaptive) or locked level |
| **Lane Racer setup** | **One screen** — Track hero outside glass; inside glass: Team (car only) → Difficulty → Math → Chase Cam → Start. Whisper labels; no subtitle; no hairlines. `HorizontalDrum` = selected only + flanking chevrons + swipe. No `setupStep` / no Continue |
| **Grand Prix** | Practice always adapts; Quali/Race use achieved lock — unchanged |
| **Multiplayer** | Adaptive \| Locked + guest Ready gate; server-owned bank |
| **Regulations** | `#Difficulty` documents Adaptive, Locked, and GP exception |
| **3D soft-follow** | Native Capacitor only |

### Specs / plans
- `docs/superpowers/specs/2026-07-14-difficulty-lock-choice-design.md`
- `docs/superpowers/specs/2026-07-14-lane-racer-horizontal-drums-design.md`
- `docs/superpowers/plans/2026-07-14-lane-racer-horizontal-drums.md`
- `docs/superpowers/specs/2026-07-15-lane-racer-setup-hierarchy-design.md`
- `docs/superpowers/plans/2026-07-15-lane-racer-setup-hierarchy.md`

---

## Next optional (confirm with user)

1. **Push tip** and/or **open PR / merge** to `main`  
2. **Manual host/guest play-test** — Locked MP + Ready gate, OVERTAKE under rapid answers  
3. **Opponent-paced `slowerThanBot`** — MP hardcodes `false` today  
4. **Reconnect resilience** — rehydrate difficulty + question bank on mid-race rejoin  
5. **Dead-code / copy cleanup** — orphaned helpers; Regulations FP table header `"Series"`; Garage wording  
6. **FP / MP difficulty UI polish** — text-color Adaptive\|Locked already present; layout may still want a pass  

### Out of scope unless asked
- Garage-preview / hotspot setup (tried, rejected)  
- Fallback A (Track inside glass) — only if user asks  
- Deploy/Harvest re-enable  
- Championship / circuit unlock redesign  
- Making GP Quali/Race fully dynamic  
- Soft-follow in the web browser  
- Per-player (non-shared) MP difficulty tracks  
- Adaptive/Locked choice on Grand Prix  

---

## Key file map

| File | Role |
|------|------|
| `shared/mathEngine.ts` | Pure engine: difficulty + `generateQuestion` |
| `client/src/lib/gameLogic.ts` | `DifficultyMode`, prefs, selection colors |
| `client/src/pages/Game.tsx` | Free Practice lock UI + skip updates when Locked |
| `client/src/pages/LaneRacer.tsx` | One-screen setup hierarchy; `HorizontalDrum`; difficulty drum; race logic |
| `client/src/pages/Multiplayer.tsx` | Host settings, guest Ready, start gate |
| `server/websocket.ts` | Room mode/level/Ready; skip DD when Locked |
| `docs/next-session-handoff.md` | This file |

---

## Note for the next agent

Branch is feature-complete for this session's work; working tree should be clean. Tip **`fb5eb86`** (layout) may still need `git push` — branch may be ahead of origin. Lane Racer setup hierarchy redesign is **done**: **one screen**, Track hero outside glass, Team/Diff/Math/Cam inside with whisper labels — do not resurrect two-screen flow, Continue button, garage preview, or neighbor peeks without asking. GP Practice must remain always adaptive. Prefer `http://127.0.0.1:8081` for local browser.
