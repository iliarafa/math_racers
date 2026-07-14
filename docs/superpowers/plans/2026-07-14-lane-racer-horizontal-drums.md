# Lane Racer Horizontal Drums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lane Racer Team / Track / Math tap rows with stacked full-width horizontal 3-slot drums (swipe + tap neighbors).

**Architecture:** Rotate the committed vertical combination-lock drum pattern to horizontal. Add a small `HorizontalDrum` helper inside `LaneRacer.tsx` and use it three times. Difficulty and Chase Cam stay as current text-color taps.

**Tech Stack:** React 19, Framer Motion, Lucide chevrons, existing Lane Racer setup state in `client/src/pages/LaneRacer.tsx`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-lane-racer-horizontal-drums-design.md`
- File scope: `client/src/pages/LaneRacer.tsx` (+ handoff note only)
- Exactly 3 slots: prev | selected | next; indexes wrap
- Swipe left → next; swipe right → previous; threshold 30px on `clientX`
- Tap neighbor steps; center no-op
- Left/right chevrons on neighbors; opacity center 1 / neighbors 0.3
- Stacked full-width: Team → Track → Difficulty → Math → Chase Cam → Start
- No hairline dividers; no selection pills
- Difficulty + Chase Cam unchanged from current WIP
- Subtitle: `Swipe to configure`
- Do not change race logic, soft-follow, FP, MP, or GP

---

## File map

| File | Role |
|------|------|
| `client/src/pages/LaneRacer.tsx` | Add `HorizontalDrum`; replace Team/Track/Math tap rows; restore swipe refs; update subtitle |
| `docs/next-session-handoff.md` | Mark drums work done / point at this plan |

No new packages. No new files required (helper lives in `LaneRacer.tsx`).

---

### Task 1: Add `HorizontalDrum` and convert Team

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`
- Test: `npm run check`

**Interfaces:**
- Consumes: `currentTeamIndex`, `setCurrentTeamIndex`, `setSelectedTeam`, `TEAMS`, `TEAM_PREVIEW_URLS`, `motion`
- Produces:
  - `getWrappedIndex(current: number, offset: number, length: number): number`
  - `HorizontalDrum` props:
    - `length: number`
    - `currentIndex: number`
    - `onPrev: () => void`
    - `onNext: () => void`
    - `renderItem: (index: number, isActive: boolean) => React.ReactNode`
    - `testIdPrefix: string`
  - Touch swipe handlers using a `useRef<number | null>` for `clientX`

- [ ] **Step 1: Update lucide imports**

Change:

```tsx
import { ChevronLeft } from "lucide-react";
```

to:

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
```

(`ChevronLeft` remains for the back button.)

- [ ] **Step 2: Add wrap helper + `HorizontalDrum` above `LaneRacer`**

Insert after `CIRCUIT_OPTIONS` (before Web Audio helpers):

```tsx
function getWrappedIndex(current: number, offset: number, length: number): number {
  return ((current + offset) % length + length) % length;
}

function HorizontalDrum({
  length,
  currentIndex,
  onPrev,
  onNext,
  renderItem,
  testIdPrefix,
}: {
  length: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  renderItem: (index: number, isActive: boolean) => React.ReactNode;
  testIdPrefix: string;
}) {
  const swipeStartXRef = useRef<number | null>(null);
  const itemH = 80;

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      swipeStartXRef.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (swipeStartXRef.current === null) return;
      const diff = swipeStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 30) {
        diff > 0 ? onNext() : onPrev();
      }
      swipeStartXRef.current = null;
    },
  };

  return (
    <div
      className="w-full flex items-stretch"
      style={{ height: itemH, overflow: 'hidden', touchAction: 'none', position: 'relative' }}
      {...swipeHandlers}
      data-testid={`${testIdPrefix}-drum`}
    >
      {([-1, 0, 1] as const).map((offset) => {
        const idx = getWrappedIndex(currentIndex, offset, length);
        const isActive = offset === 0;
        return (
          <motion.div
            key={`${testIdPrefix}-${currentIndex}-${offset}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex items-center justify-center cursor-pointer gap-1"
            style={{ height: itemH }}
            onClick={() => {
              if (offset === -1) onPrev();
              else if (offset === 1) onNext();
            }}
            data-testid={`${testIdPrefix}-slot-${offset}`}
          >
            {offset === -1 && <ChevronLeft size={14} className="text-white/30 shrink-0" />}
            {renderItem(idx, isActive)}
            {offset === 1 && <ChevronRight size={14} className="text-white/30 shrink-0" />}
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Replace Team tap-row with `HorizontalDrum`**

In the setup card, replace the Team `TEAMS.map(...)` button row with:

```tsx
{/* Team — horizontal drum */}
<div>
  <div className="text-xs uppercase tracking-widest text-white/80 mb-2 font-bold text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Team</div>
  <HorizontalDrum
    length={TEAMS.length}
    currentIndex={currentTeamIndex}
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
    renderItem={(idx, isActive) => {
      const team = TEAMS[idx];
      return (
        <img
          src={TEAM_PREVIEW_URLS[team.id]}
          alt={team.name}
          className="w-12 h-12 object-contain"
          style={{ transform: 'rotate(90deg)', opacity: isActive ? 1 : 0.5 }}
          data-testid={`lr-team-${team.id}`}
        />
      );
    }}
  />
</div>
```

Keep section spacing (`mt-4 pt-4` on following sections) — no hairline borders.

- [ ] **Step 4: Typecheck**

Run: `npm run check`  
Expected: PASS (no new TS errors in `LaneRacer.tsx`)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "$(cat <<'EOF'
Add horizontal Team drum to Lane Racer setup.

Introduce a shared 3-slot HorizontalDrum and replace the Team tap row.
EOF
)"
```

**Note:** If Difficulty Lock Choice changes in the same file are still uncommitted and should stay together, either (a) leave this commit including only the drum-related hunks via careful staging, or (b) ask the user whether to commit Difficulty Lock + drums together. Prefer asking if unsure; do not mix unrelated MP/Game/websocket files into this commit.

---

### Task 2: Convert Track + Math drums; update subtitle

**Files:**
- Modify: `client/src/pages/LaneRacer.tsx`
- Test: `npm run check` + manual setup pass at `http://127.0.0.1:8081`

**Interfaces:**
- Consumes: `HorizontalDrum`, `getWrappedIndex` from Task 1; `CIRCUIT_OPTIONS`, `CIRCUIT_MAP_IMAGES`, `OPERATION_OPTIONS`, `currentCircuitIndex`, `currentOpIndex`
- Produces: Track + Math horizontal drums; subtitle copy `Swipe to configure`

- [ ] **Step 1: Replace Track tap/wrap row with `HorizontalDrum`**

```tsx
{/* Track — horizontal drum */}
<div className="mt-4 pt-4">
  <div className="text-xs uppercase tracking-widest text-white/80 mb-2 font-bold text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Track</div>
  <HorizontalDrum
    length={CIRCUIT_OPTIONS.length}
    currentIndex={currentCircuitIndex}
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
    renderItem={(idx, isActive) => {
      const circuit = CIRCUIT_OPTIONS[idx];
      return (
        <div className="flex flex-col items-center gap-1" data-testid={`lr-track-${circuit.id}`}>
          {CIRCUIT_MAP_IMAGES[circuit.id] && (
            <img
              src={CIRCUIT_MAP_IMAGES[circuit.id]}
              alt={circuit.name}
              className="h-8 object-contain"
              style={{ filter: 'invert(1)', opacity: isActive ? 1 : 0.5, maxWidth: 56 }}
            />
          )}
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
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

- [ ] **Step 2: Replace Math button row with `HorizontalDrum`**

```tsx
{/* Math — horizontal drum */}
<div className="mt-4 pt-4">
  <div className="text-xs uppercase tracking-widest text-white/80 mb-2 font-bold text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Math</div>
  <HorizontalDrum
    length={OPERATION_OPTIONS.length}
    currentIndex={currentOpIndex}
    onPrev={() => setCurrentOpIndex(getWrappedIndex(currentOpIndex, -1, OPERATION_OPTIONS.length))}
    onNext={() => setCurrentOpIndex(getWrappedIndex(currentOpIndex, 1, OPERATION_OPTIONS.length))}
    testIdPrefix="lr-op"
    renderItem={(idx, isActive) => {
      const op = OPERATION_OPTIONS[idx];
      return (
        <span
          className="font-bold text-sm uppercase tracking-wider"
          style={{
            fontFamily: 'Oxanium, sans-serif',
            color: isActive ? '#fff' : SETUP_INACTIVE_TEXT,
          }}
          data-testid={`lr-op-${op.type}`}
        >
          {op.label}
        </span>
      );
    }}
  />
</div>
```

Keep Difficulty block **between** Track and Math unchanged. Keep Chase Cam **after** Math unchanged.

- [ ] **Step 3: Update subtitle**

Replace:

```tsx
<div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Tap to configure</div>
```

with:

```tsx
<div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Swipe to configure</div>
```

- [ ] **Step 4: Typecheck**

Run: `npm run check`  
Expected: PASS

- [ ] **Step 5: Manual acceptance (browser)**

Open `http://127.0.0.1:8081` → Game → Lane Racer setup.

Checklist:
- [ ] Team / Track / Math each show 3 slots only (not all teams / all tracks)
- [ ] Swipe left/right and tap neighbors step with wrap
- [ ] Difficulty Adaptive|Locked + levels still work
- [ ] Chase Cam toggle still works (red when on)
- [ ] Start still races with selected team/track/math

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/LaneRacer.tsx
git commit -m "$(cat <<'EOF'
Use horizontal drums for Lane Racer Track and Math.

Finish the stacked 3-slot drum setup and switch subtitle to swipe copy.
EOF
)"
```

---

### Task 3: Handoff note

**Files:**
- Modify: `docs/next-session-handoff.md`

**Interfaces:**
- Consumes: completed horizontal drums behavior
- Produces: handoff “Resume here” no longer lists drums as incomplete first task

- [ ] **Step 1: Update handoff**

In `docs/next-session-handoff.md`:
- Status line: mark Lane Racer horizontal drums **done** (spec + plan implemented)
- “First order of business”: remove drums as the primary incomplete item; point next optional work at the existing list (opponent-paced `slowerThanBot`, reconnect, cleanup, etc.)
- Uncommitted table: Lane Racer setup drums → **Done** (or remove WIP note)
- Keep Difficulty Lock Choice commit reminder if that work is still uncommitted elsewhere

- [ ] **Step 2: Commit**

```bash
git add docs/next-session-handoff.md
git commit -m "$(cat <<'EOF'
Mark Lane Racer horizontal drums complete in handoff.

Point the next session at remaining optional follow-ups.
EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Stacked full-width Team / Track / Math drums | 1–2 |
| Exactly 3 slots, wrap | 1 (`HorizontalDrum`) |
| Swipe left/right + tap neighbors | 1 |
| Left/right chevrons, opacity | 1 |
| Difficulty + Chase Cam unchanged | 2 (leave blocks) |
| Subtitle “Swipe to configure” | 2 |
| No dividers / no pills | 1–2 |
| Race logic untouched | All (setup UI only) |
| Handoff updated | 3 |

No placeholders. Types consistent: `getWrappedIndex` + `HorizontalDrum` used by all three drums.
