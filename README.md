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

### Difficulty Levels

- **Rookie** - Numbers 2-10
- **Pro** - Numbers 5-15
- **Champion** - Numbers 10-20

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

### Purple Streak Mode
- Activate after 5 consecutive correct answers
- Must answer under 3 seconds to maintain purple status
- Breaking streak requires 5 fresh correct answers to re-enter
- Disabled during calibration phase in realism mode

### Garage

- **Pit Coins**: Earn virtual currency for correct answers
- **Telemetry**: Career stats (laps completed, races won, best streak)
- **Liveries & Tires**: Unlock and equip cosmetic items
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
