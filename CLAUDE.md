# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1 Math Racer: Grand Prix - A gamified math practice web application for children (ages 6+) with F1 racing theme. Features single-player racing against AI bots, real-time WebSocket multiplayer (1v1 with 4-digit room codes), strategic power-up systems (OVERTAKE & ACTIVE AERO), vehicle customization garage, and educational resources.

## Commands

```bash
# Development
npm run dev              # Start backend server (port 3000)
npm run dev:client       # Start Vite dev server (frontend only, port 5000)
npm run dev:open         # Backend + auto open browser (port 3000)
npm run check            # TypeScript type checking

# Production
npm run build            # Full production build (client + server)
npm run start            # Run production server

# Database
npm run db:push          # Sync Drizzle ORM schema to PostgreSQL
```

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
│   ├── Game.tsx         # Main single-player racing (~2900 lines)
│   ├── Multiplayer.tsx  # 1v1 multiplayer racing (~1900 lines)
│   ├── Garage.tsx       # Dashboard (settings, stats, racer log)
│   ├── StrategyGuide.tsx # Math reference guide
│   ├── ReactionTest.tsx # Reaction time mini-game (F1 lights)
│   ├── Regulations.tsx  # Game rules
│   └── not-found.tsx    # 404 error page
├── components/
│   ├── ui/              # 55 Shadcn/ui components
│   ├── layout/          # GameLayout wrapper
│   ├── TrackProgress.tsx
│   └── ErrorBoundary.tsx # React error boundary
├── lib/
│   ├── gameLogic.ts     # Core game engine (~920 lines)
│   ├── queryClient.ts   # React Query config
│   └── utils.ts
├── hooks/
│   ├── use-mobile.tsx   # Mobile detection
│   └── use-toast.ts     # Toast notifications
└── assets/              # Images, Formula1 fonts

server/
├── index.ts             # Express entry point
├── routes.ts            # REST API (room management)
├── websocket.ts         # Real-time multiplayer (~620 lines)
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
- **Single-player:** localStorage via `useGameState()` hook
- **Session data:** sessionStorage for lap times (cross-component)
- **Series selection:** localStorage `lastSelectedDriverId` — persisted when selecting a series in single-player, read as default in multiplayer
- **Server state:** React Query (available but minimally used)
- **Multiplayer:** PostgreSQL for room persistence, WebSocket for real-time sync

### Progression System (Championship)
- Win a race (beat the bot) to "champion" that circuit at the current series
- Championing a circuit at a series unlocks that circuit at the next series
- A series becomes available when at least one circuit is championed at the previous series
- Series order: Karting → F3 → F2 → F1
- Practice mode bypasses all series/circuit locks
- `championedCircuits` state: `{ [circuitId]: string[] }` maps circuits to championed series
- Legacy `unlockedSeries` field kept for backward compatibility

### Key Files
- `/client/src/lib/gameLogic.ts` - Question generation, bot timing, difficulty curves, sector colors, progression system
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
- **Karting** (ages 6-8): Numbers 1-10
- **F3** (ages 8-10): Numbers 10-50
- **F2** (ages 10-12): Numbers 20-100
- **F1** (ages 12+): Numbers 50-200

### Power-Up Systems

**OVERTAKE (Energy Bar)**
- Charges by answering correctly (faster = more energy)
- Activates when behind opponent and within 2 sectors (disabled once opponent finishes)
- While active: **2x progress** per correct answer + **1.5x harder questions** (0.5 boost factor)
- Stacks with wet weather: dry+OVERTAKE = 1.5x, wet+OVERTAKE = 2x (next difficulty level)
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
- Wet weather: +250ms base + harder numbers

### Weather System
- Dry: Standard difficulty
- Wet: +0.5 difficulty factor (harder numbers)
- Random: Circuit-specific rain probability
- **Realism + Random**: Weather alternates 3-5 times during race (visual indicator shows current condition)

### Penalty System (Per-Question Retry)
- Each question allows up to 4 attempts
- Attempt 1 wrong: "2 ATTEMPTS LEFT" warning
- Attempt 2 wrong: "1 ATTEMPT LEFT" warning
- Attempt 3 wrong: "LAST CHANCE!" red warning
- Attempt 4 wrong: DNF/Crash (race ends)
- Wrong answer during AERO: AERO deactivated, same retry system applies
- Practice mode: no penalties, just "TRY AGAIN" with infinite retries

### Race Configuration
- Standard: 20 questions per race
- Simulation mode: Circuit-specific lap counts (44-78 laps)
- 2025 F1 driver roster for grid positions

## Database Schema

```typescript
// multiplayerRooms table
- roomCode: varchar(4) unique  // 4-digit room code
- hostId, hostName, guestId, guestName
- circuitId, driverId, weather
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
