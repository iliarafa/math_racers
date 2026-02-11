# F1 Math Racer: Grand Prix

An interactive, gamified math practice web application. Players solve addition, subtraction, multiplication, division, and algebra problems in an authentic F1 racing theme with real-time multiplayer support, strategic power-ups, and a championship progression system.

## Features

### Racing Modes

**Solo Racing**
- F1-style 5-light countdown with audio cues
- 20 questions per race (configurable via Realism Mode)
- Grid position based on mistakes (0 = P1, 1-2 = P2, 3+ = position equals mistakes)
- Per-question retry system: 4 attempts per question, 4th wrong = DNF/Crash
- Desktop keyboard support (0-9, Backspace, Enter)
- Race against adaptive AI bot opponents
- Championship progression: champion circuits to unlock higher series

**Real-time Multiplayer**
- 1v1 head-to-head races via WebSocket
- 4-digit room codes for easy joining
- Live progress bars showing both players
- Selected series/difficulty carries over from single-player to multiplayer
- Winner determined by fewer mistakes; ties broken by time

**Grand Prix Mode**
- Three-phase race weekend on the Melbourne circuit: Practice → Qualifying → Race Day
- Practice (30 questions) uses dynamic difficulty that adapts to your speed and accuracy
- Difficulty locks after practice and carries through qualifying and race
- Win qualifying to earn pole position (2-sector head start on first correct answer in the race)
- Power-ups enabled during race phase only

**Pre-Season Testing (PST)**
- 100-question scored benchmark session on the Bahrain circuit
- Dynamic difficulty adjusts per answer based on response time and accuracy
- Completing all 100 questions submits your score to the global leaderboard
- Ending the session early returns home with no leaderboard entry
- Session log tracks stint-by-stint breakdown with lap-by-lap details
- Score combines speed, accuracy, and achieved difficulty level (max 100,000)

### Circuits (Math Operations)

Each circuit is themed after a famous F1 track:

- **MONZA** - Multiplication
- **SPA** - Addition
- **MONACO** - Subtraction
- **SUZUKA** - Division
- **SILVERSTONE** - Variables/Algebra

### Difficulty Levels (Racing Series)

- **Karting** (Beginner) - Ages 6-8, basic single-digit math
- **F3** (Easy) - Ages 8-10, two-digit operations
- **F2** (Medium) - Ages 10-12, larger numbers
- **F1** (Hard) - Ages 12+, challenging calculations

### Strategic Power-Ups

**OVERTAKE System (Energy Bar)**
- Energy meter charges by answering questions correctly (faster = more charge)
- Activates only when behind opponent and within 2 sectors (disabled once opponent finishes)
- While active: **2x progress** per correct answer + **1.5x harder questions** (halfway to next difficulty)
- Difficulty stacks with weather: dry + OVERTAKE = 1.5x, wet + OVERTAKE = 2x (next difficulty level)
- Energy drains over time (100% energy = 5 second max duration)
- Can **manually deactivate** early to preserve remaining energy for later use
- Wrong answer while active **depletes ALL energy** and ends boost immediately

**ACTIVE AERO System (DRS Zones)**
- Appears at specific race points (2 zones in standard, 5 in Realism Mode)
- Grants 2x sector boost (advance 2 sectors on correct answer)
- Harder question while AERO is active (bumps to next difficulty level)
- Each zone usable once per race

### Bot Opponent AI

The bot opponent's response time adapts dynamically based on three factors:

**1. Difficulty Level Base Times:**
- Karting: 2500ms base
- F3: 3500ms base
- F2: 4500ms base
- F1: 6000ms base

**2. Operation Type Modifier:**
- Addition: 0.85x (fastest)
- Subtraction: 0.95x
- Multiplication: 1.15x
- Division: 1.20x
- Variables: 1.25x (slowest)

**3. Problem Complexity Modifier:**
- **Addition/Subtraction**: Analyzes carries/borrows (1.0x to 2.0x)
- **Multiplication**: Based on operand digit count (1.0x to 1.5x)
- **Division**: Based on dividend size (1.0x to 1.5x)

A random factor of ±25% is applied to make the bot feel more natural.

### F1-Style Competitive Sector Timing

Both player and bot compete for the fastest time on each sector. Colors follow real F1 timing rules:

- **Purple**: Overall fastest time for that sector (only ONE driver can hold purple per sector)
- **Green**: Good time or personal improvement, but not the overall fastest
- **Yellow**: Slower than baseline/reference time
- **Red**: Incorrect answer (player only)

Progress bars update live as times change, creating authentic F1 tension.

### Penalty System (Per-Question Retry)

Each question allows up to 4 attempts before a crash (DNF):
- Wrong answer shows a **"TRACK LIMITS"** warning in a red container with a black-and-white flag
- **4th wrong answer** on the same question: DNF (Did Not Finish) — race ends

Wrong answer during AERO deactivates AERO; the retry system still applies.
Practice mode has no penalties — infinite retries.

### Weather System

Dynamic weather affects problem difficulty:
- **Dry**: Standard difficulty (1.0x)
- **Wet**: 1.5x harder questions (halfway to next difficulty level)
- **Random**: Circuit-specific rain probability
- **Realism + Random**: Weather alternates between dry and wet during the race

### Dashboard (Garage)

**Pit Console (Settings):**
- Sound effects toggle
- Realism Mode toggle (full race distance & damage)
- Power-Ups toggle (Overtake & Active Aero)
- Retire from Championship (full progress reset)

**Quick Links:**
- Race Regulations (game rules)
- Strategy Guide (interactive math reference with multiplication grids, division facts, number bonds)
- Reflex Training (F1 lights reaction time mini-game)

**Telemetry:** Total Laps, Career Points, Races Won
**Racer Log:** Last 20 races with timestamps and series info

### Post-Race Analytics

- Lap-by-lap breakdown with timing for each question
- Speed indicators showing fast/slow performance
- Mistake tracking and final position
- Grid position with 2025 F1 driver assignments
- Confetti celebrations for victories and personal bests

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Shadcn/ui components
- **Routing**: Wouter
- **State**: React Query, localStorage for game persistence
- **Animations**: Framer Motion, Embla Carousel, canvas-confetti
- **Audio**: Web Audio API for countdown beeps and sound effects
- **Backend**: Node.js, Express, TypeScript
- **Real-time**: WebSocket for multiplayer
- **Database**: PostgreSQL with Drizzle ORM
- **Mobile**: iOS support via Capacitor

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (required for multiplayer)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-repo/f1-math-racer.git
cd f1-math-racer
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
DATABASE_URL=your_postgresql_connection_string
```

4. Push database schema
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### iOS Build (Capacitor)

```bash
npm run build
npx cap sync ios
npx cap open ios
```

## Project Structure

```
client/               # React frontend
  src/
    pages/            # Route components (Welcome, Game, Garage, Multiplayer, etc.)
    components/       # UI components, layouts, ErrorBoundary
    lib/              # Game logic, utilities, API client
    hooks/            # Custom React hooks

server/               # Express backend
  index.ts            # Server entry point
  routes.ts           # API route definitions
  websocket.ts        # Multiplayer WebSocket handlers
  storage.ts          # Data access layer
  static.ts           # Static file serving

shared/               # Shared types and schemas
  schema.ts           # Drizzle schema and Zod validation

ios/                  # Capacitor iOS project
```

## License

MIT
