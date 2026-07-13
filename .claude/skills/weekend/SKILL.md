---
name: weekend
description: Use when rotating the app to a new Grand Prix weekend — updating Free Practice, Grand Prix mode, and the Weekend Briefing to the next round on the F1 calendar (e.g. "update to round 10", "switch to Hungary", "new GP weekend").
---

# Grand Prix Weekend Rotation

Re-themes the app to the week's F1 circuit: Free Practice card, Grand Prix mode, and the `/grand-prix` Weekend Briefing all derive from one config. Follow the steps **in order** — asset decisions and the new-vs-existing-circuit check gate everything downstream.

**Templates (trust these over any docs):** the two most recent rotation commits.
- Existing circuit: `d17e8a0` (Round 9 / Silverstone)
- New circuit: `caad87e` (Round 8 / Austria)
- `SESSION_NOTES.md` is STALE (describes the old Round-5 setup with config inline in Game.tsx). Ignore it.

## Step 0 — Gather inputs (before touching code)

1. Round number, circuit, country. If the user only gives a round number, **confirm which circuit it is before starting** — the app's round numbering may not map cleanly to the real calendar, and the circuit choice gates the new-vs-existing path.
2. **Decide the path**: check whether the circuitId already exists in `SIM_LAP_COUNTS` in `client/src/lib/gameLogic.ts` (~line 73; 12 circuits as of July 2026).
   - Exists → skip Step 3.
   - New → Step 3 required, and you need 2 extra assets (flag + dark silhouette).
3. **Web-search the real prior-year race + qualifying results.** Full 20-driver classification with times/gaps for BOTH race and quali, plus circuit facts: official race name, first held, track length, laps, lap record (driver/time/year), most wins. **Never invent results** — verify against at least one authoritative source (formula1.com, Wikipedia race report).
4. **Asset intake**: if the user hasn't supplied a detail track map, ask for one. If supplied as `.avif` (or anything non-PNG), convert to `.png` (`sips -s format png in.avif --out out.png`) — WKWebView/iOS safety.

## Step 1 — Assets (`client/src/assets/`)

| Asset | Naming | Rendering rule |
|---|---|---|
| Detail map | `<circuitId>_detail_track.png` | Shown WITHOUT invert on the briefing page → must be a **colored/annotated** sector map (style of `austria_detail_track.png`: sector-coded, corner numbers, OVERTAKE/SPEED-TRAP/STRAIGHT labels) |
| Flag (new circuit only) | `flag_<country>.png` — named by **country**, not circuit (silverstone→`flag_uk.png`, monza→`flag_italy.png`); check `ls client/src/assets/flag_*` first, the country's flag may already exist | Shown as-is |
| Silhouette (new circuit only) | `circuit_<circuitId>.png` (recent convention, e.g. `circuit_austria.png`; older base circuits use `circuit_<id>_black.png` — don't rename those) | Hero cards apply `filter: invert(1)` → must be a **DARK** transparent-background silhouette (renders white on dark UI) |

Getting dark-vs-colored backwards is the classic mistake: `trackImage` (Step 2) = dark silhouette; `detailMapImage` (Step 4) = colored map.

## Step 2 — `client/src/lib/currentGrandPrix.ts`

The single config everything reads (Game.tsx builds FLAG/TRACK/MAP/RAIN lookups from `circuitId`). Update the asset imports and every `CURRENT_GRAND_PRIX` field:

- `round`, `circuitId`, `name` (UPPERCASE circuit), `country` (UPPERCASE)
- `trackImage` (dark silhouette import), `flagImage`
- `rainProbability` (circuit-realistic, e.g. Silverstone 0.45, Austria 0.35)
- `simLapCount` (real race lap count)
- `gradient` — CSS linear-gradient in the national flag's colors
- `welcomeBlurb` — one kid-friendly sentence ("This week we head to …")

## Step 3 — New circuit ONLY

Skip if the circuit already exists — **`SIM_LAP_COUNTS` in gameLogic.ts is the source of truth** (as of July 2026: suzuka, monaco, spa, silverstone, monza, melbourne, china, bahrain, canada, miami, barcelona, austria). Never re-add an existing one.

- `client/src/lib/gameLogic.ts`: add to `SIM_LAP_COUNTS` (real lap count) and append a `CIRCUITS` entry — mirror the austria entry: `{ id, name: "UPPERCASE", type: "Variables", description: "<venue, town>", mapUrl: "", paths: { s1: "", s2: "", s3: "" } }`.
- `client/src/pages/LaneRacer.tsx`: import the flag + silhouette, add entries to `FLAG_IMAGES` and `CIRCUIT_MAP_IMAGES` so the track drum renders.

## Step 4 — `client/src/lib/grandPrixHistory.ts`

Import the detail map, add a `GP_HISTORY[circuitId]` entry (keyed by circuitId, read by `GrandPrixInfo.tsx`):

- `officialName` — current-year official title (e.g. `'FORMULA 1 BRITISH GRAND PRIX 2026'`)
- `firstHeld`, `trackLength` (e.g. `'5.891 km'`), `laps`, `lapRecord: { driver, time, year }`, `mostWins: { driver, count }`
- `summary` — ~4 sentences of circuit history/character, kid-friendly
- `detailMapImage` — the colored map import
- `lastYear: { season: <prior year>, race: [...], quali: [...] }` — the verified results from Step 0. **Every entry needs all three fields `{ name, team, time }`** (the `Driver` type makes `team` required — omitting it fails `npm run check`). Race: 20 entries, winner gets full time (`'1:37:15.735'`), rest get gaps (`'+6.812'`), laps down (`'+1 lap'`), `'DNF'`/`'DNS'`. Quali: 20 entries with Q-times.

## Step 5 — Version bump (patch, all 4 spots)

e.g. 1.3.8 → 1.3.9:

1. `package.json` → `"version"`
2. `capacitor.config.ts` → `version`
3. `ios/App/App.xcodeproj/project.pbxproj` → **both** `MARKETING_VERSION` occurrences (~lines 380 and 405)

## Step 6 — Verify Web

1. `npm run check`
2. `npm run build`
3. Browser on :8081 (launch.json server `dev`): Welcome page Free Practice card (flag, silhouette renders white, blurb), Grand Prix hero, `/grand-prix` briefing (facts, colored map NOT inverted, last-year race + quali tables), and — new circuit only — the Lane Racer track drum.

## Step 7 — Deploy iOS

Always prefix cap commands with the locale vars:

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604   # iPhone 17 sim
```

## Step 8 — Commit (NO push)

Commit to `main`, message style of `d17e8a0`: title `Update Free Practice and Grand Prix to Round N / <Circuit>` + bullet body listing each file change and the version bump. **Never `git push` — the user pushes themselves.** Vercel auto-deploys from `main`.

## Common mistakes

| Mistake | Fix |
|---|---|
| Inventing last-year results | Web-search and verify both race AND quali, all 20 drivers |
| Colored image as `trackImage` (or dark as `detailMapImage`) | Silhouette = dark (gets inverted); detail map = colored (no invert) |
| Re-adding an existing circuit to gameLogic/LaneRacer | Check `SIM_LAP_COUNTS` first; existing circuits need only Steps 1–2, 4–8 |
| Bumping only one `MARKETING_VERSION` | The pbxproj has TWO (Debug + Release) |
| Shipping an `.avif` asset | Convert to `.png` for iOS/WKWebView |
| Pushing to remote | Commit only; the user runs `git push` |
| Following `SESSION_NOTES.md` | Stale — use the latest rotation commit as template |
