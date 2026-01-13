# F1 Math Racer: Grand Prix

## Overview

An interactive, gamified math practice web application designed for children. Players solve addition, subtraction, and multiplication problems in an F1 racing theme. The game features a progression system with race tracks, a virtual currency (Pit Coins), and a garage where players can unlock and equip cosmetic items like car liveries and tires.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for Replit integration
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Query for server state, localStorage for game persistence
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**: Shadcn/ui component library (New York style) with Radix UI primitives
- **Animations**: Framer Motion for UI transitions, canvas-confetti for celebrations

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Development**: Vite dev server with HMR proxied through Express

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with `db:push` command
- **Current Schema**: Basic users table (id, username, password)
- **Game State**: Currently uses localStorage for game progress persistence (coins, unlocked items, equipped items)

### Project Structure

```
client/           # React frontend
  src/
    pages/        # Route components (Welcome, Game, Garage)
    components/   # UI components and layouts
    lib/          # Game logic, utilities, API client
    hooks/        # Custom React hooks
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Data access layer (memory storage, ready for DB)
shared/           # Shared types and schemas
  schema.ts       # Drizzle schema and Zod validation
```

### Routes

| Path | Description |
|------|-------------|
| `/` | Welcome screen |
| `/game` | Race mode selection & gameplay |
| `/garage` | Customization & settings |
| `/strategy` | Strategy guide |
| `/reaction` | Reaction time test |
| `/multiplayer` | VS mode lobby |

### Game Logic

- Math problems generated client-side based on difficulty track
- Race is 20 questions; mistakes determine final grid position
- 2025 F1 driver names used for leaderboard positions
- 11 mistakes = DNF (car crashes out, race ends early)

### Difficulty Levels

| Level | Operations | Range | Thresholds |
|-------|-----------|-------|------------|
| ROOKIE | Addition | 1-20 | Easy |
| PRO | Add/Subtract | 1-50 | Medium |
| CHAMPION | All (+, -, ×) | 1-100 | Hard |

### Circuits

Five tracks with circuit-specific rain probabilities (for Random weather):
- Monza 🇮🇹 (20%), Monaco 🇲🇨 (25%), Suzuka 🇯🇵 (42%), Silverstone 🇬🇧 (50%), Spa 🇧🇪 (60%)

### Weather System

Players can choose weather conditions before each race:
- **Dry (☀️)**: Normal difficulty - default settings
- **Wet (🌧️)**: Increased difficulty:
  - Expanded number ranges (Easy: 2-15, Medium: 5-25, Hard: 10-30)
  - Tighter speed thresholds (500ms stricter)
- **Random (🎲)**: Program randomly picks Dry or Wet at countdown start

### Speed Thresholds

**Standard Mode (Dry):**
- Easy: Fast < 2s, Slow > 4s
- Medium: Fast < 3s, Slow > 5s  
- Hard: Fast < 4s, Slow > 7s

**Wet Weather:** All thresholds tightened by 500ms

**Realism Mode (simMode toggle in Garage):**
- First 5 questions are calibration phase - all green
- The fastest of those 5 becomes the personal threshold
- Questions 6+: ≤ threshold = green, > threshold = yellow

**Purple Mode:**
- Enters on 5th consecutive correct answer
- Must answer under 3 seconds to retain purple (all difficulty levels)
- Breaking purple requires 5 fresh correct answers to re-enter
- Disabled during calibration phase in realism mode

### Practice Mode

- Toggle between RACE and PRACTICE on circuit selection
- Practice mode doesn't save personal bests or affect career stats
- Great for warm-up or learning new difficulty levels

### Post-Race Analytics

- Color-coded lap breakdown: Purple (fastest), Green (fast), Yellow (slow), Red (mistake)
- Response times per question in milliseconds
- Mistake review with your answer vs correct answer
- Accuracy percentage and total time

### Garage Features

- **Pit Coins**: Virtual currency earned from races
- **Liveries**: Unlock and equip car paint schemes
- **Tires**: Cosmetic tire compounds (Hard/Medium/Soft)
- **Team Color**: Custom color picker for personalization
- **Realism Mode**: Toggle for personalized speed calibration
- **Sound Toggle**: Enable/disable game audio

### Multiplayer System

- **Real-time 1v1 Races**: WebSocket-based multiplayer with 4-digit room codes
- **Room Flow**: Host creates room, shares code, guest joins, host starts race
- **Countdown**: 5-second F1-style light countdown before race starts
- **Dual Progress**: Both players' progress bars displayed during race
- **Winner Logic**: Fewer mistakes wins; if tied, faster time wins
- **Server Validation**: Sequential progress validation, prevents premature/fraudulent completion
- **Database**: Rooms stored in PostgreSQL with questions, players, and status
- **Realism Mode Multiplayer**: Uses mistake_update message type for retry-without-progress syncing
- **Crash Handling**: At 11 mistakes, sends race_finished with crashed=true flag, server skips progress validation
- **Known Limitation**: Penalty time not transmitted in mistake_update, causing opponent timer display desync (cosmetic only - race results still correct)

## External Dependencies

### Database
- PostgreSQL (via DATABASE_URL environment variable)
- Drizzle ORM for type-safe queries
- connect-pg-simple for session storage (available but not yet implemented)

### UI/UX Libraries
- Radix UI primitives for accessible components
- Framer Motion for animations
- canvas-confetti for celebration effects
- Lucide React for icons

### Development Tools
- Vite with React plugin
- Tailwind CSS v4 with @tailwindcss/vite
- TypeScript with strict mode
- ESBuild for production server bundling