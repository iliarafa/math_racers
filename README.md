# F1 Math Racer: Grand Prix

An interactive, gamified math practice web application designed for children. Players solve addition, subtraction, and multiplication problems in an F1 racing theme with real-time multiplayer support.

## Features

### Racing Modes

**Solo Racing**
- F1-style 5-light countdown with audio cues
- 20 questions per race
- Grid position based on mistakes (0 = P1, 1-2 = P2, 3+ = position equals mistakes, 11+ = DNF/Crash)
- Desktop keyboard support (0-9, Backspace, Enter)

**Real-time Multiplayer**
- 1v1 head-to-head races via WebSocket
- 4-digit room codes for easy joining
- Live progress bars showing both players
- Winner determined by fewer mistakes; ties broken by time

### Circuits (Math Operations)

- **MONZA** - Multiplication (The Temple of Speed)
- **SPA** - Addition (The Longest Lap)
- **MONACO** - Subtraction (Street Circuit)
- **SUZUKA** - Division (Figure-8 Track)
- **SILVERSTONE** - Variables (Home of F1)

### Difficulty Levels (Racing Series)

- **Karting** (Beginner) - Ages 6-8, basic single-digit math
- **F3** (Easy) - Ages 8-10, two-digit operations
- **F2** (Medium) - Ages 10-12, larger numbers
- **F1** (Hard) - Ages 12+, challenging calculations

### Bot Opponent AI

The bot opponent's response time adapts dynamically based on three factors:

**1. Difficulty Level Base Times:**
- Karting: 2500ms base
- F3: 3000ms base
- F2: 3500ms base
- F1: 4000ms base

**2. Operation Type Modifier:**
- Addition: 0.85x (fastest)
- Subtraction: 0.95x
- Multiplication: 1.15x
- Division: 1.20x
- Variables: 1.25x (slowest)

**3. Problem Complexity Modifier:**
- **Addition/Subtraction**: Analyzes carries/borrows
  - No carries: 1.0x
  - 1 carry: 1.3x
  - 2 carries: 1.6x
  - 3+ carries: 2.0x
- **Multiplication**: Based on operand digit count
  - Single digit: 1.0x
  - Two digits: 1.5x
- **Division**: Based on dividend size
  - 1 digit: 1.0x
  - 2 digits: 1.25x
  - 3 digits: 1.5x

A random factor of ±25% is applied to make the bot feel more natural.

**Example**: Addition 45 + 38 (1 carry) on Medium difficulty:
- Base: 3500ms × 0.85 (addition) × 1.3 (1 carry) = ~3867ms
- With random factor: 2900-4834ms

### F1-Style Competitive Sector Timing

Both player and bot compete for the fastest time on each sector (question). The sector colors follow real F1 timing rules:

- **Purple**: Overall fastest time for that sector (only ONE driver can hold purple per sector)
- **Green**: Good time or personal improvement, but not the overall fastest
- **Yellow**: Slower than baseline/reference time
- **Red**: Incorrect answer (player only)

**How it works:**
1. When a driver finishes a sector first, they provisionally get purple (fastest so far)
2. When the other driver finishes the same sector:
   - If faster → they take purple, previous holder drops to green
   - If slower → previous holder keeps purple, new driver gets green/yellow
3. Progress bars update live to reflect these changes

This creates authentic F1 tension where you can watch your purple sectors turn green if the bot beats your time, or celebrate taking purple away from the bot with a fast answer.

### Speed Feedback System

**Standard Mode:**
- Easy: Fast < 2s (green), Slow > 4s (yellow)
- Medium: Fast < 3s (green), Slow > 5s (yellow)
- Hard: Fast < 4s (green), Slow > 7s (yellow)

**Realism Mode (Toggle in Garage):**
- First 5 questions are calibration phase (all green)
- Fastest calibration time becomes your personal threshold
- Questions 6+: At or under threshold = green, over = yellow
- Wrong answers keep the same question until correct with time penalties
- Crash at 11 mistakes

### Purple Mode
- Purple sectors indicate you have the overall fastest time for that question
- Earning purple on a sector means you beat the bot's time (or set the first benchmark)
- If the bot later beats your time on that sector, your purple turns to green
- Purple mode UI effects activate when you're currently holding purple sectors

### Garage
- **Realism Mode Toggle**: Switch between standard and calibration-based timing
- **Strategy Guide**: Interactive math reference with multiplication grid, division facts, and more

### Post-Race Analytics
- Lap-by-lap breakdown with timing for each question
- Speed indicator showing fast/slow performance
- Mistake tracking and final position

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Shadcn/ui components
- **Routing**: Wouter
- **State**: React Query, localStorage for game persistence
- **Animations**: Framer Motion, canvas-confetti
- **Audio**: Web Audio API for countdown beeps
- **Backend**: Node.js, Express, TypeScript
- **Real-time**: WebSocket for multiplayer
- **Database**: PostgreSQL with Drizzle ORM

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

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

The app will be available at `http://localhost:5000`

## Project Structure

```
client/               # React frontend
  src/
    pages/            # Route components (Welcome, Game, Garage, Multiplayer)
    components/       # UI components and layouts
    lib/              # Game logic, utilities, API client
    hooks/            # Custom React hooks
server/               # Express backend
  index.ts            # Server entry point
  routes.ts           # API route definitions
  websocket.ts        # Multiplayer WebSocket handlers
  storage.ts          # Data access layer
shared/               # Shared types and schemas
  schema.ts           # Drizzle schema and Zod validation
```

## License

MIT
