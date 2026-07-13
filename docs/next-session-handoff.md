# Next Session Handoff — Universal Dynamic Difficulty

**Branch:** `feature/universal-dynamic-difficulty` (ready to merge after Task 5)  
**Tip:** Task 5 — Regulations copy + final verification  
**Last updated:** 2026-07-12 (EOD)  
**Status:** Universal dynamic difficulty **shipped** for Lane Racer (live HUD + `difficultyAchieved`), Free Practice + GP Practice (beginner init, adapts in-race), and Multiplayer (fixed Karting/beginner for now). Regulations copy updated. **Next product push = multiplayer mid-race dynamic difficulty + WebSocket sync.**

---

## Resume here (start here)

```bash
git checkout feature/universal-dynamic-difficulty   # or main after merge
git pull
npm run dev -- --port 8081
```

### First order of business (do this first)

**Wire dynamic difficulty into Multiplayer mid-race** — questions currently pre-generated at Karting/beginner; promote/demote per answer like Free Practice and sync difficulty (or per-answer question generation) over WebSocket.

**Reference implementation (source of truth):** Free Practice / Pre-Season Testing in `Game.tsx` + `initDynamicDifficulty` / `updateDynamicDifficulty` in `client/src/lib/gameLogic.ts`. Lane Racer (`LaneRacer.tsx`) is the second live reference for solo dynamic HUD.

---

## Shipped this feature branch

| Surface | Behavior |
|---------|----------|
| **Lane Racer** | Series drum removed (2-column track + team setup); difficulty adapts per answer; HUD shows live Karting/F3/F2/F1 label |
| **Free Practice (PST)** | Starts Karting/beginner; adapts in-race (unchanged model, no series picker) |
| **Grand Prix Practice** | Starts Karting/beginner; adapts in-race; **lock-after-Practice unchanged** for Qualifying + Race Day |
| **Multiplayer** | Fixed Karting/beginner questions regardless of `lastSelectedDriverId` — intentional deferral |
| **Regulations** | Race article describes adaptive difficulty, not pre-race series pick |

---

## Next: Multiplayer dynamic difficulty

1. **Product confirms** approach: per-answer question generation vs difficulty-tagged question banks synced over WS  
2. **Server** (`server/websocket.ts`): stop pre-baking all questions at one difficulty; support mid-race difficulty changes  
3. **Client** (`Multiplayer.tsx`): wire `initDynamicDifficulty` / `updateDynamicDifficulty`; HUD label; `difficultyAchieved` on finish  
4. `npm run check` + spot-check host/guest stay in sync on difficulty shifts  

### Out of scope (unchanged)

- Deploy/Harvest re-enable  
- Championship / circuit unlock redesign  
- Full engine rewrite  

---

## Acceptance already met (Tasks 1–5)

1. No race mode setup asks player to pick Karting / F3 / F2 / F1 (Lane Racer drum gone; FP/GP/MP auto-beginner)  
2. Lane Racer + FP + GP Practice adapt in-race via Free Practice algorithm  
3. HUD communicates current difficulty in dynamic modes  
4. GP Quali/Race use locked difficulty from Practice end  
5. `npm run check` passes  

---

## Done this session (context — do not reopen without reason)

- Universal dynamic difficulty feature branch (Tasks 1–5)  
- Round 10 / Spa weekend rotation (v1.3.9); Lane Racer 3D soft-follow chase cam  
- Regulations copy: `#Difficulty` adaptive wording  

### Related

- Dynamic engine: `client/src/lib/gameLogic.ts` (`initDynamicDifficulty`, `updateDynamicDifficulty`)  
- PST wiring: `client/src/pages/Game.tsx` (search `isPreSeasonTesting` + `dynamicDifficultyRef`)  
- Lane Racer: `client/src/pages/LaneRacer.tsx` (2-drum setup, live HUD)  
- MP beginner lock: `client/src/pages/Multiplayer.tsx` (`KARTING_DRIVER`, `driverDifficulty: 'beginner'`)  
- Spec: `docs/superpowers/specs/2026-07-12-universal-dynamic-difficulty-design.md`  

---

## Note for the next agent

Multiplayer is the only major mode still on fixed beginner. Start with WS/question-generation design before touching UI. GP lock-after-Practice is intentional — do not make Quali/Race fully dynamic without explicit product approval.
