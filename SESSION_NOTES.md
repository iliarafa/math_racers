# Session Notes — 2026-08-06

Handoff summary of the latest work plus standing context future sessions will need. All facts below were verified against the code at commit `695c3ba` (working tree clean, pushed to `main`, synced + deployed to the iPhone 17 simulator).

## Open tasks (next session)

1. **Finalize the setup-card width** — the setup menus' card went 350→292→272px (md 500→420→372) while aligning the circuit art's straight with the station tiles; treat the current numbers as a draft and settle the final width/art size. The coupling: art height drives its rendered width (`h × naturalW/naturalH`); tiles' right edge meets the art's right edge only at matching card widths (see `RaceSetupCard.tsx` — card width class + the `h-40 md:h-56` art stage class change together).
2. **Flashcards polish** — see if there is room for more polish in the flashcards mode.
3. **Leaderboards scope (debate)** — consider limiting leaderboards to only the modes in the RACE WEEKEND menu.
4. **Quick Race UI** — push the sector grid down closer to the numpad and make the operation a bit bigger. (A first attempt at bigger-operation/smaller-grid was reverted — this asks for repositioning the grid *down*, not shrinking it.)
5. **Superlicence reward screen (idea, not committed)** — a stamped superlicence card as the school-completion celebration; the mockup direction exists from the school-page redesign round.
6. **Weekend rotation** — Zandvoort (round 12) is still current; the next `/weekend` rotation is due whenever the calendar moves on.

## TL;DR

The app is at **v1.3.12** (no version bump today — those happen with GP rotations), themed to **Round 12 / Netherlands (Circuit Zandvoort)**. Today (31 commits, `2e2d7e7..47457ff`) built the **Driving School ecosystem** and spread its track-path design language across the app:

1. **Flashcards session redesign** — per-grade F1 sounds, landscape 5:3 card, LAP counter, purple-majority clearing, chevron-only exit.
2. **Driving School licence path** — soft-gated story: flashcards → reaction (<0.33s) → beat the instructor in Lane Racer; COMPLETED badge on the Paddock card.
3. **Driving School page identity** — track-path layout (rail, sector nodes, checkered finish), white logo, hand-drawn kerb backdrop, no video, superlicence caption.
4. **Setup screens as track paths** — all four modes' setup cards restyled: settings are numbered stations ending at THE GRID.
5. **Free Practice selectable length** — 25/50/100 laps; only 100 posts to the leaderboard.
6. **Paddock order** — DRIVING SCHOOL now sits above RACE WEEKEND.

An in-scene Lane Racer rival car was tried and reverted (see licence-path notes).

---

## Latest session: feature details

### Paddock menu (`client/src/pages/Hub.tsx`)
- **Menu A order:** Weekend Briefing (Zandvoort card) · RACE NOW ("ZANDVOORT · 20 LAPS") · DRIVING SCHOOL · RACE WEEKEND ("PRACTICE · QUALIFY · RACE") · GARAGE (`7998692`).
- **RACE WEEKEND →** Free Practice, Grand Prix. **DRIVING SCHOOL →** the licence path view (below).
- **Driving School view** (`view === 'school'`): track-path layout — vertical rail (ribbon + dashed centerline) with sector nodes (done ✓ purple / current yellow number / upcoming dashed), glass cards per mode, checkered FINISH LINE node ("SCHOOL COMPLETED" in green when the licence is earned). White logo (`attached_assets/logo-white.svg`), hand-drawn kerb backdrop (`attached_assets/driving-school-bg.jpg`, 55% over black), thin caption "COMPLETE TO EARN YOUR SUPERLICENCE". The background video is hidden+paused on this view via a `hubSchoolViewChange` event consumed by `PersistentVideo` in `App.tsx` (menu music unaffected).
- Lane Racer's school card reads "SECTOR 3 · BEAT THE INSTRUCTOR".

### Driving School licence path (`client/src/lib/drivingSchoolLicence.ts`)
- **Soft gating** (nothing locked): 1. clear all 10 flashcard stages → 2. Reaction Test best **< 0.33s** (`REACTION_LICENCE_MS = 330`) → 3. **P1 in any completed Lane Racer race** (finish time under the rival target, any circuit/difficulty).
- localStorage: `reactionBestMs` (min kept, written by `ReactionTest.tsx`, licence line shown under the launch button), `laneRacerP1Win` (`'1'`, written by the finish effect in `LaneRacer.tsx`; results screen shows "P1 · Beat the rival" + one-time licence note); flashcards derive from `drivingSchoolHighestCleared >= 10`. `getLicenceStatus()` derives everything — no stored aggregate.
- DRIVING SCHOOL Paddock card gets a green COMPLETED pill when all three are done.
- **Rival representation: progress-strip marker only.** An in-scene rival car (2D+3D) was tried (`647fd45`) and reverted (`7574f9c`) — its "drift to the lane farthest from the player" rule produced an endless distracting lane-swap dance. The rival lives on the progress strip (marker car, P1/P2, strip color); the licence P1 detection is independent and unaffected.

### Flashcards (`client/src/pages/DrivingSchool.tsx`, `client/src/lib/drivingSchool.ts`)
- **10 gated stages**, 20 cards each. Grades: purple (within `botTime × PURPLE_TIME_FACTOR`, factor 1.0), green (correct but slower), red (wrong).
- **Clear rule: purple majority** — ≥15/20 purple (`PURPLE_MAJORITY`) and no reds; greens allowed (`isStageCleared`, `4f2ccbb`). Otherwise all non-purple re-drill; each pass is a LAP (numbered continuously). Cleared screen: PERFECT at 20/20, STAGE CLEARED + tally otherwise. Stage list states the rule.
- **Session UI:** landscape 5:3 card spanning the column (container-query `cqh` type scaling for short viewports; note cqh on the container element itself resolves against the viewport, so sizes live on children), static counter row CARD n/m · LAP n · purple tally (only the card animates — slide + grade pulse merged on one motion.div), chevron-only exit (GameLayout gained `onBack`), centered logo (no header chip).
- **Per-grade sounds** (`playGradeSound`, shared `getAudioContext()` from `uiSound.ts`): purple = rising sine sweep 600→1200Hz + 1319Hz blip, green = triangle ding, red = detuned penalty buzzer.
- Progress persists in `drivingSchoolHighestCleared`.

### Setup screens as track paths (`client/src/components/setup/RaceSetupCard.tsx`, `SetupRow.tsx`)
- Inside the shared setup card, every setting row is a **numbered station** on a rail (mini glass card + node), readouts (GP LAPS) are dot stations, and the start button is the final checkered **THE GRID** station (`c415d0b`). Tap-to-cycle unchanged; `SetupRow` gained a `bare` prop (no border when framed by a station). All four modes (FP/GP/Lane Racer/Multiplayer host settings) inherit it with no caller changes.
- **Header (later that day, `066dfa3`→`695c3ba`):** the full-width map band is gone — eyebrow across the top, title (nowrap, may overlay the art's empty frame) over a large rounded flag on the left, circuit art on the right in a 68%-wide box pulled left (`-ml-[24%]`) so it sneaks under the title; "?" absolute in the corner. Card narrowed to **272px (md 372px)** with art at **`h-40 md:h-56`** so the art's right straight sits ~flush (≈4px) with the station tiles' right edge. Art size and card width are coupled (see open task 1); an `object-right` approach was tried and reverted (`ee60d45`/`b439552`) — it reopened the flag↔art gap. `DEFAULT_MAP_STAGE_CLASS` is no longer used by this card (local `h-40 md:h-56` default).

### Free Practice session length (`client/src/pages/Game.tsx`, `47457ff`)
- LAPS is a real station: 25/50/100 (`FP_LAP_OPTIONS`), persisted as `freePracticeLaps`, default 100; `raceLength` reads it for FP.
- **Only 100-lap sessions submit to the PST leaderboard** (gate in the finish branch) — shorter sprints skew the rate-based score. Help text says so. GP laps stay a readout.

---

## Standing context (accumulated since spring; still current)

### Weekly GP rotation
- `client/src/lib/currentGrandPrix.ts` holds `CURRENT_GRAND_PRIX` — currently **round 12, `circuitId: 'zandvoort'`, Circuit Zandvoort, rainProbability 0.40, simLapCount 72**, Dutch-flag gradient. Single config for Race Now, Free Practice, Grand Prix, and the Weekend Briefing.
- **New circuits need more than the skill doc says** (Zandvoort commit `4d7d282` is the worked example): an entry in `CIRCUIT_MENU_ART` (`circuitMenuArt.ts` — required or the GP-locked track row is empty), a live-map centerline in `circuitPathData.json` via `npx tsx script/extractCircuitCenterline.ts <id>` (add the ~700px silhouette to its `ASSET_BY_ID` first), and the silhouette in `CIRCUIT_IMAGES` (`circuitPaths.ts`). QA maps at `/dev/circuit-maps`.
- `client/src/lib/grandPrixHistory.ts` feeds the Grand Prix info page (`/grand-prix`).
- **Use the `/weekend` skill** (`.claude/skills/weekend`) — the rotation runbook (assets, `SIM_LAP_COUNTS`, version bump, deploy).
- `mapStageClass` on `CURRENT_GRAND_PRIX` is deliberately `undefined` — all menu silhouettes share `DEFAULT_MAP_STAGE_CLASS`; fix thin/square circuits in the asset, not with a per-circuit size boost.

### Paywall is disabled — app is free
- `client/src/contexts/PurchaseContext.tsx` hardcodes `isPremium: true` with no-op purchase/restore stubs (commit `ccafb3d`, June 2026). RevenueCat stays installed but is never called; `Paywall.tsx` and the `'paywall'` game status remain latent for easy revert.

### Difficulty & math engine
- Shared server-safe question engine: `shared/mathEngine.ts` — imported by both `client/src/lib/gameLogic.ts` and `server/websocket.ts`. Multiplayer difficulty syncs dynamically from the server.
- Kid-facing **Adaptive vs Locked** difficulty choice exists across Free Practice, Lane Racer, and Multiplayer; Adaptive races start from beginner and adapt live.

### Lane Racer 3D
- Optional Three.js chase-cam view with 2D fallback: `client/src/components/lane-racer/` (`LaneRacerCanvas3D.tsx`, `LaneRacerScene.tsx`, `atmosphere.ts`) + `client/src/lib/laneRacerController3d.ts`. Builds as its own ~916 kB chunk.

### Routes (`client/src/App.tsx`)
`/` Welcome · `/hub` Paddock · `/game/:mode` (+bare `/game`) · `/garage` · `/strategy` · `/grand-prix` GP info · `/driving-school` · `/reaction` · `/multiplayer` · `/regulations` · `/racer-log` · `/leaderboard` · `/lane-racer` · `/dev/circuit-maps` (dev tool). `DeployHarvest` route is commented out (archived).
- Background video (`PersistentVideo`) shows on `/hub`, `/game`, `/lane-racer` when not racing — except the Hub's school view (see above).

### Leaderboard DB (Supabase)
- Project ref **`pslagmyvlvrpwnbhwqpp`** (`math-racer`, org "Math", us-east-1, $10/mo) — URL + anon key in `client/src/lib/supabase.ts`. Tables: `pst_leaderboard`, `lane_racer_leaderboard`, `gp_leaderboard` (RLS on; public SELECT+INSERT only). Pre-May-2026 history is gone (old project deleted); boards repopulate as people play.

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
- `npm run dev` = full app (Express + Vite middleware) on **port 8081** (`PORT=8081` baked into the script). `dev:client` (Vite-only, port 5000) collides with macOS AirPlay on this machine.
- `.claude/launch.json` (uncommitted) has a `dev` entry on 8081 plus a `lane-racer` entry pointing at the sibling `../lane-racer` sandbox repo on port 5181.
- HMR websocket fails through the 8081 proxy (console noise, harmless) — full-reload after edits when verifying in a browser.

### Git / push
- Pushing to `main` can be blocked by the harness's auto-mode classifier; **the user authorizes the push** (today's explicit "push it" worked directly).

---

## Watch-outs
- `client/src/pages/DeployHarvest.tsx` is archived (unrouted) but still compiles; revisit its `'miami'`/`'Ratios'` string args if re-enabled.
- Chunk-size warnings on build (`index` ~1.0 MB, `LaneRacerCanvas3D` ~0.9 MB) are known and tolerated.
- Spelling is **"superlicence"/"licence"** (British, matching FIA) across school copy — keep new copy consistent.
