# Kid-facing Difficulty Ladder + Pro + Lane Racer Pace — Design

**Date:** 2026-07-16  
**Status:** Approved for implementation  
**Branch context:** `main`  
**Related handoff:** `docs/next-session-handoff.md`

## Goal

Make Karting→F1 a kid-reachable Adaptive summit (strong ~8-year-olds can achieve F1). Add **Pro** as a Locked-only opt-in that keeps F1 digit size but raises pace/fact hardness. Give Lane Racer a 1:2:3:4 series speed ladder as a primary hardness lever.

## Problem

Current F1 ranges (e.g. addition 50–200) make Adaptive “success” feel like a grown-up game. The product is primarily for kids (ages 6+).

## Locked decisions

| Topic | Decision |
|-------|----------|
| Kid ladder | Compress `BASE_RANGES` for Karting→F1 (Approach A) |
| Pro shape | Same digits as new F1; harder via tighter `EXPECTED_TIMES` + fact bias |
| Adaptive ceiling | Soft-cap at F1 (`hard`); never promote to Pro |
| Pro access | Locked-only (FP / Lane Racer / Multiplayer) |
| Grand Prix | Practice Adaptive caps at F1; Quali/Race lock that level; no Pro |
| Lane Racer speeds | Karting:F3:F2:F1 = 1:2:3:4 start **and** max; Pro uses F1 speeds |
| Adaptive LR pace | Follows live level; apply on **next question spawn** (not mid-token) |
| Absolute speeds | Tunable knobs; preserve Karting entry feel; F1 start ~2s reaction window |

## Shared engine (`shared/mathEngine.ts`)

### Difficulty type

```ts
type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'pro';
```

### Compressed ranges

| Level | Addition / Subtraction | Multiplication / Division | Variables |
|-------|------------------------|---------------------------|-----------|
| Karting | 1–10 | 1–5 | 1–5 |
| F3 | 1–20 | 2–8 | 2–10 |
| F2 | 5–30 | 2–10 | 3–12 |
| F1 + Pro | 10–50 | 3–12 | 3–15 |

Wet/OVERTAKE must not reintroduce adult triple-digit addends. Next step from F1 is Pro (same number ranges); boosts bias fact hardness / expected time, not range inflation.

### Pro hardness

When `difficulty === 'pro'`:

- `EXPECTED_TIMES` ≈ 75–80% of F1 per operation
- `generateQuestion` fact bias: upper half of F1 range; mult/div prefer factors 6–12
- Bot base time slightly above F1

### Adaptive

Keep ±3 rolling score and slowerThanBot×2. Add optional `maxDifficulty` to `updateDynamicDifficulty` (default `'pro'` for flexibility). Adaptive callers pass `maxDifficulty: 'hard'`.

## Mode wiring

| Mode | Adaptive | Locked |
|------|----------|--------|
| Free Practice | beginner→F1 | Karting…F1 + Pro |
| Grand Prix | Practice→F1; Quali/Race lock | N/A (no Pro) |
| Lane Racer | beginner→F1 + pace ladder | Karting…F1 + Pro; Pro pace = F1 |
| Multiplayer | soft-cap F1 | Host can pick Pro |

## Lane Racer pace

Proposed absolutes (playtest knobs):

| Series | Mult | BASE_SPEED | MAX_SPEED |
|--------|------|------------|-----------|
| Karting | 1× | 2.0 | 5.0 |
| F3 | 2× | 4.0 | 10.0 |
| F2 | 3× | 6.0 | 15.0 |
| F1 / Pro | 4× | 8.0 | 20.0 |

- Adaptive: `pendingPaceDifficulty` → apply on next question; rival uses applied pace
- Locked: pace = locked level for whole race (Pro → F1 speeds)
- Remove “Adaptive always beginner pace” special case

## UI / copy

- Locked pickers include Pro (distinct accent, not F1 red clone)
- Adaptive HUD never shows Pro
- Regulations `#Difficulty`: kid ladder, Pro Locked-only, LR speed ratio
- Docs: Karting–F1 = primary kid curve; Pro = optional harder pace/facts

## Out of scope

- Adult digit ranges as Adaptive targets
- GP Adaptive/Locked UI or GP Pro
- Changing ±3 Adaptive thresholds (unless later playtest)
- Deploy Harvest

## Acceptance criteria

1. Adaptive never leaves F1 for Pro (FP, GP Practice, LR, MP).
2. Locked Pro: F1-sized numbers, snappier expected times, harder fact bias; LR scroll = F1 4×.
3. LR Adaptive: speed steps 1→2→3→4× only on next question after promote.
4. `npm run check` passes.
