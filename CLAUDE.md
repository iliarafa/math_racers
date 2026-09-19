# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1 Math Racer: Grand Prix - A gamified math practice web application for children (ages 6+) with F1 racing theme. Features single-player racing against AI bots, real-time WebSocket multiplayer (1v1 with 4-digit room codes), strategic power-up systems (OVERTAKE & ACTIVE AERO), vehicle customization garage, and educational resources.

## Commands

```bash
# Development
npm run dev              # Start backend server (port 8081)
npm run dev:client       # Start Vite dev server (frontend only, port 5000)
npm run dev:open         # Backend + auto open browser (port 8081)
npm run check            # TypeScript type checking

# Production
npm run build            # Full production build (client + server)
npm run start            # Run production server

# Database
npm run db:push          # Sync Drizzle ORM schema to PostgreSQL (tablesFilter keeps the 3 legacy leaderboard tables out)

# Release
npm run version:bump <x.y.z>   # e.g. 1.3.16: package.json + lockfile, capacitor.config.ts, both Xcode MARKETING_VERSIONs; both build numbers → the higher one + 1
```
The client shows `__APP_VERSION__` (from package.json via Vite `define`) in the Garage footer.

## Dev Workflow

- **At session start:** Run `npm run dev` in the background to start the dev server on port 8081. Keep it running for the entire session.
- **After frontend edits:** The browser auto-opens `http://localhost:8081` via a hook on Edit/Write to `client/` files so the user can visually verify changes.

## Architecture

### Stack
- **Frontend:** React 19 + TypeScript + Vite + Wouter (routing) + Tailwind CSS v4 + Shadcn/ui (55 components)
- **Backend:** Node.js + Express + WebSocket (ws) + Drizzle ORM + PostgreSQL
- **Mobile:** iOS via Capacitor
- **Animation:** Framer Motion, canvas-confetti

### Directory Structure
```
client/src/
├── pages/               # Route components
│   ├── Welcome.tsx      # Home/landing page
│   ├── Game.tsx         # Main single-player racing (~3850 lines)
│   ├── Multiplayer.tsx  # 1v1 multiplayer racing (~2100 lines)
│   ├── Garage.tsx       # Dashboard (settings, stats, racer log)
│   ├── StrategyGuide.tsx # Math reference guide
│   ├── ReactionTest.tsx # Reaction time mini-game (F1 lights)
│   ├── Regulations.tsx  # Game rules
│   ├── Leaderboard.tsx  # FP + GP + Quick Race boards (Supabase) with a local "Your Best" tier
│   ├── RacerLog.tsx     # Standalone race history log
│   ├── TrophyCabinet.tsx # Trophy cabinet: season weekends, badges, fact growth
│   └── not-found.tsx    # 404 error page
├── components/
│   ├── ui/              # 55 Shadcn/ui components
│   ├── layout/          # GameLayout wrapper
│   ├── RewardStrip.tsx, TrophySplash.tsx, BadgeTile.tsx, DailyStreakChip.tsx, GrowthPanel.tsx  # rewards UI
│   └── ErrorBoundary.tsx # React error boundary
├── lib/
│   ├── gameLogic.ts     # Core game engine + GameState store (~940 lines)
│   ├── trophies.ts, dailyStreak.ts, factMastery.ts  # reward models (pure, tested)
│   ├── queryClient.ts   # React Query config
│   └── utils.ts
├── hooks/
│   ├── use-mobile.tsx   # Mobile detection
│   └── use-toast.ts     # Toast notifications
└── assets/              # Images (Oxanium font loaded via Google Fonts)

server/
├── index.ts             # Express entry point
├── routes.ts            # REST API (room management)
├── websocket.ts         # Real-time multiplayer (~900 lines)
├── storage.ts           # Abstract data layer (DB/memory fallback)
├── static.ts            # Static file serving
├── db.ts                # Database connection
└── vite.ts              # Vite dev server integration

shared/
└── schema.ts            # Drizzle ORM tables + Zod schemas

ios/                     # Capacitor iOS project
script/build.ts          # Custom build script
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### State Management
- **Single-player:** localStorage via `useGameState()` hook. The saved blob is the source of truth: every mutator goes through `mutateGameState` (load → apply → save synchronously → notify subscribers) and instances follow each other's saves, so a long-lived instance such as `MenuMusic` in `App.tsx` can never overwrite what a page just saved. Never call `setState` with a whole stale copy; add a pure `apply*` function and wrap it in `mutate`.
- **Session data:** sessionStorage for lap times (cross-component)
- **Series selection:** localStorage `lastSelectedDriverId` — persisted when selecting a series in single-player, read as default in multiplayer
- **Server state:** React Query (available but minimally used)
- **Multiplayer:** PostgreSQL for room persistence, WebSocket for real-time sync

### Web-only chrome (browser builds)
The same bundle ships to the web and the iOS app. These pieces exist for browsers and are inert (or unreachable) inside the app:
- `client/src/lib/webMeta.ts` + `WebMeta` in `App.tsx`: per-route tab title and `theme-color`; returns early on `Capacitor.isNativePlatform()`.
- `client/index.html`: `<title>`, description, absolute `og:image`/`og:url` (canonical `https://mathracer2026.io`), `<link rel="manifest">`. Backed by `client/public/manifest.webmanifest`, `icon-192.png` + `icon-512.png` (resized from the iOS app icon) and `opengraph.jpg` (1200×630 share card).
- `client/src/pages/not-found.tsx`: branded 404, reachable only from a typed or stale URL.
- Full-height screens use `h-dvh` / `min-h-dvh` (and `dvh` inside HUD `clamp()` sizes), never `h-screen` / `vh`: phone browsers hide the bottom of a `100vh` box behind the address bar, while inside WKWebView `dvh` equals `vh`.
- The Figma html-to-design capture script is injected from `main.tsx` only when `import.meta.env.DEV`.
- Mouse hover: `markWebDocument()` (`webMeta.ts`, called first thing in `main.tsx`) stamps `data-web` on `<html>` only when not native. The `web-hover-*` classes at the end of `index.css` match only under `html[data-web]` inside `@media (hover: hover) and (pointer: fine)`, so the app (even an iPad with a trackpad) and touch browsers never get them. To give a web control a hover, append one of `web-hover-glass`, `-glass-within`, `-brighten`, `-darken`, `-fade`, `-text` or `-wash`. A plain Tailwind `hover:` also fires inside the app on an iPad with a trackpad. Keep `@property` and any `:has()` that depends on `:hover` out of that block: each one changes the iPad app even though nothing matches there (that `:has()` alters how WebKit rasterises scaled images).

### Rewards (since 1.3.15)
Settled once per finished session by one effect in `Game.tsx` (`gameStatus === 'finished'`, re-armed when the screen leaves `finished`); the finish screens show the result in `RewardStrip`.
- **Trophy cabinet** (`lib/trophies.ts`, `/trophies`): one trophy per Grand Prix weekend, id `gp:<season>:<round>:<circuitId>` (so a returning circuit gets its own slot). Race Day finished = bronze, beat the bot = silver, pole + win = gold; never downgraded. `TrophySplash` celebrates a new or upgraded trophy. Quick Race and Free Practice earn no trophy. `CURRENT_GRAND_PRIX.season` feeds the id — keep it current in `/weekend`.
- **Badges** (`BADGES` in `trophies.ts`): the old `everything-is-purple` plus milestones (`first-win`, `laps-100`, `laps-1000`, `gp-all-purple`, `streak-7`, `streak-30`, `facts-50`), evaluated by the pure `evaluateMilestones`. Earned via `earnBadge`, shown by `BadgeTile`.
- **Daily streak** (`lib/dailyStreak.ts`, `GameState.dailyStreak`): consecutive local calendar days with a finished session; counted by `touchDailyStreak()` from the Game finish effect, a cleared flashcard stage, a completed Lane Racer race and a finished multiplayer race (not a crash). `DailyStreakChip` on the Hub is amber when yesterday counted but today has not. Distinct from `GameState.streak`, the per-answer streak inside a race.
- **Fact mastery** (`lib/factMastery.ts`, `GameState.factStats`): per-fact stats keyed from `Question.num1/num2/operation` (`factKey`; Variables use the display). Each `lapResults` row carries `fact`; the AERO duplicate is `isBonus` and skipped. A fact is mastered after `MASTERY_MIN_CORRECT` clean answers with an EWMA under `MASTERY_MS[operation]`. `pickCallout` produces "You got faster at 7 × 8"; `GrowthPanel` shows mastered vs learning per operation. Store capped at `FACT_STATS_CAP`.
- `GameState.unseenRewards` holds trophy/badge ids not yet viewed; the Hub's GARAGE card and the Garage's Trophies tile show the count, and opening `/trophies` clears it.
- There is no series/championship progression; `coins`, `SHOP_ITEMS` and the per-answer `streak` persist but are not shown anywhere.

### Key Files
- `/client/src/lib/gameLogic.ts` - Question generation, bot timing, difficulty curves, sector colors, the GameState store and `useGameState()`
- `/client/src/lib/trophies.ts`, `dailyStreak.ts`, `factMastery.ts` - Reward models (pure, each with a test)
- `/client/src/pages/Game.tsx` - Main race gameplay with power-ups
- `/client/src/pages/Multiplayer.tsx` - 1v1 multiplayer implementation
- `/client/src/pages/Garage.tsx` - Dashboard (settings, telemetry stats, racer log)
- `/server/websocket.ts` - Multiplayer game state machine
- `/shared/schema.ts` - Database schema and TypeScript interfaces

## Game Mechanics

### Circuits (Math Operations)
| Circuit | Operation | Theme |
|---------|-----------|-------|
| SPA | Addition | Longest Lap |
| Monaco | Subtraction | Street Circuit |
| Monza | Multiplication | Temple of Speed |
| Suzuka | Division | Figure-8 Track |
| Silverstone | Variables/Algebra | Home of F1 |

### Difficulty Levels
Kid-facing Adaptive ladder (soft-caps at F1). Pro is Locked-only (same digit size as F1, harder pace/facts).
- **Karting**: Addition ~1–10; times tables up to 5
- **F3**: Addition ~1–20; times tables up to 8
- **F2**: Addition ~5–30; times tables up to 10
- **F1**: Addition ~10–50; times tables up to 12 (kid-reachable summit)
- **Pro** (Locked only): F1 digit budget + tighter timing / harder fact mix

### Power-Up Systems

**OVERTAKE (Energy Bar)**
- Charges by answering correctly (faster = more energy)
- Activates when behind opponent and within 2 sectors (disabled once opponent finishes)
- While active: **2x progress** per correct answer + **1.5x harder questions** (0.5 boost factor)
- Energy drains over time (100% = 5 seconds max)
- Manual deactivation preserves remaining energy
- Wrong answer depletes ALL energy immediately

**ACTIVE AERO (DRS Zones)**
- Normal mode: 2 zones (at 25% and 65%)
- Sim mode: 5 zones (at 15%, 30%, 50%, 70%, 85%)
- Grants 2x sector boost
- Harder question when active (bumps to next difficulty level via `getHarderDifficulty`)

### Bot AI
**Progress Speed** (time per lap advance): Karting 4000ms → F1 2000ms, ±30% random variation
**Response Time** (for sector color comparison): Karting 2500ms → F1 6000ms base
- Operation modifiers: Addition 0.85x (fastest) → Variables 1.25x (slowest)
- Complexity analysis: carry/borrow counting, digit analysis
- Randomness: ±25% variation on response time

### Penalty System (Per-Question Retry)
- Each question allows up to 4 attempts
- Wrong answer shows "TRACK LIMITS" warning in a red container (with black-and-white flag)
- 4th wrong attempt on the same question: DNF/Crash (race ends)
- Wrong answer during AERO: AERO deactivated, same retry system applies
- Practice mode: no penalties, infinite retries

### Race Configuration
- Standard: 20 questions per race
- Simulation mode: Circuit-specific lap counts (44-78 laps)
- 2025 F1 driver roster for grid positions

### Game Modes

**Quick Race** (`/game/quick-race`, "Race Now" on the Hub)
- 20 questions against the bot on the current GP circuit, always Addition
- Every finish posts to the Quick Race board and feeds the streak, mastery and milestone badges; no weekend trophy

**Grand Prix Mode**
- Uses Melbourne circuit with player-selected operation
- Three sequential phases: Practice (30 Qs, dynamic difficulty) → Qualifying (20 Qs, locked difficulty, determines pole) → Race Day (sim-length, pole = 2-sector head start on first correct answer)
- Difficulty locked after practice phase for the entire weekend
- Power-ups enabled only during race phase

**Pre-Season Testing (PST)**
- Uses Bahrain circuit with player-selected operation
- Session length selectable at setup: 25, 50, or 100 laps (persisted as `freePracticeLaps`); every finished session records a local personal best (`state.localBests`), but only full 100-lap sessions submit a score to the global leaderboard
- "End Session" before the session ends navigates home with no local or global entry
- Dynamic difficulty adjusts per-answer based on response time and accuracy
- Score formula: `(laps / time) * accuracy * difficultyMultiplier * 1000` (max 100,000)
- Difficulty multipliers: beginner=1.0, easy=1.5, medium=2.0, hard=3.0
- Session log shows stint-by-stint breakdown during racing
- Name prompt on first submission (max 20 chars)

**Driving School (Superlicence path)**
- Flashcards: 10 gated stages of 20 cards. A card is purple when answered correctly within `PURPLE_TIME_FACTOR` (1.5×) of a deterministic expected bot time (`expectedBotTimeMs`, no random roll); correct but slower is green; wrong is red. A stage clears at the end of a lap with no reds and at least `PURPLE_MAJORITY` (15) purples; purples persist and only non-purple cards return next lap.
- Licence = all 10 stages + Reaction Test best under `REACTION_LICENCE_MS` (400 ms) + one Lane Racer win. Grand Prix stays locked until then (dev-server-only bypass: `grandPrixDevBypass`). Earning it shows the one-time `SuperlicenceSplash`.

### Racing HUD Variants (Game.tsx)
Each mode has its own HUD rules. A layout change in one does not imply the same change in the others; verify the mode you touched and leave the rest alone unless asked.
- **Race Day** (`isGpRace`): GameLayout header hidden; LAP x/y and RETIRE are absolute labels top-left/top-right; no progress grid; question + answer centered in the column with viewport-only sizes and a transform offset on the question; clock sits above the keypad; whole screen flashes on answer.
- **GP Practice / GP Qualifying** (`largeTenCol`): logo header, mode badge row with pause; clock at top of the column; large 10-column grid (3×10 practice, 2×10 qualifying) with cells capped at 32px; question + answer sized from the column's own height (`cqh`) so they never spill onto the grid. Practice adds the dynamic difficulty label under the clock.
- **Free Practice / PST** (`isPracticeMode && !isGrandPrix`): BOX button in the header instead of a badge row; single fluid 20-column grid (cells shrink to fit the phone width); series label above the keypad; "Limits" counter.
- **Quick Race**: badge row with pause; dual 20-column grid (BOT row above player row); "Warnings" counter.

**iPad** (`client/index.html` stamps `data-ipad-scale` on `<html>` for iPads only): the phone layout is viewport-scaled to fill the screen (600px-wide layout, at least 800px tall), so nothing above changes per device. In iPad **landscape** the racing screen splits into two panes (`index.css`, `useIpadLandscape`): timer, question, answer and sector grid on the left, keypad on the right. Race Weekend modes (Free Practice and the Grand Prix weekend) race in landscape on iPad via `@capacitor/screen-orientation` (`lib/orientationLock.ts`): the setup card still follows the device, and pressing Start on a portrait-held iPad shows a "Turn your iPad" prompt that holds the lights until it rotates, then locks landscape; the lock is released back at setup and on unmount. `UIRequiresFullScreen` is set in Info.plist because iPadOS ignores orientation locks for multitasking-capable apps. iPhone stays portrait-only and phone browsers are untouched.

**Desktop and laptop browsers** (`lib/layoutMode.ts`, `hooks/use-layout-mode.ts`): `detectLayoutMode()` returns `desktop` only when the build is not native, `data-ipad-scale` is absent, the pointer is fine with hover, and the viewport is at least `DESKTOP_MIN_WIDTH` (900px); `main.tsx` stamps `data-desktop` on `<html>` and the hook keeps it in step on resize. In that mode Game, Multiplayer and Driving School return the cinematic tree from `components/desktop/` inside `GameLayout wideContent`: `DesktopRaceScreen` takes corner slots. The question and answer (`QuestionPane`) fill the middle at room-reading size with the sector grid between them (`between` slot, `cellMax={22}`); the mode badge sits top-left; `HudClock` (clock, difficulty) and `HudPauseButton` sit together top-right (Race Day keeps its absolute LAP / RETIRE labels and pushes the row down with `topInset`); `HudMessages` plus `PowerUpControls` with the `−`/`+` shortcut chips bottom-right; and the one-row `KeyStrip` centred along the bottom. The phone JSX is left byte-identical and renders for every other mode, so the iOS app cannot change. Input is keyboard-first: the strip keys are clickable for mouse-only children and flash white on each physical press via `useKeyEcho` + the `key-flash` keyframes in `index.css` (display only, never submits). Multiplayer got the same physical-keyboard handler as Game. Lane Racer keeps its full-screen canvas and only adds `LaneKeyHints` (arrows / A D). Menu pages (Hub, Garage, Leaderboard, Trophies, Racer Log, Regulations, Strategy, Briefing, Reaction Test) keep their phone column inside a **desktop frame**: `.menu-frame` in `index.css` caps it at 520px, centres it and applies `zoom: 1.15` under `html[data-desktop]` only. `GameLayout menuFrame` adds the class; Hub and Garage carry it on their own content wrappers. Nothing changes on phone or iPad.

### Leaderboard
- **Global tier (Supabase):** the client writes directly to `fp_leaderboard` (100-lap Free Practice), `gp_weekend_leaderboard` (GP Race Day) and `quick_race_leaderboard` (every finished Quick Race; always Addition, one row per player × circuit, `beat_bot` flag shown as a P1 badge, no score bonus) via `client/src/lib/supabase.ts` (`upsertByBest`: one row per key, replaced only by a strictly higher score). DDL lives in `docs/superpowers/plans/2026-08-17-leaderboards-supabase.sql` and is hand-run on the Supabase project. There are no server leaderboard routes: the legacy Express ones and the `pst_leaderboard` / `gp_leaderboard` / `lane_racer_leaderboard` tables were removed from the code in 1.3.15. The Supabase tables of those names still exist; `tablesFilter` in `drizzle.config.ts` keeps `db:push` from dropping them, so drop them by hand if wanted.
- **Local tier (on-device):** `GameState.localBests` keyed `board:circuitId:operation:session` (`fp` 25/50/100, `gp` practice/qualifying/race, `qr` race) via `client/src/lib/localBests.ts`. Every finished FP or GP session records one; finish screens show Score / Personal Best / "NEW PERSONAL BEST", and `Leaderboard.tsx` shows a "Your Best" card above the global list with a hint until the player has a global row. Lane Racer has no board.
- Validation: score 0-100k, time 1s-1hr, mistakes 0-200, accuracy 0-100%

## Database Schema

```typescript
// multiplayerRooms table
- roomCode: varchar(4) unique  // 4-digit room code
- hostId, hostName, guestId, guestName
- circuitId, driverId
- status: "waiting" | "countdown" | "racing" | "finished"
- questions: jsonb array
- hostProgress, guestProgress, hostMistakes, guestMistakes
- hostFinishTime, guestFinishTime, winnerId
- powerUpsEnabled: boolean
- createdAt: timestamp
```

## API & WebSocket

### REST Endpoints
- `POST /api/rooms` - Create room (returns 4-digit code)
- `POST /api/rooms/:code/join` - Join room
- `GET /api/rooms/:code` - Get room details
- `PUT /api/rooms/:code/update` - Update settings before race

### WebSocket Events
**Client → Server:** `join_room`, `start_countdown`, `progress_update`, `race_finished`, `mistake_update`, `toggle_power_ups`, `energy_update`, `activate_overtake`, `deactivate_overtake`, `activate_aero`
**Server → Client:** `joined`, `room_ready`, `countdown_start`, `countdown`, `race_start`, `opponent_progress`, `player_finished`, `race_complete`, `player_disconnected`, `power_ups_toggled`, `energy_sync`, `overtake_activated`, `opponent_overtake_activated`, `overtake_ended`, `aero_activated`

### Multiplayer Flow
1. Host creates room via `POST /api/rooms` → gets 4-digit code
2. Guest joins via `POST /api/rooms/:code/join`
3. Both connect WebSocket and exchange events
4. Server validates sequential progress (can increment by 1, or 2 with AERO/OVERTAKE bonus)
5. Winner: Fewer mistakes > faster time

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (required for multiplayer)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - "development" or "production"

## Build System
- Client: Vite bundles to `/dist/public`
- Server: ESBuild bundles to `/dist/index.cjs`
- Custom build script: `script/build.ts`

## Mobile (Capacitor)
- App ID: `live.mathracer.app`
- App Name: `Math Racer`
- iOS: ContentInset 'never'
- Web directory: `dist/public`
