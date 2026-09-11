# Desktop web UI for the race screens

> **Revision after first review (same day):** the two-pane composition below was built, reviewed
> in the browser, and replaced by the *cinematic* option from the brainstorm: question and answer
> huge in the centre, HUD in the four corners (clock top-left, pause / RETIRE top-right, sector grid
> bottom-left, power-ups bottom-right), key strip centred along the bottom. `DesktopRaceScreen`
> therefore exposes corner slots rather than `left` / `right` panes, and `RaceHudPane` became the
> smaller `HudClock` / `HudPauseButton` / `HudMessages` in `RaceHud.tsx`. The desktop minimum width
> was lowered from 1024px to 900px after a real laptop window fell below it. A second review moved
> the sector grid into the centre stack between question and answer, and the clock next to the
> pause button top-right, leaving only the mode badge top-left. Detection, page
> integration, iOS guarantee and verification are unchanged.

## Context

The web build of F1 Math Racer is an iPhone screen drawn inside a desktop window. At widths
of 640px and up, `client/src/index.css:115-127` pins the racing screen to a 438px centred
column, and every phone constraint comes with it: the vertical stack, the on-screen keypad
taking the lower half of the column, thumb-sized buttons. Physical keyboard input already
works in `Game.tsx:813-840` and `DrivingSchool.tsx:182-199`, so the keypad on desktop is dead
weight, and two thirds of a laptop screen sits empty.

Decisions taken with the user (brainstorming, 2026-09-10), all approved section by section:

- **"Web" means desktop and laptop browsers only.** Phone browsers keep the phone stack. The iOS
  app (iPhone and iPad) must render byte-identically to today.
- **Scope: racing screens only** (Game, Multiplayer, Driving School, Lane Racer). Menu pages are a
  later pass.
- **Input: keyboard first, with a compact single-row key strip** (digits 0-9, Backspace, Enter),
  clickable for mouse-only children, each key lit when its physical key is pressed.
- **Composition: two panes, answer-dominant.** Left pane (~45%): mode badge, clock, larger sector
  grid, boost/aero pills, energy bar, AERO and OVERTAKE buttons with their shortcut keys printed
  on them. Right pane (~55%): question in very large type, typed answer, the 44px status slot
  (TRACK LIMITS / FINAL LAP / Correct), key strip underneath.
- **Architecture: layout-mode hook plus a desktop render branch per race page.** Phone JSX stays
  byte-identical; desktop returns a new component tree fed the same state and handlers.

## 1. Detection

New pure module `client/src/lib/layoutMode.ts` (pattern: `markWebDocument` in `client/src/lib/webMeta.ts:76-83`):

```ts
export type LayoutMode = 'phone' | 'ipad' | 'desktop';
export const DESKTOP_MIN_WIDTH = 1024;
export interface LayoutInputs { native: boolean; ipadScaled: boolean; finePointer: boolean; innerWidth: number; }
export function readLayoutInputs(): LayoutInputs;   // Capacitor.isNativePlatform(), documentElement.hasAttribute('data-ipad-scale'),
                                                    // matchMedia('(hover: hover) and (pointer: fine)').matches, window.innerWidth; SSR-safe
export function detectLayoutMode(i: LayoutInputs = readLayoutInputs()): LayoutMode;
  // ipadScaled → 'ipad'; native → 'phone'; finePointer && innerWidth >= 1024 → 'desktop'; else 'phone'
export function markDesktopDocument(root = document.documentElement, mode = detectLayoutMode()): boolean; // toggles data-desktop
```

`data-ipad-scale` is stamped by the UA script in `client/index.html:9-38` both inside the app and in
iPad Safari, so an iPad with a Magic Keyboard never gets the desktop tree.

New hook `client/src/hooks/use-layout-mode.ts`, modelled on `client/src/hooks/use-ipad-landscape.ts`:
seeds from `detectLayoutMode()`, re-evaluates on `resize` (rAF-debounced) and on the hover media
query `change`, and calls `markDesktopDocument()` on each update.

`client/src/main.tsx`: call `markDesktopDocument()` right after `markWebDocument()` (line 8) so the
attribute exists before first paint. No `index.css` additions are needed: the desktop tree never
uses `.racing-screen`, so `index.css:115-152` cannot apply, and hover reuses the existing
`web-hover-*` classes.

## 2. Pure helpers: `client/src/lib/keyStrip.ts`

```ts
export const KEY_STRIP_KEYS = ['1','2','3','4','5','6','7','8','9','0','Backspace','Enter'] as const;
export type KeyStripKey = typeof KEY_STRIP_KEYS[number];
export type PowerKey = 'aero' | 'overtake';
export type EchoKey = KeyStripKey | PowerKey;
export const KEY_ECHO_MS = 120;
export function keyForEvent(key: string): KeyStripKey | null;    // '0'-'9', 'Backspace', 'Enter'/'NumpadEnter'
export function powerKeyForEvent(key: string): PowerKey | null;  // '-'|'Clear' → aero; '+'|'='|'\\' → overtake (mirrors Game.tsx 826-832)
export function laneKeyForEvent(key: string): 'left' | 'right' | null; // ArrowLeft/a/A, ArrowRight/d/D (mirrors LaneRacer.tsx 395-402)
export function keyLabel(key: KeyStripKey): string;              // '⌫', '↵', digits as-is
```

Hook `client/src/hooks/use-key-echo.ts`: `useKeyEcho(active: boolean): EchoKey | null`. Own `keydown`
listener that only sets the pressed key and clears it after `KEY_ECHO_MS`. Display-only: never calls
`preventDefault`, never touches answer or submit, so it cannot double-fire with the page handlers.

## 3. Desktop components: `client/src/components/desktop/`

- `DesktopRaceScreen.tsx` — shell: `relative flex-1 flex min-h-0 w-full bg-transparent`, `left` basis
  45%, `right` basis 55%, `children` = overlays (they are `absolute inset-0` and need this relative root).
- `RaceHudPane.tsx` — props `{ badge: ReactNode; clock: string; clockClassName?; subline?: ReactNode;
  sectorGrid: ReactNode; messages: { boost: string|null; aero: string|null; botFrozen? }; powerUps:
  PowerUpControlsProps | null; onPause?: () => void }`.
- `PowerUpControls.tsx` — `{ enabled; aero: PowerUpControl; overtake: PowerUpControl & { energy };
  pressedKey; botFrozen? }` where `PowerUpControl = { available; active; disabled; onActivate }`.
  Shortcut chips `-` and `+` light via `pressedKey`. Generic enough for Game (`handleAero`,
  `handleOvertake`, `aeroAvailable`, `overtakeAvailable`) and Multiplayer (`activateAero`,
  `activateOvertake`, `isAeroAvailable`, `canActivateOvertake`).
- `RaceStatusSlot.tsx` — desktop copy of the 44px slot (`Game.tsx:3160-3210`, `Multiplayer.tsx:1639-1689`):
  `{ showPenalty; showBlackWhiteFlag; showFinalLap; onFinalLapDone; showCorrect }`.
- `QuestionPane.tsx` — `{ questionDisplay; answerDisplay; feedback; penaltyFlash: string|null;
  status: RaceStatusSlotProps; keyStrip: KeyStripProps; flashWhite? }`.
- `KeyStrip.tsx` — `{ onKey(key: KeyStripKey); pressedKey; disabled?; submitDisabled?; className? }`.
  Buttons are `type="button" tabIndex={-1}` with `onPointerDown` + `preventDefault` so no key button
  ever holds focus (prevents Enter double-submit). Lit when `pressedKey === key`. Hover via `web-hover-darken`.
- `LaneKeyHints.tsx` — `pointer-events-none absolute bottom-4 inset-x-0` row of kbd chips (`← / A`, `D / →`),
  lit through `laneKeyForEvent`.

`client/src/components/SectorProgressGrid.tsx:129-134`: add optional `cellMax?: number` defaulting to
`18.5` so the emitted style is unchanged for existing callers; desktop passes ~26.

## 4. Page integration

**Game.tsx** (racing return 2824-3516)
- Call `const layoutMode = useLayoutMode()` next to `useIpadLandscape()` at line 375 (before early returns).
- Hoist lines 2874-3063 (GP LAP/RETIRE chrome, retire confirm, DNF flash, pause overlay, PST session log)
  into `const raceOverlays = (<>…</>)` placed after `sectorGrid` (2851). Phone branch renders
  `{raceOverlays}` as the first child of `.racing-screen` (2873). A fragment emits no DOM node and the
  children keep their order, so phone output is identical.
- Build `desktopSectorGrid` next to `sectorGrid` (same props, `cellMax={26}`, `className="my-0"`); null on GP Race Day like `sectorGrid`.
- Inside the unchanged `<GameLayout>` (2854, keeps `hideHeader={isGpRace}` and `shellStyle`):
  `layoutMode === 'desktop' ? <DesktopRaceScreen left={<RaceHudPane …/>} right={<QuestionPane …/>}>{raceOverlays}</DesktopRaceScreen> : <existing .racing-screen div>`.
  The name-prompt overlay (3431-3512) stays where it is: a `fixed` sibling shared by both branches.
- Desktop wiring: `onKey` digit → `setAnswer(prev => prev + d); playKeypadClick()`; Backspace → slice;
  Enter → `handleSubmit()`; all gated on `!isPaused && feedback === 'idle'` exactly like the phone
  buttons at 3364-3411. Aero → `handleAero()` guarded `aeroAvailable && !aeroActive && !isPaused`;
  overtake → `handleOvertake()` guarded as at 3342. `flashWhite = isGpRace && !!gpRaceFlash`.
  Badge row built inline from `isPreSeasonTesting / isGpRace / isGrandPrix / grandPrixPhase / isQuickRace / isPracticeMode`
  (same conditions as 3067-3096).

**Multiplayer.tsx** (racing block 1569-1878)
- Add the missing keyboard `useEffect` after `handleSubmit` closes at line 1092 (before `formatTime`):
  guard `gameStatus === 'racing' && feedback === 'idle'`; digits/Backspace → `setAnswer`; Enter →
  `handleSubmit()`; `-`/`Clear` → `activateAero()` if `isAeroAvailable && !aeroActive`; `+`/`=`/`\` →
  `activateOvertake()` if `overtakeActive || canActivateOvertake`. Render output unaffected.
- Same desktop branch inside its `<GameLayout>` (1576). `currentQuestion` from 1571-1573; grid props from 1693-1709
  (`layout="dual"`, rival shown); `penaltyFlash = showPenaltyText`; subline = the difficulty strip (1596-1602).

**DrivingSchool.tsx** (session block 253-384)
- Hoist lines 268-323 (counter row + `AnimatePresence` flashcard) into `const flashcard`; phone branch renders it in place.
- Desktop branch under the same `<GameLayout>` (255-264): `DesktopRaceScreen` with left = counters
  (`Card n/N`, `Lap n`, `p/N purple`) plus the grade colour legend (`CARD_LIT`), right = `flashcard` above a
  `KeyStrip` wired to `setAnswer` / `submitAnswer()` (160), `disabled={feedback !== 'idle'}`.

**LaneRacer.tsx** (racing block 609-716, lane steering, no keypad)
- `layoutMode === 'desktop' && isRacing && <LaneKeyHints/>` inside the canvas wrapper (666). Nothing else;
  the `fixed inset-0` shell and 3D canvas already fill a wide viewport.

## 5. Implementation order

1. `lib/keyStrip.ts`, `lib/layoutMode.ts` + `client/src/lib/keyStrip.test.ts`, `client/src/lib/layoutMode.test.ts`. `npm test`, `npm run check`.
2. `use-layout-mode.ts`, `use-key-echo.ts`, `main.tsx` stamp. Dev server (port 8081): `data-desktop` present at 1440x900, absent at 390x844. No visual change yet.
3. Desktop components + `SectorProgressGrid.cellMax`. `npm run check`.
4. Game.tsx: baseline screenshots first (see 6), then hoist + branch. Re-diff baseline, then desktop review.
5. Multiplayer keydown + branch. 6. DrivingSchool. 7. LaneRacer hints. `npm run check` + `npm test` after each.
8. iOS simulator comparison (see 6).

## 6. Verification

- **Unit:** `npm test`. `layoutMode.test.ts`: native phone, native iPad (flag), iPad Safari (flag, fine pointer, wide),
  phone browser, touch laptop (no fine pointer), desktop at 1023 vs 1024. `keyStrip.test.ts`: digits, Backspace,
  Enter/NumpadEnter, `-`/`Clear`, `+`/`=`/`\`, arrows/A/D, unknown keys → null.
- **Types:** `npm run check`.
- **Phone output unchanged (web):** before touching Game.tsx, Playwright screenshots at 390x844 of Free Practice,
  Quick Race, GP practice/qualifying/race day, PST with BOX log, pause, retire confirm; and at 1366x1024 with
  `data-ipad-scale` set manually for the iPad landscape split. Re-capture after each page change and require
  a zero-pixel diff.
- **Desktop review:** 1440x900 and 1280x720 for every mode above plus Multiplayer (two tabs), Driving School,
  Lane Racer. Type answers and watch the key echo, click keys with the mouse, `-`/`+` power-ups, resize across
  1024px mid-race and back. 375px width still shows the phone stack.
- **iOS:** `npm run build && npx cap sync ios`, build to the iPhone 17 Pro Max and iPad Pro 13-inch (M5) simulators
  named in `app_store/README.md`, `xcrun simctl status_bar … override` for a clean bar, `xcrun simctl io <udid> screenshot`
  of the same screens on the pre-change and post-change builds; `cmp` must report identical files.

## 7. Risks and edge cases

- Resize across 1024px mid-race swaps trees; state lives in the page so the race continues, but framer-motion
  animations restart. Acceptable; rAF debounce in the hook avoids thrash.
- Browser zoom shrinks `innerWidth` (1440 at 150% = 960 → phone stack). Documented, not chased.
- GP Race Day: `hideHeader` and `gpRaceFlash` stay on GameLayout; desktop panes are `bg-transparent`; LAP/RETIRE
  chrome positions against the shell's relative root; `flashWhite` on both panes.
- `tabIndex={-1}` on key-strip buttons is load-bearing against Enter double-submit.
- After this pass, write the spec to `docs/superpowers/specs/2026-09-10-desktop-race-ui-design.md` from this plan
  and commit it alongside the first implementation step, per the brainstorming workflow.
