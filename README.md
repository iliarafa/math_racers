# Math Racers: F1 Edition

An educational F1-themed racing game where kids solve math problems to race. Features countdown lights with beep sounds, multiple difficulty levels, penalty system, and an F1-themed garage with Strategy Guide math reference.

## Features

### Racing
- **F1 Starting Sequence**: Authentic 5-light countdown with beep sounds
- **Math Problems**: Addition, subtraction, and multiplication based on track difficulty
- **Scoring System**: 0 mistakes = P1, 1-2 = P2, 3+ = position equals mistakes, 11+ = DNF
- **Time Penalties**: Track limits warnings and time penalties for mistakes
- **Desktop Keyboard Support**: Type answers using physical keyboard (0-9, Backspace, Enter)

### Tracks
- **MONZA** - Addition (1-20)
- **SPA** - Addition & Subtraction (1-50)
- **MONACO** - All operations (1-50)
- **SUZUKA** - All operations (1-100)
- **SILVERSTONE** - All operations (1-100)

### Difficulty Levels
- **Rookie** - Easier problems
- **Pro** - Medium difficulty
- **Champion** - Challenging problems

### Garage
- **Pit Coins**: Earn virtual currency by answering correctly
- **Telemetry**: Track your career stats (laps, races won, best streak)
- **Strategy Guide**: Interactive math reference with:
  - Multiplication grid (9x9) with hover highlighting
  - Division fact families
  - Addition number bonds
  - Subtraction strategies
  - Variables explanations

### Reflex Training
- Reaction time test to sharpen reflexes

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Shadcn/ui components
- **Routing**: Wouter
- **State**: React Query, localStorage for persistence
- **Animations**: Framer Motion, canvas-confetti
- **Audio**: Web Audio API for countdown beeps
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/iliarafa/math-racers.git
cd math-racers
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
    pages/            # Route components (Welcome, Game, Garage, StrategyGuide)
    components/       # UI components and layouts
    lib/              # Game logic, utilities, API client
    hooks/            # Custom React hooks
server/               # Express backend
  index.ts            # Server entry point
  routes.ts           # API route definitions
  storage.ts          # Data access layer
shared/               # Shared types and schemas
  schema.ts           # Drizzle schema and Zod validation
```

## License

MIT
