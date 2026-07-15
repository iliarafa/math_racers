# Lane Racer Setup Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lane Racer’s two-screen setup with one screen: Track hero outside glass, compact Team/Diff/Math/Cam inside glass, Start at bottom.

**Architecture:** Collapse `setupStep` out of `LaneRacer.tsx`. Extend `HorizontalDrum` with an optional `itemHeight` so Track can be taller than compact rows. Restructure setup JSX to match approach C from the approved spec.

**Tech Stack:** React 19, Framer Motion, Lucide chevrons, existing setup state in `client/src/pages/LaneRacer.tsx`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-lane-racer-setup-hierarchy-design.md`
- File scope: `client/src/pages/LaneRacer.tsx` (+ handoff note)
- One screen only — remove `SetupStep`, Continue, identity→race back chevron
- Order: Track (outside glass) → Team → Difficulty → Operation → Chase Cam → Start
- Team: compact car thumbnail only (no team name)
- Whisper labels inside glass; no Track section header; no step subtitle
- No hairline dividers; no selection pills; no neighbor peeks; no garage preview
- Difficulty drum + Chase Cam behavior + persistence keys unchanged
- Soft-follow remains Capacitor-native only
- Do not implement fallback A unless user asks after trying C
- Do not change race logic, FP, MP, or GP

---

## File map

| File | Role |
|------|------|
| `client/src/pages/LaneRacer.tsx` | Remove two-screen flow; Track hero outside glass; compact glass rows; `HorizontalDrum` height prop |
| `docs/next-session-handoff.md` | Record one-screen hierarchy; unlock prior “two screens” product note |

No new packages. No new component files.

---

### Task 1: `HorizontalDrum` height + remove two-screen state

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`
- Test: `npm run check`

**Interfaces:**
- Consumes: existing `HorizontalDrum` props
- Produces:
  - `HorizontalDrum` gains optional `itemHeight?: number` (default `80`)
  - Remove `type SetupStep` and `const [setupStep, setSetupStep]`

- [ ] **Step 1: Add `itemHeight` to `HorizontalDrum`**

Change the props type and body so height is configurable:

```tsx
function HorizontalDrum({
  length,
  currentIndex,
  onPrev,
  onNext,
  renderItem,
  testIdPrefix,
  ariaLabelPrev = 'Previous',
  ariaLabelNext = 'Next',
  itemHeight = 80,
}: {
  length: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  renderItem: (index: number, isActive: boolean) => React.ReactNode;
  testIdPrefix: string;
  ariaLabelPrev?: string;
  ariaLabelNext?: string;
  itemHeight?: number;
}) {
  const swipeStartXRef = useRef<number | null>(null);
  const itemH = itemHeight;
  // ... rest unchanged; keep using itemH for container + motion.div height
}
```

- [ ] **Step 2: Delete two-screen types/state**

Remove:

```tsx
/** Setup step 1 = car/track/cam; step 2 = difficulty/operation */
type SetupStep = 'identity' | 'race';
```

and inside `LaneRacer`:

```tsx
const [setupStep, setSetupStep] = useState<SetupStep>('identity');
```

Also remove any `setSetupStep('identity')` on finish/restart (e.g. finish-screen handlers that reset setup) — leave `setGameStatus('setup')` only.

- [ ] **Step 3: Typecheck**

Run: `npm run check`  
Expected: PASS (or only errors from the still-broken setup JSX that references `setupStep` — fix those in Task 2 before considering this done). Prefer finishing Task 2 in the same working tree before claiming green if `setupStep` references remain.

- [ ] **Step 4: Commit** (after Task 2 if check is red from dangling refs)

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "Support variable HorizontalDrum height; drop setupStep state."
```

*(If Task 1 alone leaves the file uncompilable, skip this commit and commit once with Task 2.)*

---

### Task 2: One-screen setup layout (approach C)

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx` (setup `gameStatus === 'setup'` branch, ~659–900)
- Test: `npm run check` + manual at `http://127.0.0.1:8081`

**Interfaces:**
- Consumes: `HorizontalDrum` with `itemHeight`, existing circuit/team/difficulty/op/renderMode state + handlers
- Produces: single setup tree with `data-testid="lr-setup"` (not `lr-setup-identity` / `lr-setup-race`)

- [ ] **Step 1: Replace header back + subtitle**

Header back is always Link to `/game` (remove race-step back that called `setSetupStep('identity')`).

Title block:

```tsx
<div className="text-center">
  <h2
    className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white"
    style={{ fontFamily: 'Oxanium, sans-serif' }}
  >
    Lane Racer
  </h2>
</div>
```

No subtitle (`Team · Track · Cam` / `Difficulty · Operation` / swipe copy).

- [ ] **Step 2: Track hero outside glass**

Above the glass card, render Track drum only (no “TRACK” section header):

```tsx
<div className="w-full max-w-sm" data-testid="lr-track-hero">
  <HorizontalDrum
    length={CIRCUIT_OPTIONS.length}
    currentIndex={currentCircuitIndex}
    itemHeight={100}
    onPrev={() => {
      const n = getWrappedIndex(currentCircuitIndex, -1, CIRCUIT_OPTIONS.length);
      setCurrentCircuitIndex(n);
      setSelectedCircuit(CIRCUIT_OPTIONS[n]);
    }}
    onNext={() => {
      const n = getWrappedIndex(currentCircuitIndex, 1, CIRCUIT_OPTIONS.length);
      setCurrentCircuitIndex(n);
      setSelectedCircuit(CIRCUIT_OPTIONS[n]);
    }}
    testIdPrefix="lr-track"
    ariaLabelPrev="Previous track"
    ariaLabelNext="Next track"
    renderItem={(idx, isActive) => {
      const circuit = CIRCUIT_OPTIONS[idx];
      return (
        <div className="flex flex-col items-center gap-1" data-testid={`lr-track-${circuit.id}`}>
          {CIRCUIT_MAP_IMAGES[circuit.id] && (
            <img
              src={CIRCUIT_MAP_IMAGES[circuit.id]}
              alt={circuit.name}
              className="h-14 object-contain"
              style={{ filter: 'invert(1)', maxWidth: 88 }}
            />
          )}
          <span
            className="text-sm font-bold uppercase tracking-wider"
            style={{
              fontFamily: 'Oxanium, sans-serif',
              color: isActive ? '#fff' : SETUP_INACTIVE_TEXT,
            }}
          >
            {circuit.name}
          </span>
        </div>
      );
    }}
  />
</div>
```

- [ ] **Step 3: Glass card — Team / Diff / Math / Chase Cam**

Single glass card (`data-testid="lr-setup"`) with whisper row labels. Use compact `itemHeight={56}` for Team/Diff/Op.

Whisper label style (reuse on TEAM / DIFF / MATH):

```tsx
const whisperLabelStyle = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: 9,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.28)',
  textTransform: 'uppercase' as const,
};
```

**Team row** — label left or above, compact car only (no team name text):

```tsx
<div className="flex items-center gap-2">
  <span style={whisperLabelStyle}>Team</span>
  <div className="flex-1">
    <HorizontalDrum
      length={TEAMS.length}
      currentIndex={currentTeamIndex}
      itemHeight={56}
      onPrev={() => {
        const n = getWrappedIndex(currentTeamIndex, -1, TEAMS.length);
        setCurrentTeamIndex(n);
        setSelectedTeam(TEAMS[n].id);
        localStorage.setItem('lastSelectedTeam', TEAMS[n].id);
      }}
      onNext={() => {
        const n = getWrappedIndex(currentTeamIndex, 1, TEAMS.length);
        setCurrentTeamIndex(n);
        setSelectedTeam(TEAMS[n].id);
        localStorage.setItem('lastSelectedTeam', TEAMS[n].id);
      }}
      testIdPrefix="lr-team"
      ariaLabelPrev="Previous team"
      ariaLabelNext="Next team"
      renderItem={(idx) => {
        const team = TEAMS[idx];
        return (
          <img
            src={TEAM_PREVIEW_URLS[team.id]}
            alt={team.name}
            className="w-10 h-10 object-contain"
            style={{ transform: 'rotate(90deg)' }}
            data-testid={`lr-team-${team.id}`}
          />
        );
      }}
    />
  </div>
</div>
```

**Difficulty** — same handlers as today (`selectDifficultyDrumIndex` / `DIFFICULTY_DRUM_OPTIONS` / `difficultyDrumColor`), `itemHeight={56}`, whisper label `Diff`.

**Operation** — same as today, `itemHeight={56}`, whisper label `Math`, slightly smaller symbol (`text-xl` not `text-2xl`).

**Chase Cam** — keep existing toggle button / `#ff2800` / `SETUP_INACTIVE_TEXT`; drop the loud section title pattern; keep “On · Tap to disable” / “Tap to enable” helper at whisper opacity.

Spacing between glass rows: `mt-3` or `py-2` only — **no** `border-t` / hairlines.

- [ ] **Step 4: Start only (remove Continue)**

```tsx
<div className="w-full px-4">
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={startGame}
    className="w-full max-w-sm md:max-w-md mx-auto py-4 rounded-xl font-bold text-lg uppercase tracking-wider text-white block"
    style={{ fontFamily: 'Oxanium, sans-serif', backgroundColor: '#16a34a', animation: 'pulse-green 2s infinite' }}
    data-testid="lr-setup-start"
  >
    Start
  </motion.button>
</div>
```

Remove `lr-setup-continue` entirely.

Main column layout: title → track hero → glass → Start, using existing `flex-1 flex flex-col justify-evenly items-center px-4`.

- [ ] **Step 5: Grep cleanup**

Run:

```bash
rg "setupStep|lr-setup-continue|lr-setup-identity|lr-setup-race|SetupStep" client/src/pages/LaneRacer.tsx
```

Expected: no matches.

- [ ] **Step 6: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 7: Manual verify**

Open `http://127.0.0.1:8081` → Game → Lane Racer.

Checklist:
- [ ] One screen; no Continue
- [ ] Track map+name above glass, larger than glass rows
- [ ] Team is car only (no Ferrari text)
- [ ] Whisper Team/Diff/Math labels; no step subtitle
- [ ] Diff drum still cycles Adaptive → Karting → F3 → F2 → F1 with colors
- [ ] Chase Cam red when on
- [ ] Start begins race with selections
- [ ] Back returns to Game hub

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "Restructure Lane Racer setup into one-screen Track-hero hierarchy."
```

---

### Task 3: Handoff note

**Files:**
- Modify: `docs/next-session-handoff.md`

- [ ] **Step 1: Update locked decisions + resume**

In the locked product table, change:

| Lane Racer setup | **Two screens** … |

to:

| Lane Racer setup | **One screen** — Track hero outside glass; Team (car) / Diff / Math / Cam inside; whisper labels. Fallback A (Track inside glass) only if user asks |

Update “Shipped” / “Resume here” bullets to mention hierarchy redesign and tip commit after this work. Note companion/spec path: `docs/superpowers/specs/2026-07-15-lane-racer-setup-hierarchy-design.md`.

- [ ] **Step 2: Commit**

```bash
git add docs/next-session-handoff.md
git commit -m "Update handoff for one-screen Lane Racer setup hierarchy."
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| One screen / no Continue | Task 2 |
| Track outside glass, hero | Task 2 |
| Order Track→Team→Diff→Math→Cam→Start | Task 2 |
| Team compact car only | Task 2 |
| Whisper labels / no subtitle / no hairlines | Task 2 |
| Difficulty + Chase Cam unchanged | Task 2 |
| HorizontalDrum height | Task 1 |
| Remove setupStep | Task 1–2 |
| Fallback A not built | Global constraint |
| Handoff | Task 3 |
