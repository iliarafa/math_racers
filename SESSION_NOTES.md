# Session Notes — 2026-09-18

Handoff summary plus the standing context future sessions need. The rewards work below was built on branch `feature/v1.4-rewards` and **merged into `main` to ship in 1.3.15**: on 2026-09-18 the user decided not to hold it for a 1.4. Weekly `/weekend` rotations continue on `main` (1.3.16, 1.3.17, …). The original plan is `~/.claude/plans/we-have-already-finished-buzzing-nebula.md`.

## Shipped in 1.3.15 on top of the Baku rotation (`npm test` and `tsc` clean)

1. **GameState clobber fix** (`fb4d562`): the saved blob is the source of truth; every mutator goes through `mutateGameState`; instances subscribe to saves, and a reset is broadcast to all of them. Before this, tapping mute after a race could erase the local bests the race had just saved.
2. **Rewards**: trophies (`lib/trophies.ts`), daily streak (`lib/dailyStreak.ts`), fact mastery (`lib/factMastery.ts`), persisted in `GameState`; settled by one effect in `Game.tsx`; shown by `RewardStrip` on all finish screens, `TrophySplash` on Race Day (after the leaderboard name prompt, never over it), the `/trophies` page (`TrophyCabinet.tsx`), a streak chip and "N new" pill on the Hub, a Trophies tile on the Garage. A finished multiplayer race also counts toward the streak. Verified in the browser: Quick Race → First Win badge + Day 1 streak; full GP weekend with pole + win → gold `gp:2026:15:baku`.
3. **Cleanup** (`f18ecfd`): DeployHarvest, TrackProgress, the legacy Express leaderboard routes/storage/tables, `update_gp.md` and the Madrid handoff are gone; CLAUDE.md corrected (no championship/Career mode exists). `tablesFilter` in `drizzle.config.ts` keeps `db:push` from dropping the three legacy tables still in Supabase.
4. **Version single source** (`25f6c8b`): `npm run version:bump <x.y.z>` rewrites package.json, the lockfile, capacitor.config.ts and both Xcode `MARKETING_VERSION`s, and sets both build numbers to the higher one + 1; the Garage footer shows `__APP_VERSION__`. This release is **1.3.15 (2)**: the version stayed and the build number went from 1 to 2, so a second 1.3.15 upload is accepted.
5. **Desktop menu frame** (`8af6e5f`): `.menu-frame` (520px, centred, `zoom: 1.15`) under `html[data-desktop]`; `GameLayout menuFrame` + the Hub/Garage wrappers. Phone/iPad untouched.
6. **Pre-merge review fixes**: an adversarial review before the merge found the splash-over-name-prompt bug, the un-broadcast reset and the missing multiplayer streak (all fixed), plus smaller model fixes: fact-store eviction never drops this session's facts, a zero-count streak can't swallow a day, milestone badges come back in registry order, and the streak DST test is pinned to Europe/London.

## Open tasks

1. **Quick Race HUD** (phone layout): push the sector grid down closer to the numpad and make the operation a bit bigger. An earlier bigger-operation/smaller-grid attempt was reverted; reposition the grid *down*, don't shrink it. Do it with the user, one screenshot at a time (they chose "later this week" on 2026-09-18).
2. **Flashcards polish**: walk `/driving-school` together and list issues one screen at a time.
3. **Release**: `main` is committed but not pushed; push only when the user says "push it" (Vercel deploys the web build from `main`). iOS: build and upload 1.3.15 (2). If 1.3.15 is already live on the App Store, Apple needs a higher version: run `npm run version:bump 1.3.16` first.
4. **Leaderboards scope (debate)**: deferred; not part of this release.
5. **Weekend rotation** on `main`: Baku (Round 15) is current. Run `/weekend` when the calendar moves on.

### Working in a worktree
`preview_start` runs the **main checkout's** server even from the worktree; start the branch's server with a background `npm run dev` from the worktree and open the pane with `preview_start {url}`. Server/vite-config changes need a `pkill -f "tsx server/index.ts"` + restart.

## TL;DR (main)

The app is at **v1.3.15**, themed to **Round 15 / Azerbaijan (Baku City Circuit)**. The latest session (2026-09-17/18) rotated the app from Madrid to Baku. Baku is a new circuit, so it took the full new-circuit path, plus two small generalisations that make future rotations config-only:

1. **Baku rotation** (`5397f64`): config, circuit data, history, live-map centerline and four assets. Shipped inside 1.3.15, with no version bump.
2. **`setupTrackImage`** on `CURRENT_GRAND_PRIX` replaces a hardcoded `circuitId === 'madrid'` branch in `Game.tsx` that picked the setup-card art.
3. **`bannerTextColor`** on `CURRENT_GRAND_PRIX` replaces the paddock Weekend Briefing banner's hardcoded dark text (`2aa006b`). Baku uses white.
4. Most Wins shows **Max Verstappen — 2 wins** (`2439450`). He is tied with Pérez on 2; the user chose Verstappen.
5. Baku source art committed in `baku-assets/` (`9ee6a45`).

---

## Latest session: Round 15 / Baku

### Config (`client/src/lib/currentGrandPrix.ts`)
- `round: 15`, `circuitId: 'baku'`, `name: 'BAKU'`, `circuitName: 'Baku City Circuit'`, `country: 'AZERBAIJAN'`, `rainProbability: 0.15`, `simLapCount: 51`, blue-red-green gradient.
- **New field `setupTrackImage`**: the stripped full-colour map (sector ribbon and start line, no corner labels) shown un-inverted on the Free Practice / Grand Prix setup card. When it's omitted, the card falls back to the briefing's `detailMapImage`, then to the dark silhouette.
- **New field `bannerTextColor`**: the text colour on the paddock Weekend Briefing banner. Use `#1a1a1a` for light or yellow gradients (Madrid) and `#ffffff` for saturated ones (Baku). Any non-dark value gets a soft `0 1px 2px rgba(0,0,0,0.35)` text shadow in `Hub.tsx`, so white stays legible over light stops.
- Both fields are listed in Step 2 of the `/weekend` skill.

### New-circuit wiring
- `gameLogic.ts`: `SIM_LAP_COUNTS.baku = 51` and a `CIRCUITS` entry.
- `circuitMenuArt.ts`: `baku` uses `baku_setup_track.png` with `invert: false`, the same treatment as Madrid.
- `circuitPaths.ts`: silhouette added to `CIRCUIT_IMAGES`.
- `circuitPathData.json`: centerline generated by `npx tsx script/extractCircuitCenterline.ts baku`. `baku` was added to `ASSET_BY_ID` and to the geom-mid branch, because the silhouette is a thick ribbon. QA'd at `/dev/circuit-maps`.

### History (`client/src/lib/grandPrixHistory.ts`)
- `officialName` 'FORMULA 1 AZERBAIJAN GRAND PRIX 2026', `firstHeld` 2017, 6.003 km, 51 laps.
- Lap record: Charles Leclerc, 1:43.009 (2019). Most wins: Max Verstappen, 2.
- `lastYear` holds the full 2025 race classification (Verstappen won in 1:33:26.408; Piastri DNF) and the full qualifying order (Piastri, Leclerc and Bearman "No time"; Ocon "DSQ"), sourced from Wikipedia's 2025 Azerbaijan GP report.

### Assets (`client/src/assets/`)
- `circuit_baku.png`: dark silhouette, 700px wide.
- `flag_azerbaijan.png`
- `baku_detail_track.png`: labelled colour map for the briefing.
- `baku_setup_track.png`: stripped colour map for the setup cards.

A new circuit now needs **four** images: silhouette, flag, labelled detail map and stripped setup map. Originals are in `baku-assets/`.

---

## Standing context

### Weekly GP rotation
- `CURRENT_GRAND_PRIX` in `client/src/lib/currentGrandPrix.ts` is the single config for Race Now, Free Practice, Grand Prix, the Weekend Briefing and Regulations Art. 7.
- **Use the `/weekend` skill** (`.claude/skills/weekend/SKILL.md`). The best new-circuit template is `5397f64` (Baku), with `4d7d282` (Zandvoort) as the older example.
- `SIM_LAP_COUNTS` in `gameLogic.ts` is the source of truth for which circuits exist.
- `LOCK_MENU_TO_CURRENT_GP = true` (`circuitMenuArt.ts`): Lane Racer and Multiplayer show only the current GP's track.
- `mapStageClass` is deliberately `undefined`. Fix thin or square circuits in the asset, not with a per-circuit size boost.

### Driving School and the Superlicence
- **Flashcards** (`lib/drivingSchool.ts`): 10 stages of 20 cards.
  - Purple means correct within `PURPLE_TIME_FACTOR` **1.5×** the expected bot time; green means correct but slower; red means wrong.
  - A stage clears with at least `PURPLE_MAJORITY` (15) purples and no reds.
- **Licence** (`lib/drivingSchoolLicence.ts`) needs all three:
  1. All 10 flashcard stages cleared.
  2. A Reaction Test best under `REACTION_LICENCE_MS` **400 ms**.
  3. A P1 in Lane Racer.
- **Grand Prix is locked until the licence is earned.** In `Hub.tsx`, `gpOpen = licence.complete || grandPrixDevBypass()`, and the card says "Graduate Driving School" while it's locked. Earning the licence shows the one-time `SuperlicenceSplash`.

### Leaderboard (Supabase project `pslagmyvlvrpwnbhwqpp`)
- The client writes directly to three tables via `client/src/lib/supabase.ts`:
  - `fp_leaderboard`: 100-lap Free Practice only.
  - `gp_weekend_leaderboard`: GP Race Day.
  - `quick_race_leaderboard`: every finished Quick Race.
- All three exist in the live project.
- The older tables `pst_leaderboard`, `lane_racer_leaderboard` and `gp_leaderboard` are still in the database but unused by the client.
- **Local tier:** every finished FP (25/50/100 laps, `FP_LAP_OPTIONS`) and GP session records a personal best in `state.localBests` (`lib/localBests.ts`). `/leaderboard` shows a "Your Best" card above the global list.

### Paywall is disabled — the app is free
- `client/src/contexts/PurchaseContext.tsx` hardcodes `isPremium: true`. RevenueCat stays installed but is never called.

### Web and desktop builds (same bundle as iOS)
- `lib/webMeta.ts` handles per-route title/theme and the `data-web` hover gating.
- `lib/layoutMode.ts` and `hooks/use-layout-mode.ts` handle the desktop layout, whose race screens live in `components/desktop/`.
- `lib/orientationLock.ts` holds the iPad landscape lock for Race Weekend.
- Details are in `CLAUDE.md`.

### Engine and Lane Racer
- `shared/mathEngine.ts` is shared by `client/src/lib/gameLogic.ts` and `server/websocket.ts`.
- Lane Racer 3D lives in `client/src/components/lane-racer/` plus `lib/laneRacerController3d.ts`.

### Routes (`client/src/App.tsx`)
`/` Welcome · `/hub` Paddock · `/game/:mode` (+bare `/game`) · `/garage` · `/strategy` · `/grand-prix` Weekend Briefing · `/driving-school` · `/reaction` · `/multiplayer` · `/regulations` · `/racer-log` · `/trophies` Trophy cabinet · `/leaderboard` · `/lane-racer` · `/dev/circuit-maps` (dev tool).

---

## Operational notes

### iOS / Capacitor
```
npm run build
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
```
- Without the UTF-8 `LANG`/`LC_ALL` prefix, cap commands fail with a CocoaPods `Encoding::CompatibilityError`.
- Simulator: **iPhone 17, UDID `A1301ED4-C124-4695-9A60-D05ACF4B4604`**, on the iOS 26.5 runtime.
- App `live.mathracer.app` has two Capacitor plugins: `@capacitor/screen-orientation` and `@revenuecat/purchases-capacitor`.
- **Simulator on this Mac (Xcode 27.0, build 27A266a):** `Simulator.app` is not on disk, so `cap run ios` can't deploy and `open -a Simulator` fails.
  - Build and install directly instead:
    ```
    xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'id=<udid>' -derivedDataPath <dir> build
    ```
    Then install `<dir>/Build/Products/Debug-iphonesimulator/App.app` with `xcrun simctl install` (or the Claude simulator panel's `launch` action).
  - The Claude simulator panel was unavailable on 2026-09-17, failing with a misleading "Xcode is installed but not selected". On 2026-09-18 it worked with nothing changed on the Mac. Don't run the `sudo xcode-select` it suggests.
  - The app registers no URL scheme, so it can't be deep-linked past the splash.

### Dev server
- `npm run dev` runs the full app (Express + Vite) on **port 8081**. `.claude/launch.json` is committed and has a `dev` entry for it.
- `dev:client` (Vite-only, port 5000) collides with macOS AirPlay on this machine.

### Git / push
- Commit to `main`. Push only when the user says "push it". That instruction covers that one push, not later ones.

---

## Watch-outs
- Chunk-size warnings on build (`index` ~1.1 MB, `LaneRacerCanvas3D` ~0.9 MB) are known and tolerated.
- Spelling is **"superlicence"/"licence"** (British, matching the FIA). Keep new copy consistent.
