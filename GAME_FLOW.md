# F1 Math Racer - Core Game Flow

## Game States

```
driver_select → selecting → countdown → racing → finished | crashed
```

| State | Description |
|-------|-------------|
| `driver_select` | Player chooses difficulty (tire compound) |
| `selecting` | Player chooses circuit, weather, and mode (Race/Practice/Multiplayer) |
| `countdown` | 5-light F1 start sequence |
| `racing` | Active gameplay - answering math questions |
| `finished` | Race completed successfully |
| `crashed` | DNF - exceeded 10 mistakes |

---

## Difficulty System (Tire Compounds)

| Compound | ID | Difficulty | Number Range (Dry) | Number Range (Wet) |
|----------|-----|------------|-------------------|-------------------|
| Soft | `rookie` | Easy | 2-10 | 2-15 |
| Medium | `pro` | Medium | 5-15 | 5-25 |
| Hard | `champion` | Hard | 10-20 | 10-30 |

---

## Circuits & Math Operations

| Circuit | ID | Operation | DRS Zones | Sim Laps |
|---------|-----|-----------|-----------|----------|
| Monza | `monza` | Multiplication | 2, 8 | 53 |
| Spa | `spa` | Addition | 2, 8 | 44 |
| Monaco | `monaco` | Subtraction | 0, 5 | 78 |
| Suzuka | `suzuka` | Division | 0, 7 | 53 |
| Silverstone | `silverstone` | Variables | 3, 7 | 52 |

### Question Generation Examples

| Operation | Example |
|-----------|---------|
| Multiplication | `7 × 8 = ?` |
| Addition | `34 + 27 = ?` |
| Subtraction | `45 − 18 = ?` |
| Division | `72 ÷ 8 = ?` |
| Variables | `x + 5 = 12, x = ?` or `3x = 15, x = ?` |

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

### Base Speed by Difficulty
| Difficulty | Base Time | Range (±30%) |
|------------|-----------|--------------|
| Easy | 2,200ms | 1,540-2,860ms |
| Medium | 2,800ms | 1,960-3,640ms |
| Hard | 3,500ms | 2,450-4,550ms |

### Bot Time Calculation (per question)
```
baseTime × operationModifier × randomFactor(0.75-1.25)
```

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
| Wet | Increased number ranges (~50% harder) |
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
| Difficulty | Points | In DRS Zone |
|------------|--------|-------------|
| Easy | 1 | 2 |
| Medium | 2 | 4 |
| Hard | 3 | 6 |

### Special Rewards
- **Perfect race (0 mistakes):** Confetti animation + races won counter
- **Perfect race on Hard:** Plays "Simply Lovely" audio

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
