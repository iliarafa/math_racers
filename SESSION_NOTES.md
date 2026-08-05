# Session Notes — 2026-08-05

Handoff summary of the latest work plus standing context future sessions will need. All facts below were verified against the code at commit `d20252a` (working tree clean).

## Open tasks (next session)

1. **Flashcards difficulty** — maybe "all purple to clear" is too strict; consider a softer clear condition.
2. **Flashcards polish** — see if there is room for more polish in the flashcards mode.
3. **Setup screen UIs** — update the LANE RACER and GRAND PRIX setup screens.
4. **Leaderboards scope (debate)** — consider limiting leaderboards to only the modes in the RACE WEEKEND menu.
5. **Quick Race UI** — push the sector grid down closer to the numpad and make the operation a bit bigger. (A first attempt at bigger-operation/smaller-grid was reverted — this asks for repositioning the grid *down*, not shrinking it.)
6. **Flashcards sounds** — treat the sounds for red / green / purple grades. Today there's only a two-tone beep (correct 880Hz / wrong 220Hz square wave in `playTone`, `DrivingSchool.tsx`) — purple and green sound identical; each grade should get its own sound.

## TL;DR

The app is at **v1.3.12** (`package.json` + `capacitor.config.ts` + both `MARKETING_VERSION`s agree), themed to **Round 12 / Netherlands (Circuit Zandvoort)**, pushed to `main` (`221b9ad`), synced to the iOS project, and deployed to the iPhone 17 simulator. Today's work, in order:

1. **Quick Race** — one-tap 20-question Adaptive race on the current GP circuit (`e2136ec`).
2. **Two-level Paddock menu** — later reshuffled: Lane Racer under DRIVING SCHOOL, RACE WEEKEND = Practice/Qualify/Race, quick-race card labeled **RACE NOW** (`04bbc32`).
3. **Driving School** — 10 gated flashcard stages + Reaction Test (`a22e9d5`); flashcards are now **real cards**: square-cornered fixed-size card that lights up purple/green/red with the grade inside (`d0345b0`, `221b9ad`).
4. **Regulations fully resynced** to current mechanics (`04bbc32`).
5. **Quick Race UX**: tap the map/grid to switch views (no header chip), big side-by-side 4×5 YOU/BOT sector grids in the center slot (`c1dc82e`), first-run onboarding card (`71b00ad`), TRACK LIMITS flash moved off the timer + red map ring removed (`33f492a`).
6. **Zandvoort rotation** (`4d7d282`, `960e093`) — see rotation notes below; the map ribbon/gap saga is instructive: the source art's corridors are only 14–25px (2700px scale), so ribbon thickness had to be *reduced* (8px erosion) to keep true gaps; sector 1 starts at the S/F line.

---

## Latest session: feature details

### Paddock menu (`client/src/pages/Hub.tsx`)
Two-level structure (see the comment at `Hub.tsx:94`):
- **Menu A:** Weekend Briefing (Hungary card) · RACE NOW ("Hungaroring · 20 LAPS" — the quick-race card) · RACE WEEKEND ("PRACTICE · QUALIFY · RACE") · DRIVING SCHOOL ("FLASHCARDS · REACTION · ARCADE") · GARAGE
- **RACE WEEKEND →** Free Practice, Grand Prix
- **DRIVING SCHOOL →** Flashcards (`/driving-school`), Reaction Test (`/reaction`), Lane Racer (`/lane-racer`)
- Reflex/Reaction was removed from the Garage.

### Quick Race — the "RACE NOW" card (`client/src/pages/Game.tsx`)
- Route `/game/quick-race` (Game.tsx reads the `:mode` route param; the old mode_select screen is gone — other modes are `/game/free-practice` and `/game/grand-prix`).
- Skips setup entirely: initial `gameStatus` is `'countdown'`.
- Config: current GP circuit via `createQuickRaceCircuit` (built from `CURRENT_GRAND_PRIX`), **Addition**, **dry** weather, **Adaptive** difficulty, `RACE_LENGTH` = 20 questions.
- **Power-ups:** `powerUpsEnabled = isGrandPrix` (Game.tsx:448) — ON for all Grand Prix phases, OFF for Quick Race and Free Practice. The old Garage toggles for Realism/Power-Ups are gone (`Garage.tsx` has no references).

### Driving School (`client/src/pages/DrivingSchool.tsx`, `client/src/lib/drivingSchool.ts`)
- **10 gated stages** (`DRIVING_SCHOOL_STAGES`): Addition →10/→20, Subtraction →10/→20, Multiplication →5/→8/→10, Division →5/→8/→10. Stage N+1 unlocks when N is cleared.
- **20 cards per stage** (`CARDS_PER_STAGE`). Cards grade purple (correct within `botTime × PURPLE_TIME_FACTOR`), green (correct but slower), red (wrong). Non-purple cards are re-queued; **a stage clears only when every card is purple**.
- `PURPLE_TIME_FACTOR = 1.0` (loosened in `d20252a`).
- Progress persists in localStorage key `drivingSchoolHighestCleared`.
- Questions come from `generateQuestion(...)` with a per-stage operation override.
- Design spec: `docs/superpowers/specs/2026-08-05-driving-school-design.md`; plan: `docs/superpowers/plans/2026-08-05-driving-school.md`.

---

## Standing context (accumulated since spring; still current)

### Weekly GP rotation
- `client/src/lib/currentGrandPrix.ts` holds `CURRENT_GRAND_PRIX` — currently **round 12, `circuitId: 'zandvoort'`, Circuit Zandvoort, rainProbability 0.40, simLapCount 72**, Dutch-flag gradient. This is the single config for Race Now, Free Practice, Grand Prix, and the Weekend Briefing.
- **New circuits need more than the skill doc says** (Zandvoort commit `4d7d282` is the worked example): an entry in `CIRCUIT_MENU_ART` (`circuitMenuArt.ts` — required or the GP-locked track row is empty), a live-map centerline in `circuitPathData.json` via `npx tsx script/extractCircuitCenterline.ts <id>` (add the ~700px silhouette to its `ASSET_BY_ID` first), and the silhouette in `CIRCUIT_IMAGES` (`circuitPaths.ts`). QA maps at `/dev/circuit-maps`.
- `client/src/lib/grandPrixHistory.ts` feeds the Grand Prix info page (`/grand-prix`, `GrandPrixInfo.tsx`) with podium/quali data.
- **Use the `/weekend` skill** (`.claude/skills/weekend`) — it's the rotation runbook (assets, `SIM_LAP_COUNTS`, version bump, deploy).
- `mapStageClass` on `CURRENT_GRAND_PRIX` is deliberately `undefined` — all menu silhouettes share `DEFAULT_MAP_STAGE_CLASS`; fix thin/square circuits in the asset, not with a per-circuit size boost.

### Paywall is disabled — app is free
- `client/src/contexts/PurchaseContext.tsx` hardcodes `isPremium: true` with no-op purchase/restore stubs (commit `ccafb3d`, June 2026). The RevenueCat plugin stays installed but is never called; `Paywall.tsx` and the `'paywall'` game status remain latent for easy revert.

### Difficulty & math engine
- Shared server-safe question engine: `shared/mathEngine.ts` — imported by both `client/src/lib/gameLogic.ts` and `server/websocket.ts`. Multiplayer difficulty syncs dynamically from the server.
- Kid-facing **Adaptive vs Locked** difficulty choice exists across Free Practice, Lane Racer, and Multiplayer; Adaptive races start from beginner and adapt live.

### Lane Racer 3D
- Optional Three.js chase-cam view with 2D fallback: `client/src/components/lane-racer/` (`LaneRacerCanvas3D.tsx`, `LaneRacerScene.tsx`, `atmosphere.ts`) + `client/src/lib/laneRacerController3d.ts`. Builds as its own ~916 kB chunk.

### Routes (`client/src/App.tsx`)
`/` Welcome · `/hub` Paddock · `/game/:mode` (+bare `/game`) · `/garage` · `/strategy` · `/grand-prix` GP info · `/driving-school` · `/reaction` · `/multiplayer` · `/regulations` · `/racer-log` · `/leaderboard` · `/lane-racer` · `/dev/circuit-maps` (dev tool). `DeployHarvest` route is commented out (archived).

### Leaderboard DB (Supabase)
- Project ref **`pslagmyvlvrpwnbhwqpp`** (`math-racer`, org "Math", us-east-1, $10/mo) — URL + anon key in `client/src/lib/supabase.ts`. Tables: `pst_leaderboard`, `lane_racer_leaderboard`, `gp_leaderboard` (RLS on; public SELECT+INSERT only). The pre-May-2026 history is gone (old project deleted); boards repopulate as people play.

---

## Operational notes (read before building/deploying)

### Mobile / Capacitor (iOS) — verified working today
```
npm run build
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604
```
- **CocoaPods/Ruby gotcha:** cap commands fail with `Encoding::CompatibilityError (ASCII-8BIT)` without the UTF-8 `LANG`/`LC_ALL` prefix.
- Simulator: **iPhone 17, UDID `A1301ED4-C124-4695-9A60-D05ACF4B4604`** (iOS 26.5).
- App: `live.mathracer.app` ("Math Racer"), web dir `dist/public`, one plugin (`@revenuecat/purchases-capacitor`).

### Dev server
- `npm run dev` = full app (Express + Vite middleware) on **port 8081** (`PORT=8081` is baked into the script). `dev:client` (Vite-only, port 5000) collides with macOS AirPlay on this machine.
- `.claude/launch.json` (uncommitted) has a `dev` entry on 8081 plus a `lane-racer` entry pointing at the sibling `../lane-racer` sandbox repo on port 5181.

### Git / push
- Pushing to `main` can be blocked by the harness's auto-mode classifier; **the user authorizes/runs the push**.

---

## Watch-outs
- `client/src/pages/DeployHarvest.tsx` is archived (unrouted) but still compiles; revisit its `'miami'`/`'Ratios'` string args if re-enabled.
- Chunk-size warnings on build (`index` ~1.0 MB, `LaneRacerCanvas3D` ~0.9 MB) are known and tolerated.
