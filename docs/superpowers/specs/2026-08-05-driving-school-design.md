# Driving School — Design

**Date:** 2026-08-05  
**Status:** Approved for implementation

## Navigation

**Paddock Menu A:** Weekend Briefing → Quick Race → **RACE WEEKEND** → **DRIVING SCHOOL** → Garage

**RACE WEEKEND drill-in:** Free Practice · Grand Prix · Lane Racer

**DRIVING SCHOOL drill-in:** FLASHCARDS → `/driving-school` · REACTION TEST → `/reaction`

Remove Reflex tile from Garage. Reaction Test `backHref` → `/hub` (Driving School context).

## Flashcards

- 10 gated stages (stage 1 open; clear N unlocks N+1)
- 20 cards per stage; numpad answers
- Colors: wrong = red; correct & ≥ 0.5×botTime = green; correct & &lt; 0.5×botTime = purple
- Finish deck → re-queue non-purple until all purple → stage cleared
- Progress in localStorage
- Standalone page; reuse `generateQuestion` + race timing

## Stages

1. Addition up to 10  
2. Addition up to 20  
3. Subtraction up to 10  
4. Subtraction up to 20  
5. Multiplication up to 5  
6. Multiplication up to 8  
7. Multiplication up to 10  
8. Division up to 5  
9. Division up to 8  
10. Division up to 10  
