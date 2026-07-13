# Next Session Handoff — Universal Dynamic Difficulty

**Branch:** `main` (synced with `origin/main` as of handoff write)  
**Tip:** `c714aba` — Soft-follow Lane Racer 3D chase cam  
**Last updated:** 2026-07-12 (EOD)  
**Status:** Round 10 / Spa live (v1.3.9); 3D chase soft-follow on phone; next product push = difficulty UX

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

### First order of business (do this first)

**Make difficulty dynamic in every race mode — same model as Free Practice (PST) — and remove difficulty / series selection from setup UI.**

Players should no longer pick Karting / F3 / F2 / F1 (or equivalent) before racing. Questions adapt during the race from response time + accuracy via the existing dynamic-difficulty engine.

**Reference implementation (source of truth):** Free Practice / Pre-Season Testing in `Game.tsx` + `initDynamicDifficulty` / `updateDynamicDifficulty` in `client/src/lib/gameLogic.ts`.

---

## Design rule (locked intent)

| Before | After |
|--------|--------|
| Player selects series / difficulty at setup | No difficulty picker |
| Fixed difficulty for the whole race (most modes) | Difficulty adapts per answer like Free Practice |
| Setup chrome includes a series drum / driver-difficulty control | Remove those controls; keep track / ops / weather / other real choices |

**Start difficulty:** Confirm with user if every mode should boot from `beginner` (Karting), or from a stored “last achieved” hint. Free Practice today starts from the selected driver difficulty — with selection gone, default is almost certainly `beginner` unless product says otherwise.

---

## What Free Practice does today (copy this pattern)

1. On race start: `dynamicDifficultyRef.current = initDynamicDifficulty(startDifficulty)`
2. On correct / wrong: `updateDynamicDifficulty(...)` → updates `currentDifficultyRef` + HUD label
3. Questions generated with `currentDifficultyRef.current`
4. HUD shows live series label (Karting / F3 / F2 / F1 colors) from `dynamicDifficultyDisplay`
5. End state can record `difficultyAchieved`

Core API (`gameLogic.ts`):
- `initDynamicDifficulty(start)`
- `updateDynamicDifficulty(state, correct, responseTime, operationType, slowerThanBot?)`
- Rolling score thresholds promote / demote across `beginner → easy → medium → hard`

---

## Audit inventory — modes & UI to change

| Surface | Difficulty today | Action |
|---------|------------------|--------|
| **Free Practice (PST)** | Already dynamic | Keep as reference; remove any leftover series pick if still present on path in |
| **Career / solo (`Game.tsx`)** | Fixed from `selectedDriver` (series carousel) | Wire dynamic for full race; remove series / driver-difficulty selection from setup |
| **Grand Prix** | Dynamic only in Practice, then **locks** for Quali + Race | Confirm with user: stay lock-after-practice, or fully dynamic all weekend phases |
| **Multiplayer (`Multiplayer.tsx`)** | Fixed from host `selectedDriver`; questions pre-generated at that difficulty | Need server/client plan: dynamic mid-race means questions can’t all be pre-baked at one difficulty — confirm approach |
| **Lane Racer (`LaneRacer.tsx`)** | Setup series drum (`beginner`…`hard`); fixed for race | Add dynamic updates; remove series drum from combination-lock setup |
| **Deploy Harvest** (archived) | Series picker exists | Out of scope unless re-enabled |

### Likely UI removals / adjustments

- Career setup: series / driver difficulty carousel or chips  
- Lane Racer setup: middle “series” drum column (Karting→F1)  
- Multiplayer host setup: any series / difficulty control tied to `driverId`  
- Empty space: tighten layout after removing a drum/column (Lane Racer especially — may become 2-column track+team or track-only + math)  
- HUD: show live difficulty label in modes that didn’t before (match PST color treatment)  
- Copy: blurb / regulations text that says “pick your series”

### Progression / championship (open product question)

Career championship currently unlocks higher series by championing circuits. If series is no longer selected:

- Confirm whether championship progression still exists, changes meaning, or pauses  
- `championedCircuits` / circuit locks may need a redesign or temporary freeze  

**Do not rip out progression blindly — ask before deleting unlock logic.**

---

## Suggested implementation order

1. **Product confirms** (quick): GP lock-after-practice? MP question generation? Career championship? Start difficulty = beginner?  
2. **Extract or reuse** PST dynamic hooks cleanly (avoid copy-paste drift) — optional small helper used by Game + Lane Racer first  
3. **Career solo race** — dynamic on + remove series UI  
4. **Lane Racer** — dynamic on + remove series drum; keep rival estimate keyed off live/achieved difficulty or a neutral baseline  
5. **Grand Prix** — per confirmed rule  
6. **Multiplayer** — hardest; may need per-answer question generation or difficulty-tagged banks synced over WS  
7. `npm run check` + spot-check every mode setup + in-race HUD on phone + desktop  

---

## Acceptance for first order

1. No race mode’s primary setup asks the player to pick Karting / F3 / F2 / F1 (or equivalent)  
2. In-race difficulty adapts using the Free Practice algorithm (or an explicitly approved variant)  
3. HUD communicates current difficulty where it matters  
4. Lane Racer / Career / GP / MP still start and finish cleanly; leaderboards still get a `difficultyAchieved` (or agreed substitute)  
5. `npm run check` passes  

---

## Done this session (context — do not reopen without reason)

- Round 10 / Spa weekend rotation (v1.3.9); transparent Spa detail map; Weekend Briefing flag hairline  
- Lane Racer 3D: soft-follow chase cam on portrait (FOV widen rejected — cropped car + weak sign readability)  
- Selection chrome consistency earlier; 3D branch merged  

### Related

- Dynamic engine: `client/src/lib/gameLogic.ts` (`initDynamicDifficulty`, `updateDynamicDifficulty`)  
- PST wiring: `client/src/pages/Game.tsx` (search `isPreSeasonTesting` + `dynamicDifficultyRef`)  
- Lane Racer series drum: `client/src/pages/LaneRacer.tsx` setup block  
- Weekend skill: done for Spa; next calendar target after Spa is Hungary if rotating again  

---

## Note for the next agent

Start by confirming the open product questions (especially Grand Prix lock behavior, Multiplayer question sync, and championship progression). Then implement Career + Lane Racer first — highest UI impact, clearest PST parallel — before Multiplayer.
