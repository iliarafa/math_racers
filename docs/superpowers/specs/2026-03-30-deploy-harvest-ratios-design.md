# DEPLOY/HARVEST: An Introduction to Ratios

**Date:** 2026-03-30
**Status:** Design approved

## Overview

Two-part feature inspired by the F1 2026 energy management regulations:

1. **Jeddah Ratios Circuit** — A 6th circuit in career mode dedicated to ratio math problems
2. **DEPLOY/HARVEST Mode** — A standalone game mode with real-time energy management, ratio questions, and stint-based racing

The 2026 regs introduced a 50/50 ICE-to-electrical power split, giving drivers manual control over energy deployment and harvesting. The resulting speed differentials (40-60 km/h mid-corner) are fundamentally a ratio problem — making this the perfect thematic wrapper for teaching ratios.

## Part 1: Jeddah Ratios Circuit (Career Mode)

### Circuit Definition

| Field | Value |
|-------|-------|
| Circuit ID | `jeddah` |
| Operation | Ratios |
| Theme | "The Energy Corridor" — high-speed street circuit with massive speed deltas |
| Rain probability | 0.30 (arid climate, occasional rain) |
| Sim lap count | 50 (matches real Jeddah GP distance) |

### Integration

- Added to the `CIRCUITS` array in `gameLogic.ts` alongside spa, monaco, monza, suzuka, silverstone
- Follows identical championship progression rules (champion at Karting to unlock at F3, etc.)
- Bot AI gets a `ratios` operation modifier of ~1.20x (similar to division)
- Weather, power-ups (OVERTAKE/AERO), penalties all work identically to other circuits
- All answers are positive integers — compatible with existing numeric keypad

### Ratio Question Types by Difficulty

**Karting (ages 6-8) — Concrete ratios:**
- "For every X, there are Y" pattern with missing value
- Example: "For every 2 red cars, there are 3 blue cars. If there are 6 red cars, how many blue?" → 9
- Numbers: multipliers 1-5, base ratios using numbers 1-10

**F3 (ages 8-10) — Equivalent ratios & simplifying:**
- Complete equivalent ratios: "3:5 = ?:15" → 9
- Simplify ratios: "Simplify 12:8. What is the first number?" → 3
- Numbers: ratios up to 50, multipliers up to 10

**F2 (ages 10-12) — Proportions:**
- Word problems: "If 4 laps use 12 units of energy, how many units for 10 laps?" → 30
- Ratio comparisons: "Which is greater: 3:4 or 5:8? Enter 1 for first, 2 for second." → 1
- F1-themed proportions: "A car deploys 3 units for every 2 it harvests. After 15 deploys, how many harvests?" → 10
- Numbers: ratios up to 100, multi-step reasoning

**F1 (ages 12+) — Rates & inverse proportion:**
- Unit rate problems: "Car A uses 5 units per 3 laps. How many units does A use in 12 laps?" → 20
- Efficiency comparisons: multi-step rate calculations
- All answers constrained to positive integers (no negative keypad input)
- Uses upper end of number ranges

## Part 2: DEPLOY/HARVEST Mode

### Entry Point & Navigation

- **Welcome page card:** Displays "DEPLOY/HARVEST" only (no subtitle on the mode selection card)
- **Route:** `/deploy-harvest`
- **Page file:** `DeployHarvest.tsx`
- **Subtitle "An Introduction to Ratios"** appears inside the mode (pre-race screen, regulations)

### Pre-Race Setup

- Difficulty selection: Karting / F3 / F2 / F1
- Driver selection: uses `lastSelectedDriverId` from localStorage
- Brief lore card explaining the 2026 energy crisis and deploy/harvest concept
- "LIGHTS OUT" button to start
- No circuit selection (always Jeddah), no operation selection (always Ratios)

### Race Structure: 3 Stints

The race consists of 3 stints of 15 questions each (45 total), with ratio feedback screens between stints.

```
Stint 1 (15 Qs) → Ratio Review → Stint 2 (15 Qs) → Ratio Review → Stint 3 (15 Qs) → Race End
```

Starting energy: 50%. Bot races alongside at steady pace.

### Core Mechanic: Deploy/Harvest Toggle

The player toggles between two modes at will using a single button press:

**DEPLOY MODE (green):**
- Harder ratio questions (one tier above selected difficulty; F1 deploy uses the `BOOSTED_HARD` ranges from gameLogic.ts — same pattern as wet weather boosting)
- 2x progress per correct answer
- Energy drains -7% per question answered (correct or wrong)
- Wrong answer: additional -8% penalty (-15% total)
- Visual: green glow, speed lines, "DEPLOYING" indicator

**HARVEST MODE (blue):**
- Base difficulty ratio questions (selected tier)
- 1x progress per correct answer (standard)
- Energy recharges +7% per correct answer
- Wrong answer: no recharge (+0%)
- Visual: blue glow, regen particles, "HARVESTING" indicator

Energy is clamped to [0, 100]. Harvesting past 100% is wasted time.

### Derating (0% Energy)

Triggered when energy hits 0 during deploy:

- **Forced harvest lockout** for 3 questions (toggle button disabled)
- Questions at base difficulty (harvest level)
- **0.5x progress** per correct answer (half speed — sitting duck)
- **Bot gets 1.5x speed** during lockout
- Battery recovers to **30%** after lockout ends
- Visual: red warning flash, "DERATING" text, dimmed energy bar

### Between-Stint Ratio Feedback

After each stint (questions 15 and 30), a review screen appears showing:

- **Player's actual deploy:harvest ratio** (e.g., "9 : 6") and simplified form ("3 : 2")
- **Deploy accuracy** — percentage of correct answers while deploying
- **Harvest accuracy** — percentage of correct answers while harvesting
- **Optimal ratio range** — computed from player's difficulty and accuracy:
  - Higher accuracy → optimal shifts toward more deploying
  - Lower accuracy → optimal shifts toward more harvesting
  - Shown as a range, not a single answer (teaches ratios as relationships)
- **Insight text** — contextual tip about their strategy (e.g., "You deployed aggressively at 3:2 vs optimal 2:1. Harvesting one more per cycle would maintain higher accuracy on harder questions.")

### Bot AI

- Uses existing `calculateBotResponseTime` with ratios operation modifier (1.20x)
- Bot runs at steady pace — no deploy/harvest states
- Bot speed modifiers:
  - Normal: standard pace (same as career)
  - During player derating: 1.5x speed (punishes over-deployment)
- Bot difficulty scaling: Karting 4000ms → F1 2000ms base (same as career)

### Winning Condition

- First to complete 45 sectors (15 per stint × 3 stints)
- If both finish: fewer mistakes wins, then faster total time
- Same tiebreak logic as existing career races

### Energy System Constants

| Parameter | Value |
|-----------|-------|
| Starting energy | 50% |
| Deploy drain per question | -7% |
| Deploy wrong answer bonus penalty | -8% (total -15%) |
| Harvest recharge per correct | +7% |
| Harvest recharge on wrong | +0% |
| Derating lockout duration | 3 questions |
| Derating progress multiplier | 0.5x |
| Derating bot speed multiplier | 1.5x |
| Derating recovery energy | 30% |
| Energy range | [0, 100] |

## Technical Architecture

### New Files

| File | Purpose |
|------|---------|
| `client/src/pages/DeployHarvest.tsx` | Race UI, deploy/harvest toggle, stint management, ratio feedback screens |
| `client/src/lib/ratioQuestions.ts` | Ratio question generator for all 4 difficulty tiers, answer validation |

### Modified Files

| File | Change |
|------|--------|
| `client/src/lib/gameLogic.ts` | Add `jeddah` to CIRCUITS, add `ratios` operation type, bot AI modifier for ratios |
| `client/src/App.tsx` (or router) | Add `/deploy-harvest` route |
| `client/src/pages/Welcome.tsx` | Add "DEPLOY/HARVEST" mode card |
| `client/src/pages/Regulations.tsx` | Add Jeddah circuit rules, Ratios explanation, Energy Management mode rules |
| `shared/schema.ts` | Add `ratios` to operation types if needed |

### Imports from gameLogic.ts (not duplicated)

- `calculateBotResponseTime` — bot timing with ratios modifier
- Difficulty level definitions and curves
- Championship progression checks (`isCircuitUnlockedForSeries`)
- Circuit/series constants

### New in DeployHarvest.tsx

- Deploy/harvest state machine (toggle, derating lockout, recovery)
- Stint manager (15-question stints, transition screens between stints)
- Ratio feedback calculator (deploy:harvest ratio, simplification, optimal comparison)
- Energy drain/recharge per-question logic (question-based, not time-based like OVERTAKE)

### Key Difference from OVERTAKE

The existing OVERTAKE energy system is **time-based** (drains over 5 seconds on a timer). DEPLOY/HARVEST energy is **question-based** (drains/recharges per answer). This is deliberate — it ties energy management directly to math performance, not reaction speed.

## Scope Boundaries

**In scope:**
- Jeddah career circuit with ratio questions across 4 difficulty levels
- DEPLOY/HARVEST standalone mode with full stint system
- Between-stint ratio feedback and analysis
- Regulations page updates
- Bot AI racing in the new mode

**Out of scope (future follow-ups):**
- Leaderboard for DEPLOY/HARVEST mode
- Multiplayer energy management
- Weather system in DEPLOY/HARVEST (keep it focused on the energy mechanic for v1)
- Sound effects specific to deploy/harvest (reuse existing where possible)
