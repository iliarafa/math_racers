# Next Session Handoff — Grand Prix Weekend Rotation

**Branch:** `main` (synced with `origin/main`)  
**Tip:** `2c66828` — Merge `feature/lane-racer-3d`  
**Last updated:** 2026-07-12 (EOD)  
**Status:** Lane Racer 3D + selection chrome shipped; app still themed to Round 9 / Silverstone

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

### First order of business (do this first)

**Rotate the app to the next Grand Prix weekend using the `/weekend` skill.**

**Skill (mandatory):** `.claude/skills/weekend/SKILL.md`  
Follow its steps **in order**. Prefer that skill (and the two template commits below) over stale docs.

**Templates (trust these over SESSION_NOTES.md):**
- Existing circuit: `d17e8a0` — Round 9 / Silverstone
- New circuit: `caad87e` — Round 8 / Austria

---

## Current theming (as of handoff)

| Field | Value |
|-------|--------|
| Round | **9** |
| Circuit | **Silverstone** (`silverstone`) |
| Country | United Kingdom |
| Version | **1.3.8** |
| Config | `client/src/lib/currentGrandPrix.ts` |

---

## Likely next weekend (confirm with user before coding)

Per the **2026 F1 calendar**, after Silverstone (British GP) comes:

| App round | Circuit | `circuitId` | Real weekend |
|-----------|---------|-------------|--------------|
| **10** (increment from 9) | **Spa / Belgian GP** | `spa` | 17–19 Jul 2026 |

**Confirm with the user** that Round 10 = Spa before starting — app round numbering is sequential and may not match real F1 round numbers 1:1.

### Path: existing circuit (if Spa)

`spa` already exists in `SIM_LAP_COUNTS` / `CIRCUITS` (`gameLogic.ts` → 44 laps).  
Flag `flag_belgium.png` and silhouettes `circuit_spa_black.png` / `circuit_spa_red.png` already exist.

**Skip skill Step 3** (no gameLogic / LaneRacer circuit add).

**Still needed:**
1. Colored **detail map** asset → `client/src/assets/spa_detail_track.png`  
   - None in repo today (`austria` / `catalunya` / `silverstone` detail maps only)  
   - Ask user for the map; if `.avif`/`.webp`, convert with `sips` to PNG  
2. Update `currentGrandPrix.ts` (round 10, spa, Belgium flag colors, blurb, rain ~0.55–0.65 typical for Spa)  
3. Add `GP_HISTORY['spa']` in `grandPrixHistory.ts` with **verified 2025** race + quali (20 drivers each, all `{ name, team, time }`)  
4. Patch version bump **1.3.8 → 1.3.9** (package.json, capacitor.config.ts, pbxproj ×2)  
5. Verify web → cap sync/run iOS → **commit only, no push** (user pushes)

---

## How to run the weekend skill

1. Invoke / read `.claude/skills/weekend/SKILL.md` and follow Steps 0→8  
2. **Step 0 first:** confirm round + circuit with user; web-search real prior-year race + quali (never invent)  
3. Asset intake for Spa detail map before editing history  
4. After code: `npm run check` + `npm run build` + spot-check Welcome FP card, GP hero, `/grand-prix` briefing  
5. Commit message style of `d17e8a0`:  
   `Update Free Practice and Grand Prix to Round 10 / Spa` (+ bullets). **Do not `git push`.**

---

## Done this session (context — do not reopen)

### Merged to `main` + pushed + Vercel production live
- Lane Racer optional **3D Chase** (Three.js lazy chunk), conditional early/late lane slide, soft atmosphere  
- Setup selection chrome: **no outline rings** — content activation only (Lane Racer, Game weather, Multiplayer weather/ops, Deploy Harvest archived UI)  
- Merge commit: `2c66828`; production deploy succeeded for that SHA

### Backlog (after weekend rotation — optional)
- Lane Racer 3D merge QA polish / roadside props / token readability / 3D rival (see `docs/lane-racer-3d-handoff.md`)  
- Do **not** start 3D backlog until weekend rotation is signed off unless user redirects

---

## Related docs

- `.claude/skills/weekend/SKILL.md` — **source of truth for this task**  
- `update_gp.md` — longer runbook (skill supersedes when they disagree)  
- `docs/lane-racer-3d-handoff.md` — 3D POC notes (not next)  
- Ignore `SESSION_NOTES.md` for GP rotation (stale Round-5 inline config)

---

## Note for the next agent

Start by confirming **Round 10 / Spa (Belgium)** with the user and requesting the Spa detail track map. Then run the weekend skill end-to-end on `main`. Commit locally; leave push to the user so Vercel deploys when they choose.
