# Difficulty Lock Choice — Design

**Date:** 2026-07-14  
**Status:** Approved for implementation  
**Branch context:** `main`  
**Related handoff:** `docs/next-session-handoff.md`  
**Related:** Universal dynamic difficulty (2026-07-12), Multiplayer shared dynamic difficulty (2026-07-13)

## Goal

Players can choose **Adaptive** (default) or **Locked** difficulty before racing on Free Practice, Lane Racer, and Multiplayer. Locked pins Karting / F3 / F2 / F1 for the whole race with no promotion/demotion. Adaptive keeps today’s live adaptation.

**Grand Prix is always adaptive** — Practice adapts, then Quali + Race Day use the lock-after-Practice difficulty. No Adaptive/Locked setup control on GP (locking Practice would break the weekend flow).

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Adaptive | Remains available and **default** on surfaces that offer the choice |
| Locked | Pre-race pick Karting / F3 / F2 / F1; **no** promotion/demotion for the race |
| Scope | Free Practice, Multiplayer, Lane Racer — **not** Grand Prix |
| Grand Prix | Always adaptive Practice → lock for Quali + Race (unchanged) |
| MP control | Host sets mode/level; guest **Ready** = accept; host setting changes clear Ready; host cannot start until guest Ready |
| Power-ups | OVERTAKE / AERO still bump question hardness via existing boosts; they do not change the locked base level |
| Soft-follow / championship | Out of scope |

## UX model

Setup / lobby shows a segmented control **Adaptive | Locked**. When Locked, show four level buttons (Karting / F3 / F2 / F1 via existing `DRIVERS` labels).

- Solo preference persisted in `localStorage` (`difficultyMode`, `lockedDifficulty`).
- Factory default: Adaptive; locked level default Karting (`beginner`) when first switching to Locked.
- HUD and finish screens continue to show series labels (live or locked).

## Behavior by surface

### Free Practice
- **Adaptive:** `initDynamicDifficulty('beginner')` + `updateDynamicDifficulty` (unchanged).
- **Locked:** Fixed chosen level; skip `updateDynamicDifficulty`; `difficultyAchieved` = locked level.

### Grand Prix
- No Adaptive/Locked choice. Practice always adapts from beginner; Quali + Race use `grandPrixLockedDifficulty` from end of Practice (unchanged).

### Lane Racer
- Setup: Adaptive | Locked + levels (not a 5-item mixed drum).
- **Adaptive:** Live adapt + HUD; rival pace stays beginner-baseline.
- **Locked:** Fixed questions at chosen level; rival pace uses locked level.

### Multiplayer
- Host sets mode/level in waiting room (editable through track select before start); sync to guest.
- Guest sees read-only mode/level + Ready toggle.
- Host cannot start countdown until guest Ready.
- Host changes to difficulty mode/level clear guest Ready.
- **Adaptive start:** `initDynamicDifficulty('beginner')` + answer-driven updates.
- **Locked start:** `initDynamicDifficulty(lockedLevel)`; do not call `updateDynamicDifficulty`; mint at fixed difficulty; still sync HUD via `difficulty_sync`.

## Data shape

```ts
difficultyMode: 'adaptive' | 'locked'
lockedDifficulty: Difficulty // used when locked; ignored when adaptive
guestReady: boolean // MP only
```

## Engine

No change to `updateDynamicDifficulty` algorithm. Call sites either update or skip updates based on `difficultyMode`.

## Out of scope

- Grand Prix Adaptive/Locked choice (GP Practice always adapts)
- Per-player MP difficulty tracks
- In-race freeze / mid-race mode switch
- Making GP Quali/Race fully adaptive when Practice was Adaptive
- Championship / series unlock redesign
- Soft-follow in browser

## Success criteria

1. Adaptive default preserved on Free Practice, Lane Racer, and Multiplayer.
2. Locked races never promote/demote base difficulty.
3. Grand Prix unchanged: Practice always adapts; Quali/Race lock after Practice.
4. MP Ready gate blocks start until guest accepts; host changes reset Ready.
5. Regulations `#Difficulty` describes both modes (and that GP Practice is always adaptive).
