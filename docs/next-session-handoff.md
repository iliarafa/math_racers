# Next Session Handoff — Selection Chrome Consistency

**Branch:** `feature/lane-racer-3d` (pushed to `origin`)  
**Base:** `main`  
**Last updated:** 2026-07-12 (EOD)  
**Status:** 3D Lane Racer playable POC; selection polish started on Lane Racer only

---

## Resume here (start here)

```bash
git checkout feature/lane-racer-3d
npm run dev -- --port 8081
```

### First order of business (do this first)

**Apply Lane Racer selection-drum styling to every mode that uses a selection drum (or the same “selected = outlined box” pattern), for visual consistency.**

**Design rule (locked on Lane Racer setup):**
- **No selection outlines / rings / cyan borders** around the active tile
- Selection is shown by **activated content only** — full opacity, stronger type/color, neighbors faded
- Keep structural chrome if needed (card glass border, View mode card frame) — those are containers, not “selected item” outlines

**Reference (already done):** `client/src/pages/LaneRacer.tsx` setup “Combination Lock” drums + math ops  
- Removed `activeHighlight` border boxes  
- Math ops: no selected border; light fill + brighter text only  
- View control: tap-to-toggle **mode card** (`3D Chase` / `2D`), not a segmented pill

**Audit inventory (as of 2026-07-12):**

| Surface | Pattern today | Action |
|---------|---------------|--------|
| **Lane Racer** setup drums | Content activation only | Done — reference |
| **Lane Racer** math ops | Soft fill, no outline | Done |
| **Career / Game** (`Game.tsx`) | No 3-row drum; weather + ops use `ring-2` selected chips | Apply same rule: drop rings; show selection via opacity / fill / icon emphasis |
| **Multiplayer** (`Multiplayer.tsx`) | Weather + ops use `ring-2` | Same as Game |
| Other pages | No combination-lock drums found | Re-audit if a drum was added elsewhere |

**Acceptance for first order:**
1. No mode’s primary picker uses a cyan/teal or colored **outline ring** to mark the selected drum/chip when a faded/bright content treatment is enough  
2. Lane Racer, Career (Game), and Multiplayer feel consistent when picking series/track-adjacent options and math/weather chips  
3. `npm run check` passes; spot-check setup screens on phone + desktop

**Suggested approach:**
1. Grep for `ring-2`, `activeHighlight`, `0,210,190`, `1.5px solid` in `client/src/pages/`  
2. Patch Game + Multiplayer weather/operation selected styles to match Lane Racer math ops (no ring)  
3. If any true drum clones appear, copy Lane Racer’s opacity/size activation pattern  
4. Optional follow-up: extract a tiny shared helper/component for “drum row” / “chip selected” so styles don’t drift  

---

## Done this session (context for next agent)

### Lane Racer 3D motion & start
- Continuous `carX` + conditional early/late lane feel (`laneRacerController3d.ts`)
  - Early: 250ms ease-in-out smoothstep, **no lean**
  - Late (token `z >= LATE_SLIDE_Z`): 300ms, yaw 10° / roll 5°
- Soft land (no curb-bounce ease-out)
- Race start: 3D primed under starting lights (shared countdown+racing shell); camera lookAt + first-frame skip
- Specs/plans under `docs/superpowers/specs/` and `docs/superpowers/plans/` for lane-flow + conditional slide

### Lane Racer setup UI
- Selection outlines removed (drums + math)
- View: mode card **3D Chase** / **2D** (choice **B** from visual brainstorm)

### Git
- Branch pushed: `origin/feature/lane-racer-3d`
- Tip includes setup UI commits through mode card (`24a53b6` and later as landed)

---

## After first order — Lane Racer 3D backlog

Do **not** start these until selection consistency is signed off (unless user redirects).

1. **Merge QA** — phone + desktop, 2D regression, user sign-off on 3D feel  
2. **Roadside props** — billboards / barriers (atmosphere done; props deferred)  
3. **Token readability** — spawn scale / contrast  
4. **Rival** — DOM progress ghost only; 3D opponent optional later  

### Do not reopen without reason
- Car silhouette v1  
- Soft atmosphere approach  
- Conditional slide timing/lean peaks (tune `LATE_SLIDE_FRACTION` only if band feels wrong)  
- 2D engine removal  

### Related docs
- `docs/lane-racer-3d-handoff.md` — full 3D POC handoff  
- `docs/superpowers/specs/2026-07-12-lane-racer-3d-conditional-slide-design.md`  
- `docs/superpowers/specs/2026-07-12-lane-racer-3d-lane-flow-design.md`  

---

## How to verify first-order work

```bash
npm run check
npm run dev -- --port 8081
```

- `/lane-racer` — drums/math already outline-free; View mode card still clear  
- `/game` (Career / Free Practice / GP / PST setup) — weather & math chips without selection rings  
- `/multiplayer` host setup — same for weather & ops  

---

## Note for the next agent

Lane Racer is currently the **only** true 3-column selection drum. “All modes that feature a selection drum” still means **audit + fix every analogous selected-item chrome** (especially `ring-2` chips in Game/Multiplayer) so the product doesn’t look like Lane Racer is on a different design system. If you find another drum, treat Lane Racer’s setup block as the source of truth.
