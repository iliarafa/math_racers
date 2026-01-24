# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

F1 Math Racer: Grand Prix - A gamified math practice web application for children (ages 6+) with F1 racing theme. Features single-player racing, real-time WebSocket multiplayer (1v1 with 4-digit room codes), bot opponents with adaptive difficulty, and a garage cosmetic system.

## Commands

```bash
# Development
npm run dev              # Start backend server (port 5000)
npm run dev:client       # Start Vite dev server (frontend only)
npm run check            # TypeScript type checking

# Production
npm run build            # Full production build (client + server)
npm run start            # Run production server

# Database
npm run db:push          # Sync Drizzle ORM schema to PostgreSQL
```

## Architecture

### Stack
- **Frontend:** React 18 + TypeScript + Vite + Wouter (routing) + Tailwind CSS v4 + Shadcn/ui
- **Backend:** Node.js + Express + WebSocket (ws) + Drizzle ORM + PostgreSQL
- **Mobile:** iOS via Capacitor

### Directory Structure
```
client/src/
├── pages/           # Route components (Welcome, Game, Garage, Multiplayer, etc.)
├── components/ui/   # Shadcn/ui components
├── lib/gameLogic.ts # Core game engine (question generation, bot timing, sectors)
└── hooks/           # Custom hooks (use-mobile, use-toast)

server/
├── index.ts         # Express entry point
├── routes.ts        # REST API (room management)
├── websocket.ts     # Real-time multiplayer handler
└── storage.ts       # Abstract data layer (memory or DB)

shared/
└── schema.ts        # Drizzle ORM tables + Zod schemas
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

### State Management
- **Single-player:** localStorage via `useGameState()` hook
- **Server state:** React Query (available but minimally used)
- **Multiplayer:** PostgreSQL for room persistence, WebSocket for real-time sync

### Key Files
- `/client/src/lib/gameLogic.ts` - All math question generation, bot timing algorithms, difficulty curves, sector color calculation
- `/client/src/pages/Game.tsx` - Main race gameplay
- `/server/websocket.ts` - Multiplayer game state machine and event handlers
- `/shared/schema.ts` - Database schema and TypeScript interfaces

### Multiplayer Flow
1. Host creates room via `POST /api/rooms` → gets 4-digit code
2. Guest joins via `POST /api/rooms/:code/join`
3. Both connect WebSocket and exchange: `join_room`, `start_countdown`, `progress_update`, `race_finished`
4. Server validates sequential progress and determines winner

### Build System
- Client: Vite bundles to `/dist/public`
- Server: ESBuild bundles to `/dist/index.cjs`
- Custom build script: `script/build.ts`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (required for multiplayer)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - "development" or "production"

## Game Logic Notes

- All question generation happens client-side in `gameLogic.ts`
- Bot timing varies by: difficulty level, operation type, problem complexity, ±25% randomness
- Difficulty levels: Karting → F3 → F2 → F1 (increasing complexity)
- Sector colors (purple/green/yellow) calculated based on relative answer times
