# Next Session Handoff

**Branch:** `feature/lane-racer-horizontal-drums` (local changes **uncommitted** — see below)  
**Last updated:** 2026-07-14  
**Status:** Difficulty Lock Choice implemented (FP / Lane Racer / MP). **Grand Prix Practice stays always adaptive.** Lane Racer horizontal drums **done** (spec + plan implemented on this branch). Soft-follow remains Capacitor-native only.

---

## Resume here (start here)

```bash
git checkout feature/lane-racer-horizontal-drums   # or main after merge
git status   # expect uncommitted Difficulty Lock edits; drums committed through 9077e64
npm run dev -- --port 8081
```

Open the app at **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only; some browsers hit `::1` and get `ERR_CONNECTION_REFUSED`).

### First order of business (do this first)

**Pick from optional follow-ups below** — confirm direction with the user before starting. Lane Racer setup drums are complete; no further drum work unless the user asks.

**Shipped on `feature/lane-racer-horizontal-drums` (commits through 9077e64):**
- Stacked full-width horizontal 3-slot drums for Team, Track, and Math (`HorizontalDrum` + `getWrappedIndex`)
- Swipe left/right + tap neighbors; chevrons on neighbors; opacity center 1 / neighbors 0.3
- Setup order: Team → Track → Difficulty → Math → Chase Cam → Start
- Subtitle: “Swipe to configure”; no hairline dividers; text-color selection only
- Difficulty + Chase Cam blocks unchanged

**Plan / spec:** `docs/superpowers/plans/2026-07-14-lane-racer-horizontal-drums.md` · `docs/superpowers/specs/2026-07-14-lane-racer-horizontal-drums-design.md`

Do **not** invent a new mode or reopen locked product decisions without asking.

**Reference implementations (source of truth):**
1. Free Practice — `Game.tsx` (`difficultyMode` / `lockedDifficulty`; Adaptive uses `initDynamicDifficulty` / `updateDynamicDifficulty`)
2. Grand Prix — always adaptive Practice → lock for Quali/Race (`grandPrixLockedDifficulty`) — **no** Adaptive/Locked UI
3. Lane Racer — `LaneRacer.tsx` (horizontal drums setup; Adaptive | Locked behavior wired; rival/engine pace beginner when Adaptive, locked level when Locked)
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
| Difficulty colors | Adaptive green · Locked purple · Karting electric blue · F3 black · F2 light blue · F1 red |
| Chase Cam on | Bright red (`#ff2800`) |

---

## Uncommitted local work (this session)

| Area | Files | State |
|------|-------|--------|
| Difficulty Lock Choice | `gameLogic.ts`, `Game.tsx`, `LaneRacer.tsx`, `Multiplayer.tsx`, `websocket.ts`, `Regulations.tsx`, spec | **Implemented** — commit when user asks |
| Spec | `docs/superpowers/specs/2026-07-14-difficulty-lock-choice-design.md` | Written (GP excluded from lock UI) |
| Lane Racer horizontal drums | `LaneRacer.tsx` | **Done** — committed on `feature/lane-racer-horizontal-drums` (9077e64) |

---

## Shipped conceptually (code present; commit pending)

| Surface | Behavior |
|---------|----------|
| **Free Practice** | Adaptive \| Locked setup; Locked skips `updateDynamicDifficulty` |
| **Lane Racer** | Adaptive \| Locked wired; rival pace = beginner (Adaptive) or locked level |
| **Grand Prix** | Practice always adapts; Quali/Race use achieved lock — unchanged |
| **Multiplayer** | Adaptive \| Locked + guest Ready gate; server-owned bank |
| **Regulations** | `#Difficulty` documents Adaptive, Locked, and GP exception |
| **3D soft-follow** | Native Capacitor only |
| **Lane Racer setup** | Horizontal 3-slot drums for Team / Track / Math |

### Specs
- `docs/superpowers/specs/2026-07-14-difficulty-lock-choice-design.md`
- `docs/superpowers/specs/2026-07-14-lane-racer-horizontal-drums-design.md`

---

## Next optional (confirm with user)

1. **Opponent-paced `slowerThanBot`** — MP hardcodes `false` today  
2. **Reconnect resilience** — rehydrate difficulty + question bank on mid-race rejoin  
3. **Dead-code / copy cleanup** — orphaned helpers; Regulations FP table header `"Series"`; Garage wording  
4. **Manual host/guest play-test** — Locked MP + Ready gate, OVERTAKE under rapid answers  
5. **FP / MP difficulty UI polish** — Lane Racer got divider/layout cleanup; FP/MP may still want the same pass  

### Out of scope unless asked
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
| `client/src/pages/LaneRacer.tsx` | Horizontal drums setup; Adaptive/Locked race logic |
| `client/src/pages/Multiplayer.tsx` | Host settings, guest Ready, start gate |
| `server/websocket.ts` | Room mode/level/Ready; skip DD when Locked |
| `docs/next-session-handoff.md` | This file |

---

## Note for the next agent

Difficulty Lock Choice is implemented but may still be uncommitted — commit when the user asks. Lane Racer horizontal drums are **done** on `feature/lane-racer-horizontal-drums`; merge or continue from there. GP Practice must remain always adaptive. Prefer `http://127.0.0.1:8081` for local browser.
