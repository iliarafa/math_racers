# Next Session Handoff

**Branch:** `main` (synced with `origin/main` after push)  
**Tip:** (updated on commit) — Refresh next-session handoff after MP merge  
**Last updated:** 2026-07-14  
**Status:** Multiplayer shared dynamic difficulty **shipped on `main`**. Soft-follow remains Capacitor-native only.

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

Open the app at **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only; some browsers hit `::1` and get `ERR_CONNECTION_REFUSED`).

### First order of business (do this first)

**Ask the user for direction** before starting new product work. If they say “whatever’s next,” pick one **Next optional** item below after confirming scope.

Do **not** invent a new mode or reopen locked decisions without asking.

**Reference implementations (source of truth):**
1. Free Practice / GP Practice — `Game.tsx` (`initDynamicDifficulty` / `updateDynamicDifficulty`, HUD label)
2. Lane Racer — `LaneRacer.tsx` (solo live reference; rival estimate stays beginner-baseline)
3. Multiplayer — `Multiplayer.tsx` (`dynamicDifficultyDisplay` via `difficulty_sync` / `questions_patch`)
4. Engine — `shared/mathEngine.ts` (pure, server-safe) re-exported through `client/src/lib/gameLogic.ts`
5. Server — `server/websocket.ts` (`mintSlotIfNeeded`, `broadcastDifficulty`, `broadcastQuestionsPatch`, answer-driven `updateDynamicDifficulty`)

**Locked product decisions (do not reopen without asking):**
| Topic | Decision |
|-------|----------|
| Start difficulty | Always `beginner` |
| Grand Prix | Lock after Practice for Quali + Race |
| Championship unlocks | None — no series gates |
| Soft-follow 3D cam | **Capacitor native only** (`isNativePlatform()`). Never enable in browser / localhost |
| Multiplayer difficulty | **One shared track per room**, server-owned. `slowerThanBot: false`. Freeze-on-first-touch per question slot |
| MP weather on start | Host sends **resolved** `'wet' \| 'dry'` (never literal `'random'`) so server mint matches client |

---

## Shipped (do not reopen without reason)

| Surface | Behavior |
|---------|----------|
| **Lane Racer** | No Level drum; live adaptive difficulty + HUD; rival pace locked at beginner |
| **Free Practice** | Starts beginner; adapts in-race |
| **Grand Prix Practice** | Starts beginner; adapts; Quali/Race use locked difficulty |
| **Multiplayer** | Server mints slots + owns one shared adaptive track; both players’ answers update it; clients do not pre-bake the bank; HUD + energy + OVERTAKE overlay use live level; finish screen shows `Difficulty: {label}`; random weather resolved before `start_countdown` |
| **Regulations** | Race article `#Difficulty` — adaptive, not a pre-race pick |
| **3D soft-follow** | Native Capacitor only |

### Spec / plan (done)

- Spec: `docs/superpowers/specs/2026-07-13-multiplayer-dynamic-difficulty-design.md`
- Plan: `docs/superpowers/plans/2026-07-13-multiplayer-dynamic-difficulty.md`
- Prior solo pass: `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md` / `docs/superpowers/plans/2026-07-12-universal-dynamic-difficulty.md`

---

## Next optional (pick one, confirm with user first)

1. **Opponent-paced `slowerThanBot`** — MP hardcodes `false` today; needs a product definition of “slower than human opponent” before coding  
2. **Reconnect resilience** — rehydrate difficulty + question bank on mid-race rejoin (`difficulty_sync` / `questions_patch` snapshot)  
3. **Dead-code / copy cleanup** — Lane Racer orphaned setup helpers; dead `joinRoom` → `data.room.questions` path; Regulations FP table header `"Series"`; Garage “grouped by series” wording  
4. **Manual host/guest play-test** — long race promotion/demotion, OVERTAKE under rapid answers, sim-mode, IPv4 URL if browser flakes  

### Out of scope unless asked
- Deploy/Harvest re-enable  
- Championship / circuit unlock redesign  
- Making GP Quali/Race fully dynamic  
- Soft-follow in the web browser  
- Per-player (non-shared) MP difficulty tracks  
- Persisting MP `difficultyAchieved` to DB/leaderboard  

---

## Key file map

| File | Role |
|------|------|
| `shared/mathEngine.ts` | Pure engine: difficulty + `generateQuestion` + energy helpers |
| `client/src/lib/gameLogic.ts` | Re-exports math engine; UI `CIRCUITS` / `DRIVERS` / `useGameState` |
| `client/src/pages/Multiplayer.tsx` | Client sync, HUD, energy/OVERTAKE, resolved weather on start |
| `server/websocket.ts` | Room dynamic state, mint/patch, shared difficulty updates |
| `server/routes.ts` | `POST /api/rooms` accepts `raceLength` (no pre-baked questions required) |
| `docs/next-session-handoff.md` | This file |

---

## Note for the next agent

MP dynamic difficulty is done on `main`. Ask what product work comes next. Prefer `http://127.0.0.1:8081` for local browser. Do not re-enable web soft-follow or unlock GP Quali/Race dynamic without product say-so.
