# F1 Math Racer - Core Game Flow

## Game States

```
driver_select → selecting → countdown → racing → finished | crashed
```

| State | Description |
|-------|-------------|
| `driver_select` | Player chooses difficulty (racing series) |
| `selecting` | Player chooses circuit, weather, and mode (Race/Practice/Multiplayer) |
| `countdown` | 5-light F1 start sequence |
| `racing` | Active gameplay - answering math questions |
| `finished` | Race completed successfully |
| `crashed` | DNF - exceeded 10 mistakes |

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

| Series | Dry Range | Wet Range (~35% increase) |
|--------|-----------|---------------------------|
| Karting | 1-10 | 1-13 |
| F3 | 10-50 | 10-67 |
| F2 | 20-100 | 20-135 |
| F1 | 50-200 | 50-270 |

### Subtraction (Monaco)

| Series | Dry Range | Wet Range |
|--------|-----------|-----------|
| Karting | 1-10 | 1-13 |
| F3 | 10-50 | 10-67 |
| F2 | 20-100 | 20-135 |
| F1 | 50-200 | 50-270 |

### Multiplication (Monza)

| Series | Dry Range | Wet Range |
|--------|-----------|-----------|
| Karting | 1-5 | 1-6 |
| F3 | 2-10 | 2-13 |
| F2 | 3-12 | 3-16 |
| F1 | 5-15 | 5-20 |

### Division (Suzuka)

| Series | Dry Range | Wet Range |
|--------|-----------|-----------|
| Karting | 1-5 | 1-6 |
| F3 | 2-10 | 2-13 |
| F2 | 3-12 | 3-16 |
| F1 | 5-15 | 5-20 |

### Variables (Silverstone)

| Series | Dry Range | Wet Range | Variable Types |
|--------|-----------|-----------|----------------|
| Karting | 1-5 | 1-6 | Only `x + a = b` |
| F3 | 2-12 | 2-16 | All types |
| F2 | 3-15 | 3-20 | All types |
| F1 | 5-20 | 5-27 | All types |

**Variable equation types:**
- `x + a = b, x = ?`
- `a − x = b, x = ?`
- `ax = b, x = ?`

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
| Race | 20 questions | Yes | Yes | No |
| Practice | Infinite | No | No (just "Try Again") | Yes (loops) |
| Sim Mode | Real lap count | Yes | Yes | No |

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

| Mistake # | Penalty | Time Added |
|-----------|---------|------------|
| 1 | Track Limits | +2 sec |
| 2 | Track Limits Warning | +2 sec |
| 3 | Black & White Flag | +2 sec |
| 4-6 | 5 Second Penalty | +5 sec |
| 7-10 | 10 Second Penalty | +10 sec |
| 11+ | Crash (DNF) | Race ends |

### Sim Mode Penalty Behavior
- Same penalties as Race mode
- Player must answer correctly before advancing (question doesn't change on wrong answer)

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

Base time calculated as: `baseTime × operationModifier × randomFactor(0.75-1.25)`

| Series | Base Time |
|--------|-----------|
| Karting | 2,000ms |
| F3 | 2,500ms |
| F2 | 3,000ms |
| F1 | 3,500ms |

| Operation | Modifier |
|-----------|----------|
| Addition | 0.85 |
| Subtraction | 0.95 |
| Multiplication | 1.15 |
| Division | 1.20 |
| Variables | 1.25 |

---

## Weather System

| Weather | Effect |
|---------|--------|
| Dry | Standard number ranges |
| Wet | Increased number ranges (~35% harder) |
| Random | Uses circuit-specific rain probability |

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
- **Perfect race (0 mistakes):** Confetti animation + races won counter
- **Perfect race on F1:** Plays "Simply Lovely" audio

---

## Race Result Calculation

| Mistakes | Finishing Position |
|----------|-------------------|
| 0 | P1 |
| 1-2 | P2 |
| 3+ | Position = mistake count (capped at P20) |

Position maps to 2025 F1 driver standings (P1 = Lando Norris, P2 = Max Verstappen, etc.)

---

## Persistence

### localStorage (permanent)
- Coins, career points, races won
- Unlocked/equipped items
- Personal best times per circuit
- Lap history (last 100 entries)
- Settings (sound, sim mode, team color)

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
