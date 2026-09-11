# Next session — ship by 3pm

**When:** continue Wednesday 9 Sep 2026. **Must ship by 15:00.**  
**Branch:** `main` @ `5b0b093` (pushed). Working tree was clean after that commit.  
**Weekend:** Round 14 / Madrid (Madring / Circuito IFEMA Madrid). **Do not invent 2025 Barcelona Spanish GP results.**  
**App version in repo:** `1.3.14` (`package.json`). Confirm ASC / iOS build numbers before upload.  
**Last play session:** Tuesday 8 Sep 2026 — Race Day HUD + retire flow.

```bash
git checkout main
git pull
npm run dev          # backend + client, port 8081
```

Open **`http://localhost:8081/game/grand-prix`** — localhost skips Superlicence (`gpOpenOnLocalhost` in `Game.tsx`, `gpOpen` on the Hub card). Phone column is **438px** at `min-width: 640px` (`client/src/index.css`). Prefer a ~438×854 viewport.

---

## What we shipped today (on `origin/main`)

| Commit | What |
|--------|------|
| `d707166` | Weather + live-map HUD gone. Sector squares locked at **18.5px**. Always dry. |
| `fba5157` | Question nudged down; timer locked in place (FP / Practice / Quali). |
| `7c6d19f` | Web stays a centered phone stack (no landscape two-column). GP Practice **3×10** large squares, Quali **2×10**, both **24px** L/R (`largeTenCol`). Race Day = numbers + keypad + color flash. Localhost GP unlock. |
| `cb85a05` | **FINAL LAP** red sign in the reserved `h-11` slot (3 blinks, then gone). Fires when `!isPracticeMode && newProgress === raceLength - 1`. Also in multiplayer. |
| `00141ba` | Race Day clock **24px above the keypad**, 70% of the first big-stack size. Operation = **75% of result**. Operation nudged **12px** down (`translate-y-3`); result locked. Standing `LAP X/Y` removed from this commit (added back later). |
| `32ccba0` | `LAP X/Y` pinned across from the top-right control, **out of flow**, same `top-3` + `p-2` inset as the right control. |
| `5b0b093` | Top-right is **RETIRE** (red letters, no fill). Confirm card → Yes = full-screen red + blinking then held white **DNF** → Paddock (`/hub`). No = back to the race (timer was frozen). |

Race Day is **57 questions** (`SIM_LAP_COUNTS.madrid` / `simLapCount`). A 10-wide sector grid will not fit — do not put one back.

---

## Race Day HUD (current, do not casually restack)

All of this lives in `client/src/pages/Game.tsx` behind `isGpRace` (`isGrandPrix && grandPrixPhase === 'rw_race'`).

```
LAP 1/57                         RETIRE          ← absolute top-3, out of flow
              10 + 4                             ← operation 75% of result, +12px translate
                0                                ← result LOCKED in place
              ⏱ 00:12.345                         ← 24px above keypad (mb-6)
         [AERO] [0%] [OT]
              keypad
```

| Piece | Spec |
|-------|------|
| Result | `clamp(4.5rem, 14vh, 8rem)` — **do not move or resize** |
| Operation | `clamp(3.375rem, 10.5vh, 6rem)` (75% of result) + `translate-y-3` |
| Timer | `clamp(1.4rem, 3.64vh, 2.275rem)`, in `landscape-right`, `mb-6` (24px) above keypad |
| LAP | `absolute top-3 left-3 h-9 p-2`, `pointer-events-none`, Oxanium, muted (white on flash) |
| RETIRE | `absolute top-3 right-3 h-9 p-2`, red letters only (`text-red-600`), `quit` path via confirm |
| Flash | Full-shell purple / green / yellow / red (`GP_RACE_FLASH`). Digits go white ~600ms |
| FINAL LAP | Reserved `h-11` under the answer. Penalty (TRACK LIMITS) wins that slot |
| Header | Hidden. No pause overlay on Race Day (`isPaused && !isGpRace`) |

**Retire path:** RETIRE → `setIsPaused(true)` + confirm **"Retire from Race?"** → No unpauses → Yes shows `fixed inset-0` red, DNF blinks 3× (`1.35s`) then stays **1.2s**, then `quitToPaddock()` → `/hub`.

---

## Locked — do not change unless asked

- **Phone HUD is nailed** for FP / Practice / Quali.
- FP / Practice / Quali **timer:** `clamp(1.25rem, 2.6vh, 1.75rem)`.
- FP / Practice / Quali **question + answer:** `clamp(2.75rem, 7.6vh, 4.75rem)` with the 15% spacer and operation wrapper `mt-6 sm:mt-8`.
- FP **squares:** **18.5px**, 20×5, ~8px inset.
- **Web:** do not split into landscape two-column. Center the 438px phone column.
- GP Practice / Quali keep the large **10-wide** grids + 24px padding.
- Weather is gone (always dry). Live map is gone in play.
- Do not `git push` unless asked. Do not invent calendar results.

---

## Rejected this session (do not revive)

- Lap counter **under** the numbers.
- Timer as a **tiny chip in the top bar** next to LAP.
- Putting the Race Day timer back into the question stack (it belongs above the keypad).
- Red **filled** RETIRE button — letters only.
- Cosmetic pause on Race Day — it is RETIRE now.

---

## Not verified yet (do these tomorrow morning)

1. **FINAL LAP** at question 56 of 57 — coded, never watched live (too many laps).
2. Race Day **color flash** on correct (purple/green/yellow) and wrong (red), including LAP/timer turning white.
3. **Retire → No** keeps the same question and a frozen-then-resumed clock.
4. **Retire → Yes** DNF on a real phone (full-screen red, blink, hold, Paddock).
5. Practice + Qualifying still have their large grids, locked timer, and **pause** (not RETIRE).
6. Free Practice 18.5px grid + locked number sizes.
7. Multiplayer FINAL LAP.
8. iOS / Capacitor build + device pass before 3pm.

Localhost GP unlock is **dev only**. Production still needs Driving School Superlicence.

---

## Ship checklist (Wed, before 15:00)

- [ ] Play Race Day on phone-width in the browser (flash, timer, LAP, retire No/Yes).
- [ ] Spot-check Practice, Qualifying, Free Practice, Hub.
- [ ] `npm run check`
- [ ] Decide version bump (repo is `1.3.14`) and iOS `CURRENT_PROJECT_VERSION`.
- [ ] `npm run build` + `npx cap sync ios` + device/sim run.
- [ ] Upload / TestFlight / store as you usually do for the weekend build.

---

## Key files

| File | Why |
|------|-----|
| `client/src/pages/Game.tsx` | All Race Day HUD, flash, FINAL LAP, retire/DNF |
| `client/src/pages/Multiplayer.tsx` | FINAL LAP in the same reserved slot |
| `client/src/pages/Hub.tsx` | Localhost GP unlock |
| `client/src/components/SectorProgressGrid.tsx` | `largeTenCol` for Practice/Quali |
| `client/src/components/layout/GameLayout.tsx` | `shellStyle` for race flash; `hideHeader` on Race Day |
| `client/src/index.css` | Desktop 438px phone column |
| `client/src/lib/currentGrandPrix.ts` | Round 14 / Madrid / 57 laps |

`SESSION_NOTES.md` is stale. `docs/next-session-handoff.md` **is this file** — ignore the old Hungary / VIEW / WEATHER drum writeup; weather and live-map were removed in `d707166`.
