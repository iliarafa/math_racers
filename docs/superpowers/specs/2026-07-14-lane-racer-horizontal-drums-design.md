# Lane Racer Horizontal Drums — Design

**Date:** 2026-07-14  
**Status:** Approved for implementation  
**Branch context:** `main` (uncommitted Lane Racer setup WIP)  
**Related handoff:** `docs/next-session-handoff.md`  
**Related:** Difficulty Lock Choice (2026-07-14)

## Goal

Replace the Lane Racer setup **tap rows** for Team, Track, and Math with **horizontal 3-slot drums** — the same combination-lock interaction as the old vertical Team | Track drums, rotated to horizontal and stacked full-width.

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Layout | Stacked full-width rows (not side-by-side columns) |
| Visible slots | Exactly 3: prev \| **selected** \| next |
| Interaction | Swipe + tap neighbors (not free scroll, not scroll-snap) |
| Team / Track / Math | Horizontal 3-slot drums |
| Difficulty | Keep Adaptive \| Locked + locked level text taps |
| Chase Cam | Keep tap toggle (bright red when on) |
| Selection chrome | Opacity / text color only — no pills / gray selection backgrounds |
| Dividers | Spacing only — no hairline section dividers |
| Soft-follow / race logic | Out of scope |

## Setup card order (top → bottom)

1. **Team** — horizontal drum (car previews)
2. **Track** — horizontal drum (circuit map + name)
3. **Difficulty** — Adaptive \| Locked; when Locked, Karting / F3 / F2 / F1 row (existing WIP)
4. **Math** — horizontal drum (operation labels)
5. **Chase Cam** — tap toggle (existing WIP)
6. **Start**

Subtitle under “Lane Racer”: **Swipe to configure** (replaces “Tap to configure”).

## Interaction model

For each drum (Team / Track / Math):

- Show `[-1, 0, 1]` relative to the current index; indexes wrap.
- **Swipe left** → next; **swipe right** → previous (threshold ~30px on `clientX`).
- **Tap** left neighbor → previous; tap right neighbor → next; center is selected (no-op).
- Left / right chevrons on neighbor slots (replacing the old up / down chevrons).
- Opacity: center ~1.0, neighbors ~0.3.
- Short motion on change (~150ms fade, same spirit as today’s vertical drums).

Persistence unchanged:

- Team → `localStorage` `lastSelectedTeam`
- Track / Math / Difficulty / Chase Cam → existing local state / prefs

## Implementation approach

**Rotate the existing drum pattern** (not CSS scroll-snap, not a Framer drag carousel).

- File: `client/src/pages/LaneRacer.tsx` only (setup UI).
- Restore drum helpers (`getIdx`, next/prev, swipe) from the committed vertical drums, but use horizontal flex + `clientX`.
- Extract a small shared `HorizontalDrum` (inline component or helper) used three times for Team / Track / Math so the pattern is not copy-pasted thrice.
- Slot content stays the same visuals as today (team car preview; circuit map + name; math op label).
- Difficulty + Chase Cam remain as in the current uncommitted WIP (text-color selection; Chase Cam `#ff2800` when on).

## Out of scope

- Free Practice / Multiplayer setup layout polish
- Native scroll-snap or free-scroll strips
- New selection chrome / pills
- Race engine, difficulty lock behavior, soft-follow, or other modes
- Adaptive/Locked on Grand Prix

## Acceptance

- Team, Track, and Math each show exactly three slots horizontally with selected centered.
- Swipe and tap neighbors step the selection with wrap-around.
- Difficulty and Chase Cam still work as before this change.
- No hairline dividers between sections; no selection pills.
- Race start still uses the selected team / track / math / difficulty / view.
