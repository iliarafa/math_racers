# Flashcard Grade Sounds — Design

**Date:** 2026-08-06
**Status:** Approved

## Problem

Driving School flashcards grade answers purple (fast correct), green (slow correct), or red (wrong), but `playTone(ok: boolean)` in `client/src/pages/DrivingSchool.tsx` only has two sounds: 880Hz square for any correct answer, 220Hz square for wrong. Purple and green sound identical, so the audio gives no feedback about the grade that matters for clearing a stage.

## Design

Replace `playTone(ok)` with `playGradeSound(color: FlashcardColor)`, called from the existing grading site (which already computes `color` via `gradeFlashcard` before the sound plays). F1-themed synthesis, Web Audio only, no assets:

- **Purple — "DRS chirp":** fast rising frequency sweep ~600→1400Hz (sawtooth-leaning timbre, ~0.18s) topped with a short high blip. Reads as fastest-lap / boost engaged — clearly a tier above green.
- **Green — "ding":** single clean sine/triangle ~880Hz with soft decay. Familiar (close to today's correct beep, sweeter timbre).
- **Red — "penalty buzzer":** two slightly detuned low square oscillators ~200Hz, slightly longer than today's buzz.

All sounds keep the current try/catch safety, ~0.1–0.35s duration, and peak gain around the current 0.15.

### Targeted cleanup

The current code creates a new `AudioContext` per card and never closes it; browsers cap live contexts, so long sessions can silently lose audio. Use one lazily created module-level context, resumed if suspended.

### Unchanged

The `soundEnabled` gate, grading logic, re-queue behavior, and all other Driving School behavior. No new files or dependencies.

## Testing

`npm run check` plus manual browser verification: play a stage and confirm each grade produces its distinct sound.
