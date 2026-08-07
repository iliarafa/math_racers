# Setup Cards

How the pre-race setup cards are built, and what a Grand Prix weekend rotation must supply for them. Verified against the code on 2026-08-06.

The **setup card** is the glass "pit wall" panel shown before a race starts. One shared component renders it for all four modes — Free Practice, Grand Prix, Lane Racer, and Multiplayer (host settings) — which is why they always look and behave identically. A mode contributes *data* (rows, readouts, header text, art), never layout.

## Files

| File | Role |
|---|---|
| `client/src/components/setup/RaceSetupCard.tsx` | The card: header, circuit art, track-path rail, start button, help sheet |
| `client/src/components/setup/SetupRow.tsx` | One setting row (label left, value right, tap to cycle) + `SetupOption`/`SetupRowSpec` types |
| `client/src/components/setup/setupRows.ts` | Shared row builders: `operationRow`, `levelRow`, `weatherRow`, `viewRow` |
| `client/src/components/setup/weatherOptions.ts` | The weather option list (`dry` / `wet` / `random`) |

## Card anatomy (top to bottom)

The card is `w-[292px] md:w-[420px]`, rounded glass (`backdrop-blur-xl`, white 12% fill, 20% border).

1. **Eyebrow** — tiny tracked uppercase line (`ROUND 12 · FREE PRACTICE`), centered.
2. **Title line** — centered flex group: a small flag chip (`h-[18px] w-[27px]`, `md:h-5 md:w-[30px]`, `object-cover`, rounded) followed by the circuit/country name (`text-xl md:text-2xl`, nowrap). The old large flag block under the title is gone (2026-08-06) — do not reintroduce it; it was what forced the art to share horizontal space and caused the width↔art tuning cycles.
3. **Circuit art** — centered beneath the title on its own band. See "Art sizing" below.
4. **Track path** — every setting row is a numbered station on a vertical rail (ribbon + dashed centerline); readouts (values shown but not chosen, e.g. GP `LAPS`) are small dot stations; an optional `children` slot rides the rail (Multiplayer's waiting note); the path ends at a checkered node beside the start button. There is **no "THE GRID" label** above the button (removed 2026-08-06).
5. **Start button** — full-width, tone `green` / `amber` / `red` (`TONE_COLORS`), pulse animation, `disabled` support.
6. **Back** — plain text button, only when `onBack` is passed.

A "?" floats absolute in the card's top-right corner when `helpText` is passed (Lane Racer passes none, so it has no "?"), opening a modal sheet with the mode rules. Grand Prix additionally passes `header.phase` (the PRACTICE / QUALIFYING / RACE tabs), which renders between header and stations — those tabs keep their green/amber/red because they are progression state, not settings.

## Art sizing — automatic, per-circuit-tuning-free

The art stage is `w-full overflow-visible mt-2 px-6` plus height classes `h-36 md:h-52` (the `mapStageClass` prop replaces only the height classes; `CURRENT_GRAND_PRIX.mapStageClass` is deliberately `undefined`). The image inside is `object-contain`, centered, with `filter: invert(1)` when `invertMap` (default `true` — assets are dark line art that must render white on the dark card).

Centering in a symmetric box makes the padding around the track **equal on both sides by construction**, for every silhouette:

- **Squat/wide circuits** (Monaco is 410×164, AR 2.5) are capped by the stage *width* — the `px-6` floor guarantees 24px minimum side padding.
- **Tall/square circuits** (Zandvoort is 681×700, AR 0.97) are capped by the stage *height* classes.

So there is **no coupling** between card width, art size, and alignment anymore. If a new circuit's silhouette looks too thin or oddly framed, fix the asset (Spa-framed thin-line art, ~700px wide, dark on transparent) — never add a per-circuit size boost.

## Rows

Rows are data (`SetupRowSpec[]`), so modes with different settings share one layout with no variant prop:

- **Tap to cycle** — tapping a row advances to the next option, wrapping (`Dry → Wet → Random → Dry`). No chevrons, no expansion, constant row height.
- **Locked rows** — a row with a single option renders as a static, non-interactive readout. This is how TRACK appears while `LOCK_MENU_TO_CURRENT_GP` (in `circuitMenuArt.ts`) pins Lane Racer/Multiplayer to the current GP circuit.
- **Thumb options** — an option with `thumb` renders the picture *as* the value (Lane Racer's team cars).
- **Values are plain white** (near-black on the `light` variant used by Multiplayer's waiting room). Per-option colors were removed deliberately on 2026-08-06 (`SetupOption` has no `color` field) — don't reintroduce them.

Shared builders in `setupRows.ts`: `operationRow` (the five maths types), `levelRow` (Adaptive + one rung per series), `weatherRow`, `viewRow` (Track/Sectors). Mode-specific rows (Lane Racer's TRACK/TEAM/CHASE CAM, Free Practice's LAPS) are defined at the call site.

## The four callers

| Surface | Where | Art + flag source |
|---|---|---|
| Free Practice / Grand Prix | `client/src/pages/Game.tsx` (search `<RaceSetupCard`) | `CIRCUIT_MAP_IMAGES[CURRENT_GRAND_PRIX.circuitId]?.black` (map local to Game.tsx) + `CURRENT_GRAND_PRIX.flagImage`; eyebrow `Round N · <mode>` |
| Lane Racer | `client/src/pages/LaneRacer.tsx` | `CIRCUIT_MENU_ART[selectedCircuit.id]` `.image` / `.flag`; eyebrow `LANE RACER` |
| Multiplayer (host settings) | `client/src/pages/Multiplayer.tsx` | `CIRCUIT_MENU_ART[displayCircuit.id]` `.image` / `.flag`; eyebrow `Room <code>`; `LEVEL` readout; waiting note as `children` |

## Weekend rotation — what the setup cards need

Follow the `/weekend` skill (`.claude/skills/weekend/SKILL.md`) for the full rotation. The setup-card-specific facts:

1. **The FP/GP card art follows the config automatically.** `CIRCUIT_MAP_IMAGES` in `Game.tsx` derives its current-GP entry from `CURRENT_GRAND_PRIX.trackImage`, and the card header reads `round`, `name`, and `flagImage` from the same config. For an **existing** circuit, updating `currentGrandPrix.ts` is all the setup cards need.
2. **New circuits additionally need a `CIRCUIT_MENU_ART` entry** (`circuitMenuArt.ts`: silhouette + flag import). While `LOCK_MENU_TO_CURRENT_GP` is `true`, Lane Racer's and Multiplayer's card art and TRACK row come *only* from this map — a missing entry renders an empty hero and an empty TRACK row.
3. **Asset rules** (the classic mistake): the card inverts its art, so `trackImage` must be a **dark** silhouette on transparency, ~700px, thin-line Spa-style framing. The flag chip uses the same `flagImage` as everywhere else, at small size — any normal flag PNG works.
4. **Never size per circuit.** Leave `CURRENT_GRAND_PRIX.mapStageClass` as `undefined`. The centered stage handles every aspect ratio (see "Art sizing"); if a silhouette looks wrong, fix the asset.
5. **QA after rotating**: open Free Practice (`/game/free-practice`), Grand Prix (`/game/grand-prix`), and Lane Racer (`/lane-racer`) — on each, check the silhouette renders white and centered with even side padding, the flag chip + name sit centered above it, and the TRACK row (Lane Racer) names the new circuit.

## Changing the layout safely

- **Card width** (`w-[292px] md:w-[420px]`) is a free choice — nothing else is tuned to it.
- **Art size** has two knobs: the height classes (`h-36 md:h-52`) and the `px-6` side-padding floor. Both live in one line in `RaceSetupCard.tsx`.
- All four modes inherit any card change with no caller edits — verify one surface per mode after layout work.
