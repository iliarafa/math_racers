# Session Notes — 2026-05-20

Handoff summary of changes made this session, plus context future sessions will need. All facts below were verified against the code/DB at the end of the session.

## TL;DR

Shipped to `main` and deployed to the iPhone 17 simulator:
1. **Grand Prix & Free Practice retheme: Miami → Canada (Montreal).**
2. **Career mode removed entirely; Ratios math type dropped.**
3. **Grand Prix leaderboard** added (with a real score) as a tab, and the **leaderboard database was rebuilt** on a new Supabase project (the old one had been deleted).

Then shipped:
4. **Lane Racer & Multiplayer: added Miami + Canada tracks**; the Leaderboard's Lane Racer circuit filter now lists Miami + Canada. (commit `3186ff8`)
5. **Math operation is now player-selected (not locked to the track)** in **both Lane Racer** (a 4th "MATH" drum — `3186ff8`) **and Multiplayer** (an operation selector on the race-setup screen — latest commit).

Commits on `main` (pushed):
- `2d87db3` — Remove Career mode and Ratios; switch Grand Prix & Free Practice to Canada (also reorders the SELECT MODE menu and fixes the Regulations text).
- `1b3008e` — Add Grand Prix leaderboard with scoring; move leaderboards to a new Supabase DB.
- `972d61c` — Add session notes / handoff doc.
- `3186ff8` — Add Miami & Canada tracks to Lane Racer + Multiplayer; player-chosen Lane Racer operation.
- (latest) — Multiplayer: player-chosen operation + this doc update.

---

## ⚠️ Most important context: the leaderboard database was replaced

The old Supabase project hardcoded in the app (`rzvpuvejsrfcugeqnadq`) was **deleted** (its subdomain returns NXDOMAIN). That had silently broken **all three** leaderboards (Free Practice, Lane Racer, Grand Prix) in the published app.

A new Supabase project was created and the app repointed to it:
- **Project:** `math-racer`, ref **`pslagmyvlvrpwnbhwqpp`**, org **"Math"** (`aclgnvnjtdnllhkvokje`), region **us-east-1**, **$10/month** (the org is on a paid plan).
- **URL + anon key** live in `client/src/lib/supabase.ts` (anon keys are public client keys — safe to commit).
- **Tables provisioned** (match `shared/schema.ts`): `pst_leaderboard`, `lane_racer_leaderboard`, `gp_leaderboard`. RLS is **enabled** with permissive `public` SELECT + INSERT policies (so the anon client can read rankings and submit scores; no UPDATE/DELETE for clients).
- **The new DB is empty** — all prior leaderboard history was lost with the deleted project. Boards repopulate as people play.
- Managing this DB requires the Supabase account that owns the "Math" org. (The Supabase MCP in this session WAS connected to that account.)

---

## Feature details

### Canada switch (`Game.tsx`, `gameLogic.ts`)
- `CURRENT_GRAND_PRIX` in `client/src/pages/Game.tsx` (~line 61) is the single config for the featured weekly circuit:
  `circuitId: 'canada'`, `name: 'CANADA'`, `trackImage: trackCanada`, `flagImage: flagCanada`, `rainProbability: 0.40`, `simLapCount: 70`, red/white gradient.
- `SIM_LAP_COUNTS.canada = 70` in `client/src/lib/gameLogic.ts`.
- Free Practice card reads **"ROUND 5 / CANADA"**; GP welcome text ends with **"…Circuit Gilles-Villeneuve."**
- Assets: `client/src/assets/track_canada.png` + `flag_canada.png`. Source files are in the (untracked) repo-root `montreal_assets/` folder. The Canada flag PNG was generated from an SVG via headless Chrome.
- **To rotate next week's GP circuit:** edit `CURRENT_GRAND_PRIX`, add the track/flag imports, and add a `SIM_LAP_COUNTS` entry (see the comment above the constant).

### Career mode + Ratios removed
- **Career mode is gone**: the SELECT MODE card, the series-select screen, the circuit carousel + unlock gating, and the championship progression system (`championedCircuits`, `unlockedSeries`, series-unlock helpers, `championCircuit`) were all removed.
- **Kept** (NOT Career-only): `careerPoints` / `addCareerPoints` / `POSITION_POINTS` — used by Multiplayer and shown in the Racer Log.
- **Ratios dropped**: the ratio question generator (`ratioQuestions.ts` deleted) and all Ratios references removed. The app's math operations are now **Addition, Subtraction, Multiplication, Division, Variables** (no Ratios). Miami was removed here too, but was **later re-added as a plain track skin** (see "Lane Racer & Multiplayer: Miami + Canada tracks" below) — it is no longer a Ratios circuit.
- **Paywall** now gates **Grand Prix** only (it already did; Career's gate was just removed).
- **SELECT MODE order** is now: **Free Practice → Lane Racer → Grand Prix**.

### Grand Prix leaderboard + scoring
- New `calculateGPScore(totalTimeMs, mistakes, difficulty, raceLength, polePosition)` in `gameLogic.ts` (~line 932): same shape as `calculatePSTScore` — `(laps/time) × accuracy × difficultyMultiplier × 1000`, then **× 1.25 if pole**, capped at 100,000.
- GP Race Day finish submits a `score` (`Game.tsx`); `gp_leaderboard` has a `score` column; `getGPLeaderboard` orders by **score desc, then time asc**.
- The **Leaderboard page** (`client/src/pages/Leaderboard.tsx`) now has three tabs: Free Practice, Lane Racer, **Grand Prix**. GP rows show a purple **POLE** chip, the circuit, and points. Deep-link: `/leaderboard?mode=grand-prix`.
- The old standalone `/gp-leaderboard` page was deleted; the in-game link points at the tab. There is a separate `GPLeaderboard` page concept no longer in the app.

### Lane Racer & Multiplayer: Miami + Canada tracks + chosen operation
*(committed: `3186ff8`; Multiplayer operation in the latest commit)*
- **`CIRCUITS` (`gameLogic.ts`) now has 7 circuits**: spa (Addition), monaco (Subtraction), monza (Multiplication), suzuka (Division), silverstone (Variables), **canada (Addition)**, **miami (Multiplication)**. `CIRCUITS` feeds both the Lane Racer and Multiplayer track carousels.
- A circuit's `type` is its **default/initial** operation. **Canada=Addition, Miami=Multiplication are arbitrary defaults** — change freely. (Operation is now player-selectable in both Lane Racer and Multiplayer — see below.)
- `SIM_LAP_COUNTS`: added `canada: 70`, `miami: 57` (Realism-mode lap counts).
- **Lane Racer operation is now player-chosen**: the setup screen gained a 4th "MATH" drum (LEVEL | TEAM | TRACK | MATH) using a local `OPERATION_OPTIONS`; `selectedOperation` is passed to `generateQuestion(...)` as the `operationOverride` and submitted to the leaderboard (no longer derived from the track's `type`). The setup card was widened `max-w-sm` → `max-w-md` to fit 4 drums.
- **Multiplayer operation is now player-chosen too**: an operation selector on the race-setup (`track_select`) screen. The host's choice generates the shared question set (via `operationOverride`) and **propagates to the guest through the `start_countdown` → `countdown_start` WS flow** (mirrors how `weather` is synced — `server/websocket.ts` passes `operation` through `handleStartCountdown`'s broadcast). Overtake "harder" questions on both sides use the chosen operation. (Two-client UI couldn't be fully tested solo; type-checked + mirrors the weather pattern.)
- **Track/flag images:** Lane Racer & Multiplayer `CIRCUIT_MAP_IMAGES` / `FLAG_IMAGES` got `miami`/`canada` entries (`miami_track.png`/`track_canada.png` + `flag_us.jpg`/`flag_canada.png`). The Canada/Miami `CIRCUITS` entries have empty SVG `paths` — carousels render the track PNG, not the sectors.
- **Leaderboard:** the Lane Racer tab's circuit filter (`CIRCUIT_FILTERS` + `CIRCUIT_ID_MAP` in `Leaderboard.tsx`) now includes Miami + Canada.
- `miami_track.png` + `flag_us.jpg` were **restored from git `4278974`** (they'd been deleted with Ratios).
- Files: `gameLogic.ts`, `LaneRacer.tsx`, `Leaderboard.tsx`, `Multiplayer.tsx`, `server/websocket.ts`, + restored `miami_track.png` / `flag_us.jpg`.

---

## Operational notes (read before building/deploying)

### Mobile / Capacitor (iOS)
- App: `live.mathracer.app` ("Math Racer"), web dir `dist/public`, one Capacitor plugin (`@revenuecat/purchases-capacitor`).
- **Deploy flow that works in this repo:**
  ```
  npm run build
  LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
  LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604
  ```
- **CocoaPods/Ruby gotcha:** `npx cap sync ios` fails with a Ruby `Encoding::CompatibilityError (ASCII-8BIT)` unless `LANG`/`LC_ALL` are set to a UTF-8 locale. Always prefix cap commands with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- Simulator used: **iPhone 17, iOS 26.5**, UDID `A1301ED4-C124-4695-9A60-D05ACF4B4604` (there's also an iPhone 17 on iOS 26.4 = `D2CC7E2D-...`).

### Dev server
- `npm run dev` serves the full app (Express + Vite middleware) on **port 8081**. (`dev:client` is Vite-only on 5000, which collides with macOS AirPlay on this machine.)

### Git / push
- Pushing directly to `main` can be blocked by the harness's auto-mode classifier; the user authorizes/runs the push.

---

## Working tree state (intentionally NOT committed)
- `.claude/launch.json` — locally changed to run `npm run dev` on 8081 (for the preview tooling). Left uncommitted.
- `.claude/settings.local.json` — local permissions; left uncommitted.
- Untracked and not committed: `montreal_assets/` (source art), `.playwright-mcp/`, `.superpowers/`, and a few `*.png` screenshots at repo root.

## Known follow-ups / watch-outs
- New leaderboard DB is **empty** and costs **$10/mo** — keep or downgrade as desired.
- GP Race Day length comes from `getRaceLength(circuitId, !isPracticeMode && simMode)` — it's `RACE_LENGTH` (20) unless Realism mode is on, where it's the sim lap count. The GP score normalizes by lap count, so this is fine, but be aware the "race" length varies.
- The archived `client/src/pages/DeployHarvest.tsx` references `'miami'`/`'Ratios'` as string args. `'miami'` now resolves to a real circuit again (Multiplication); `'Ratios'` still falls back to Addition (the Ratios generator is gone). Unrouted and compiles; revisit if Deploy/Harvest is re-enabled.
- `package.json` version is still `1.0.0`; the displayed app version lives elsewhere (e.g. `capacitor.config.ts` had `1.1.0`). No version bump was done this session.
