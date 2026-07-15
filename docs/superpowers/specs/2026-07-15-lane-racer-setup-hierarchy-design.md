# Lane Racer Setup Hierarchy — Design

**Date:** 2026-07-15  
**Status:** Approved  
**Branch context:** `feature/lane-racer-horizontal-drums`  
**Related:** `docs/next-session-handoff.md`, horizontal drums (2026-07-14), difficulty lock choice (2026-07-14)

## Goal

Replace the Lane Racer **two-screen** setup with a **single screen** that has clear visual hierarchy: Track as hero, secondary controls quieter inside glass, Start at the bottom. Honor existing app aesthetic (Oxanium, frosted glass, selection = color/opacity only).

## Problem

The current two-screen Continue flow and equal-weight drum rows feel structurally wrong and visually flat: no clear hero, sparse selected+chevron rows, and loud section chrome fighting the content.

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Screen count | **One screen** — all controls + Start (no Continue / setupStep) |
| Structure | Approach **C** — Track outside glass; secondary settings inside glass |
| Fallback | Approach **A** (Track hero still on top, but Track also inside the same glass card) if C feels too split after try — keep A in mind; do not implement both |
| Order (top → bottom) | Track → Team → Difficulty → Operation → Chase Cam → Start |
| Track | Hero: circuit map + name; selected + flanking chevrons + swipe |
| Team | Compact car thumbnail only (no team name); selected + chevrons + swipe |
| Difficulty | Existing 5-option drum (Adaptive, Karting, F3, F2, F1) + difficulty colors |
| Operation | Compact selected + chevrons (math symbol) |
| Chase Cam | Text toggle; `#ff2800` when on; soft-follow remains Capacitor-native only |
| Labels | Whisper: tiny low-opacity row labels inside glass; **no** Track section header above hero (name under map is enough); **no** “Swipe to configure” / step subtitle |
| Dividers | Spacing only — no hairline section dividers |
| Selection chrome | Text color / opacity only — no gray selection pills |
| Glass | Keep frosted glass panel for secondary block (`rgba(255,255,255,0.08)` + blur + light border); match existing app glass language |
| Persistence | Unchanged localStorage / prefs keys |

## Layout

```
[ Back ]              [ Logo ]

                   LANE RACER

            ‹  [ circuit map ]  ›
                   MONZA

        ┌─────────────────────────┐
        │ TEAM     ‹ [car] ›      │
        │ DIFF     ‹ Adaptive ›   │
        │ MATH     ‹ × ›          │
        │      CHASE CAM          │
        └─────────────────────────┘

                    START
```

## Interaction

- Horizontal drums: swipe left/right (~30px), chevron tap, arrow keys — same `HorizontalDrum` pattern as today (selected only + chevrons; no neighbor peeks).
- Chase Cam: tap whole control to toggle 2D ↔ 3D.
- Start: begins race with current selections (same as today’s `startGame`).

## Implementation notes

- Primary file: `client/src/pages/LaneRacer.tsx` setup branch.
- Remove `setupStep` / identity→race Continue flow and back-chevron that returned to identity.
- Back chevron returns to Game hub (as on today’s first setup screen).
- Extract or tune drum row heights so Track hero is larger; Team/Diff/Op rows stay compact.
- Do not reopen garage preview or 3-slot neighbor peeks.
- Race engine, difficulty lock behavior, soft-follow policy, FP/MP setup: out of scope.

## Acceptance

- One setup screen; no Continue step.
- Track is visually dominant and sits outside the glass card.
- Team shows compact car only between chevrons.
- Whisper labels; no step subtitle; no hairline dividers; no selection pills.
- Difficulty Adaptive/Locked series options and Chase Cam behavior unchanged.
- Race start still uses selected track / team / difficulty / operation / render mode.
- Fallback A not built unless user asks after trying C.

## Out of scope

- Neighbor peeks / garage-preview setup
- Free Practice / Multiplayer setup polish
- Grand Prix Adaptive/Locked UI
- Soft-follow in browser
- Race logic / 3D engine changes
