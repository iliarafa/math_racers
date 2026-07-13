# Next Session Handoff — Multiplayer Dynamic Difficulty

**Branch:** `main` (synced with `origin/main`)  
**Tip:** `9ab242c` — Gate Lane Racer soft-follow on Capacitor native only  
**Last updated:** 2026-07-13  
**Status:** Universal dynamic difficulty **merged + pushed** for solo modes; soft-follow chase cam is **native-only**. Next product push = multiplayer mid-race dynamic difficulty + WebSocket sync.

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

### First order of business (do this first)

**Wire dynamic difficulty into Multiplayer mid-race** — questions are still pre-generated at Karting/`beginner` for the whole race. Players should promote/demote per answer like Free Practice / Lane Racer, with questions (or difficulty) kept in sync over WebSocket so host and guest stay fair.

**Do not ship client-only dynamic MP** without a sync plan — opponents must not drift to different question hardness silently.

**Reference implementations (source of truth):**
1. Free Practice / GP Practice — `Game.tsx` (`initDynamicDifficulty` / `updateDynamicDifficulty`, HUD label)
2. Lane Racer — `LaneRacer.tsx` (second live solo reference; rival estimate stays beginner-baseline)
3. Engine — `client/src/lib/gameLogic.ts`

**Locked product decisions (from prior design — do not reopen without asking):**
| Topic | Decision |
|-------|----------|
| Start difficulty | Always `beginner` |
| Grand Prix | Lock after Practice for Quali + Race |
| Championship unlocks | None — no series gates |
| Soft-follow 3D cam | **Capacitor native only** (`isNativePlatform()`). Never enable in browser / localhost |

---

## Shipped (do not reopen without reason)

| Surface | Behavior |
|---------|----------|
| **Lane Racer** | No Level drum (Team + Track); live adaptive difficulty + HUD; score/`difficultyAchieved` from live level; rival pace locked at beginner for the race |
| **Free Practice** | Starts beginner; adapts in-race |
| **Grand Prix Practice** | Starts beginner; adapts; Quali/Race use locked difficulty |
| **Multiplayer** | Fixed Karting/`beginner` questions + `KARTING_DRIVER` (intentional interim) |
| **Regulations** | Race article `#Difficulty` — adaptive, not a pre-race pick |
| **3D soft-follow** | Native Capacitor only (`LaneRacerCanvas3D.tsx` → `NATIVE_SOFT_FOLLOW`). Web/localhost = fixed center cam |

### Spec / plan (done)

- Spec: `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md`
- Plan: `docs/superpowers/plans/2026-07-12-universal-dynamic-difficulty.md`

---

## Next: Multiplayer dynamic difficulty

### Confirm with user first
1. **Question sync model** (pick one):
   - **A)** Each client generates next Q locally from its own live difficulty (simple; opponents may see different hardness)
   - **B)** Host or server owns difficulty + next question and broadcasts over WS (fairer; more work) — **recommended**
2. Whether both players share **one** difficulty track or each has their **own** adaptive track (with synced questions still from one generator)

### Likely implementation order
1. Product confirm A vs B (+ shared vs per-player difficulty)
2. Server (`server/websocket.ts` + room question handling): stop baking the full bank at one difficulty; support mid-race next-question or difficulty updates
3. Client (`Multiplayer.tsx`): `initDynamicDifficulty('beginner')`, update on answer, HUD label, `difficultyAchieved` on finish; remove hard `beginner`-only question gen once sync works
4. Optional: server-side reject non-Karting `driverId` / mismatched progress if still relevant
5. `npm run check` + host/guest spot-check on phone + desktop

### Acceptance for this next push
1. MP setup still has no series picker  
2. Difficulty adapts mid-race using the Free Practice algorithm (or approved variant)  
3. Host and guest stay consistent with the chosen sync model  
4. HUD shows live (or agreed) difficulty  
5. Races still finish cleanly; `npm run check` passes  

### Out of scope unless asked
- Deploy/Harvest re-enable  
- Championship / circuit unlock redesign  
- Making GP Quali/Race fully dynamic  
- Soft-follow in the web browser  
- Lane Racer rival pacing polish (still beginner baseline)  

---

## Minor follow-ups (optional polish)

- Orphaned Lane Racer setup helpers (`displayCircuit` / unused swipe helpers) — dead code cleanup  
- Regulations Free Practice table header still says `"Series"`; Garage “grouped by series” wording  
- Manual play-test still recommended: Lane Racer HUD promotion, GP Practice→Quali lock, MP beginner bank after a high solo session  

---

## Key file map

| File | Role |
|------|------|
| `client/src/lib/gameLogic.ts` | `initDynamicDifficulty` / `updateDynamicDifficulty` |
| `client/src/pages/Game.tsx` | PST + GP Practice dynamic; beginner init |
| `client/src/pages/LaneRacer.tsx` | Solo arcade dynamic + HUD |
| `client/src/pages/Multiplayer.tsx` | `KARTING_DRIVER` / fixed beginner — **next work** |
| `server/websocket.ts` | MP state machine — **next work** |
| `client/src/components/lane-racer/LaneRacerCanvas3D.tsx` | Soft-follow gated by `isNativePlatform()` |

---

## Note for the next agent

Start by confirming the MP sync model (A vs B) before coding. Do not re-enable soft-follow on web. Do not unlock GP Quali/Race dynamic without product say-so. Solo dynamic difficulty is done — focus on Multiplayer.
