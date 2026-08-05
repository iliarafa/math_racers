# Driving School — Implementation Plan

## Files

| File | Role |
|------|------|
| `docs/superpowers/specs/2026-08-05-driving-school-design.md` | Spec |
| `client/src/lib/drivingSchool.ts` | Stages, deck builder, grading, progress |
| `client/src/pages/DrivingSchool.tsx` | Flashcards UI |
| `client/src/pages/Hub.tsx` | RACE WEEKEND + DRIVING SCHOOL drill-ins |
| `client/src/pages/Garage.tsx` | Remove Reflex |
| `client/src/pages/ReactionTest.tsx` | Back → `/hub` |
| `client/src/App.tsx` | `/driving-school` route |

## Verify

1. Paddock: RACE WEEKEND under Quick Race; DRIVING SCHOOL under it  
2. Driving School → Flashcards / Reaction Test  
3. Garage has no Reflex tile  
4. Stage 1 playable; clear all-purple unlocks stage 2  
5. `npm run check`  
