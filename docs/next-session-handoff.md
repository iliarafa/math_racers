# Next Session Handoff — Multiplayer Dynamic Difficulty

**Branch:** `feature/multiplayer-dynamic-difficulty`
**Tip:** (Task 5 commit) — Finish MP dynamic difficulty wiring and refresh session handoff
**Last updated:** 2026-07-13
**Status:** Multiplayer shared dynamic difficulty **shipped** — server-owned, one shared track per room, freeze-on-first-touch per question slot. Host and guest race the same live-adapting question bank instead of a fixed Karting bank.

---

## Resume here (start here)

```bash
git checkout feature/multiplayer-dynamic-difficulty
git pull
npm run dev -- --port 8081
```

### First order of business (do this first)

Multiplayer dynamic difficulty is done. Pick one of the "Next optional" items below, or ask the user for direction before starting new work.

**Reference implementations (source of truth):**
1. Free Practice / GP Practice — `Game.tsx` (`initDynamicDifficulty` / `updateDynamicDifficulty`, HUD label)
2. Lane Racer — `LaneRacer.tsx` (second live solo reference; rival estimate stays beginner-baseline)
3. Multiplayer — `Multiplayer.tsx` (server-synced live reference: `dynamicDifficultyDisplay` driven by `difficulty_sync` / `questions_patch`)
4. Engine — `shared/mathEngine.ts` (pure, server-safe — no React) re-exported through `client/src/lib/gameLogic.ts`
5. Server state machine — `server/websocket.ts` (`mintSlotIfNeeded`, `broadcastDifficulty`, `broadcastQuestionsPatch`, `updateDynamicDifficulty` calls in `handleProgressUpdate` / `handleMistakeUpdate`)

**Locked product decisions (from prior design — do not reopen without asking):**
| Topic | Decision |
|-------|----------|
| Start difficulty | Always `beginner` |
| Grand Prix | Lock after Practice for Quali + Race |
| Championship unlocks | None — no series gates |
| Soft-follow 3D cam | **Capacitor native only** (`isNativePlatform()`). Never enable in browser / localhost |
| Multiplayer difficulty model | **One shared track per room** (server-owned), not per-player tracks. `slowerThanBot: false` (MP doesn't model a bot). Freeze-on-first-touch: whichever player reaches a question slot first, that slot's question is locked for both |

---

## Shipped (do not reopen without reason)

| Surface | Behavior |
|---------|----------|
| **Lane Racer** | No Level drum (Team + Track); live adaptive difficulty + HUD; score/`difficultyAchieved` from live level; rival pace locked at beginner for the race |
| **Free Practice** | Starts beginner; adapts in-race |
| **Grand Prix Practice** | Starts beginner; adapts; Quali/Race use locked difficulty |
| **Multiplayer** | Starts beginner; server mints question slots and owns one shared adaptive difficulty track per room; both players' answers (correct + wrong) feed the same track via `difficulty_sync`; clients no longer pre-bake questions; HUD shows live shared difficulty; energy harvest + OVERTAKE harder-overlay now read the live shared level (OVERTAKE's harder question stays a client-local overlay, never written back into the shared bank); finished screen shows `Difficulty: {label}` |
| **Regulations** | Race article `#Difficulty` — adaptive, not a pre-race pick |
| **3D soft-follow** | Native Capacitor only (`LaneRacerCanvas3D.tsx` → `NATIVE_SOFT_FOLLOW`). Web/localhost = fixed center cam |

### Spec / plan (done)

- Spec: `docs/superpowers/specs/2026-07-13-multiplayer-dynamic-difficulty-design.md`
- Plan: `docs/superpowers/plans/2026-07-13-multiplayer-dynamic-difficulty.md`
- Prior universal dynamic difficulty spec/plan: `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md` / `docs/superpowers/plans/2026-07-12-universal-dynamic-difficulty.md`

---

## Next optional (pick one, confirm with user first)

1. **Opponent-paced `slowerThanBot`** — MP currently hardcodes `slowerThanBot: false` in both `updateDynamicDifficulty` call sites in `server/websocket.ts` (no bot to be slower than). If product wants difficulty to also react to being behind the human opponent (not just raw speed/accuracy), design what "slower than opponent" means for two live humans before wiring it.
2. **Reconnect resilience** — if a client drops mid-race and rejoins, confirm `dynamicDifficultyDisplay` / question bank rehydrate correctly from server state (`difficulty_sync` + `questions_patch` replay or a snapshot-on-rejoin). Not exercised this session.
3. **Dead-code cleanup from prior handoff** — Orphaned Lane Racer setup helpers (`displayCircuit` / unused swipe helpers); the dead `Multiplayer.tsx` `joinRoom` → `data.room.questions` legacy hydration path (REST bank is never populated anymore, kept only for backward-compat safety); Regulations Free Practice table header still says `"Series"`; Garage "grouped by series" wording.

### Out of scope unless asked
- Deploy/Harvest re-enable
- Championship / circuit unlock redesign
- Making GP Quali/Race fully dynamic
- Soft-follow in the web browser (still native-only)
- Per-player (non-shared) MP difficulty tracks
- New leaderboard/DB fields for MP `difficultyAchieved` (finished screen shows it in the UI only, no persistence added)

---

## Minor follow-ups (optional polish)

- Orphaned Lane Racer setup helpers (`displayCircuit` / unused swipe helpers) — dead code cleanup
- Regulations Free Practice table header still says `"Series"`; Garage "grouped by series" wording
- `Multiplayer.tsx`'s legacy `joinRoom` → `data.room.questions` hydration path could be removed in a later cleanup pass (effectively dead since the REST bank is never populated anymore)
- Manual two-client (host/guest) browser play-test recommended beyond this session's spot-check: long-race promotion/demotion under real network latency, OVERTAKE energy sync across many rapid answers, sim-mode long races

---

## Key file map

| File | Role |
|------|------|
| `shared/mathEngine.ts` | Pure, server-safe engine: `Difficulty`, `Question`, `generateQuestion`, `initDynamicDifficulty`, `updateDynamicDifficulty`, `getHarderDifficulty`, `calculateEnergyHarvest`, etc. |
| `client/src/lib/gameLogic.ts` | Re-exports `shared/mathEngine.ts`; keeps UI-facing types/constants (`Driver`, `Circuit`, `DRIVERS`, `CIRCUITS`, `useGameState`, etc.) |
| `client/src/pages/Game.tsx` | PST + GP Practice dynamic; beginner init |
| `client/src/pages/LaneRacer.tsx` | Solo arcade dynamic + HUD |
| `client/src/pages/Multiplayer.tsx` | Server-synced live difficulty: `dynamicDifficultyDisplay` state, `difficulty_sync`/`questions_patch` consumption, HUD strip, energy/OVERTAKE reads, finished-screen `Difficulty:` line |
| `server/websocket.ts` | MP state machine — owns `dynamicDifficulty` per room, mints question slots (`mintSlotIfNeeded`), broadcasts `difficulty_sync` / `questions_patch` |
| `server/routes.ts` | `POST /api/rooms` accepts `raceLength` (client no longer sends a pre-baked `questions` bank) |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | Soft-follow gated by `isNativePlatform()` |

---

## Note for the next agent

Multiplayer dynamic difficulty is complete end to end (server mint/sync → client consume/HUD → energy/OVERTAKE → finished-screen label). Do not re-enable soft-follow on web. Do not unlock GP Quali/Race dynamic without product say-so. If picking up "Next optional" work, confirm scope with the user first — none of those three items were requested yet, they're just the logical next steps.
