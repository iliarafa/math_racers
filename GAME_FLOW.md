# F1 Math Racer - Core Game Flow

## Game States

```
driver_select → selecting → countdown → go → racing → finished | crashed
```

| State | Description |
|-------|-------------|
| `driver_select` | Player chooses difficulty (racing series) |
| `selecting` | Player chooses circuit, weather, and mode (Race/Practice) |
| `countdown` | 5-light F1 start sequence |
| `go` | Race start signal |
| `racing` | Active gameplay - answering math questions |
| `finished` | Race completed successfully |
| `crashed` | DNF - 4th wrong attempt on a single question |

---

## Difficulty System (Racing Series)

| Series | ID | Difficulty | Target Age | Description |
|--------|-----|------------|------------|-------------|
| Karting | `karting` | Beginner | Ages 6-8 | Learning basics |
| F3 | `f3` | Easy | Ages 8-10 | Building skills |
| F2 | `f2` | Medium | Ages 10-12 | Intermediate |
| F1 | `f1` | Hard | Ages 12+ | The pinnacle |

---

## Operation-Specific Number Ranges

### Addition (Spa)

| Series | Dry Range | Wet Range (1.5x - halfway to next level) |
|--------|-----------|------------------------------------------|
| Karting | 1-10 | 6-30 |
| F3 | 10-50 | 15-75 |
| F2 | 20-100 | 35-150 |
| F1 | 50-200 | 50-200 (capped at max) |

### Subtraction (Monaco)

| Series | Dry Range | Wet Range (1.5x) |
|--------|-----------|------------------|
| Karting | 1-10 | 6-30 |
| F3 | 10-50 | 15-75 |
| F2 | 20-100 | 35-150 |
| F1 | 50-200 | 50-200 (capped) |

### Multiplication (Monza)

| Series | Dry Range | Wet Range (1.5x) |
|--------|-----------|------------------|
| Karting | 1-5 | 2-8 |
| F3 | 2-10 | 3-11 |
| F2 | 3-12 | 4-14 |
| F1 | 5-15 | 5-15 (capped) |

### Division (Suzuka)

| Series | Dry Range | Wet Range (1.5x) |
|--------|-----------|------------------|
| Karting | 1-5 | 2-8 |
| F3 | 2-10 | 3-11 |
| F2 | 3-12 | 4-14 |
| F1 | 5-15 | 5-15 (capped) |

### Variables (Silverstone)

| Series | Dry Range | Wet Range (1.5x) | Variable Types |
|--------|-----------|------------------|----------------|
| Karting | 1-5 | 2-9 | Only `x + a = b` |
| F3 | 2-12 | 3-14 | All types |
| F2 | 3-15 | 4-18 | All types |
| F1 | 5-20 | 5-20 (capped) | All types |

**Variable equation types:**
- `x + a = b`
- `a − x = b`
- `ax = b`

---

## Circuits & Math Operations

| Circuit | ID | Operation | DRS Zones | Sim Laps |
|---------|-----|-----------|-----------|----------|
| Monza | `monza` | Multiplication | 2, 8 | 53 |
| Spa | `spa` | Addition | 2, 8 | 44 |
| Monaco | `monaco` | Subtraction | 0, 5 | 78 |
| Suzuka | `suzuka` | Division | 0, 7 | 53 |
| Silverstone | `silverstone` | Variables | 3, 7 | 52 |

---

## Race Configuration

| Mode | Race Length | Bot Opponent | Penalties | Progress Reset |
|------|-------------|--------------|-----------|----------------|
| Race | 20 questions | Yes (bot) | Yes (4 attempts/question) | No |
| Practice | Infinite | No (solo) | No (just "Try Again") | Yes (loops) |
| Realism Race | Real lap count | Yes (bot) | Yes (4 attempts/question) | No |

---

## Sector Color System (Performance Feedback)

### Calibration Phase (Questions 1-5)
- All correct answers show **green**
- Tracks response times to calculate median as personal reference

### Post-Calibration (Questions 6+)

| Color | Condition |
|-------|-----------|
| Purple | Response time < bot's time for that question |
| Green | Response time ≤ personal reference time |
| Yellow | Response time > personal reference time |
| Red | Incorrect answer |

---

## Penalty System (Race Mode Only)

Per-question retry system (same for standard and realism):

| Attempt # | Message | Result |
|-----------|---------|--------|
| 1st wrong | "WRONG - 2 ATTEMPTS LEFT" | Warning (yellow) |
| 2nd wrong | "WRONG - 1 ATTEMPT LEFT" | Warning (yellow) |
| 3rd wrong | "WRONG - LAST CHANCE!" | Warning (red) |
| 4th wrong | "YOU CRASHED!" | DNF - Race ends |

- Wrong answer during AERO: AERO deactivated + same retry countdown
- Player must answer correctly before advancing (question stays the same)
- Practice mode: no penalties, infinite retries with "TRY AGAIN"

---

## Bot Opponent

### Race Progress Speed (time per lap advance)

| Series | Base Time | Range (±30%) | Notes |
|--------|-----------|--------------|-------|
| Karting | 4,000ms | 2,800-5,200ms | Slowest - gives kids more time |
| F3 | 3,000ms | 2,100-3,900ms | |
| F2 | 2,500ms | 1,750-3,250ms | |
| F1 | 2,000ms | 1,400-2,600ms | Fastest - most challenging |

### Bot Response Time (per question, for sector colors)

Base time calculated as: `baseTime × operationModifier × complexityModifier × randomFactor(0.75-1.25)`

| Series | Base Time |
|--------|-----------|
| Karting | 2,500ms |
| F3 | 3,500ms |
| F2 | 4,500ms |
| F1 | 6,000ms |

| Operation | Modifier |
|-----------|----------|
| Addition | 0.85 |
| Subtraction | 0.95 |
| Multiplication | 1.15 |
| Division | 1.20 |
| Variables | 1.25 |

Wet weather adds +250ms to base time.

---

## Weather System

| Weather | Effect |
|---------|--------|
| Dry | Standard number ranges (1.0x) |
| Wet | 1.5x harder (0.5 interpolation toward next difficulty level) |
| Random | Uses circuit-specific rain probability |

### Difficulty Boost Stacking

Difficulty boosts interpolate toward the next difficulty level and stack:

| Condition | Boost Factor | Effect |
|-----------|--------------|--------|
| Dry | 0.0 | Base difficulty |
| Wet | 0.5 | 1.5x harder (halfway to next level) |
| OVERTAKE active | 0.5 | 1.5x harder |
| AERO active | Next level | Full next difficulty (via `getHarderDifficulty`) |
| Wet + OVERTAKE | 1.0 (capped) | 2x harder (full next difficulty level) |

### Circuit Rain Probabilities
| Circuit | Rain Chance |
|---------|-------------|
| Spa | 60% |
| Silverstone | 50% |
| Suzuka | 42% |
| Monaco | 25% |
| Monza | 20% |

---

## Reward System

### Coins
| Event | Reward |
|-------|--------|
| Correct answer | 10 coins |
| Correct answer in DRS zone | 20 coins |

### Career Points
| Series | Points | In DRS Zone |
|--------|--------|-------------|
| Karting | 1 | 2 |
| F3 | 1 | 2 |
| F2 | 2 | 4 |
| F1 | 3 | 6 |

### Special Rewards
- **Beat the bot:** Confetti animation + races won counter + circuit championed at current series
- **Beat the bot on F1:** Plays "Simply Lovely" audio

---

## Race Result Calculation

| Condition | Finishing Position |
|-----------|-------------------|
| Beat the bot (finished before bot) | P1 |
| 0 mistakes (bot already finished) | P1 |
| 1-2 mistakes | P2 |
| 3+ mistakes | Position = mistake count (capped at P20) |

Position maps to 2025 F1 driver standings (P1 = Lando Norris, P2 = Max Verstappen, etc.)

---

## Championship Progression System

- Win a race (beat the bot) to **champion** that circuit at the current series
- Championing a circuit at one series unlocks that circuit at the **next** series
- A series becomes available when at least one circuit is championed at the previous series
- Series order: Karting → F3 → F2 → F1
- Practice mode bypasses all series/circuit locks
- Stored as `championedCircuits: { [circuitId]: string[] }` (circuit → list of championed series)

---

## Persistence

### localStorage (permanent)
- Coins, career points, races won
- Championed circuits (progression)
- Personal best times per circuit
- Lap history (last 100 entries)
- Settings (sound, sim mode, power-ups enabled)

### sessionStorage (per session)
- Top 10 lap times for leaderboard display

---

## Audio Cues

| Event | Sound |
|-------|-------|
| Countdown light | 800Hz beep (150ms) |
| Race start | 1200Hz beep (200ms) |
| Correct answer | C5→E5→G5 arpeggio |
| Incorrect answer | 200Hz→100Hz descending sawtooth |
| Keypad press | 600Hz click (40ms) |
| Carousel swipe | 600Hz click (80ms) |
