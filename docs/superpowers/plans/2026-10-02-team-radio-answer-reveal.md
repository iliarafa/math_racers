# Team Radio Answer Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a wrong answer teach: after the second miss on a question the race shows the correct answer ("team radio"), holds the keys for a moment, makes the kid type it, and asks the fact again about three questions later. On a red flashcard the answer shows right away.

**Architecture:** A pure module, `client/src/lib/answerReveal.ts`, owns the rules (when to reveal, the hold length, the ghost-digit split, the re-ask queue). `Game.tsx` and `DrivingSchool.tsx` hold the state and timers. The revealed answer is drawn as ghost digits inside the existing answer element (`data-testid="display-answer"`, `flashcard-answer`) by a small inline component, `RadioDigits`, so no layout element is added.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (`@theme` colour tokens), Web Audio (`raceSounds.ts`), `node:test` via `tsx --test`.

**Spec:** the agreed behaviour below (decided in a cloud session; no separate spec file).

## Spec (agreed behaviour)

- All `Game.tsx` modes (Free Practice, GP Practice, Quick Race, GP Qualifying, Race Day): the 1st miss works as today (free retry for a typo). On the 2nd miss on the same question, show the correct answer and lock the keypad and keyboard for about 1.5 s (the "radio hold"). The bot keeps driving; the race never pauses. Then the kid must type the answer to go on, and it stays visible until they do. The 4-miss DNF is unchanged.
- Flashcards (Driving School, one attempt per card): on a red card, show the answer right away; the kid types it to move on. The card stays red and still comes back next lap.
- A revealed answer never counts as clean for fact mastery (`ingestSession` already treats rows with `wrongAttempts` as not clean; confirm it with a test).
- A revealed fact comes back about 3 questions later in the same session, except when a power-up is asking for a harder question.
- Out of scope: Multiplayer, Lane Racer.
- Placement: not the reserved FINAL LAP slot (the `h-11` div in `PhoneQuestionPane.tsx`). Ghost digits inside the answer element itself in a distinct "radio" colour; typed digits replace them from the left. Same in the desktop `QuestionPane` and on the flashcard.
- Sound: a short radio chirp, only when `soundEnabled`.

## Global Constraints

- No emojis anywhere a player can see them (CLAUDE.md "UI text").
- Each racing HUD variant keeps its own layout; leave layouts otherwise untouched (CLAUDE.md "Racing HUD Variants").
- `Multiplayer.tsx` also renders the desktop `QuestionPane`: new props must be optional and Multiplayer must not change.
- Never call `setState` on `GameState` with a stale copy (not touched here: all new state is component-local).
- Commit with explicit pathspecs only; never `git add -A` (parallel sessions share the git index).
- Never finish a Quick Race, a 100-lap Free Practice or a GP Race Day during verification: the dev build writes to the production leaderboard. Leave via Pause, Quit Race / BOX, End Session / RETIRE.

## Decisions taken while planning

1. **Order of the second miss:** the typed answer flashes red for 0.6 s exactly as today (so the kid sees it was wrong), then the ghost answer appears with the chirp, and the hold (`RADIO_HOLD_MS` = 1500) runs from that moment. Keys are therefore locked for 2.1 s from the miss, 1.5 s of it with the answer on screen.
2. **Later misses** on a revealed question (3rd, and the 4th that crashes in races) flash red as usual and leave the ghost up, with no new hold and no new chirp.
3. **Typed digits over the ghost** are drawn in the solid radio colour and the ghost in the same colour at low opacity, like tracing dotted digits. The radio colour started as cyan `#0891b2`; on the first screenshot the user picked royal blue `#2563eb` instead (cyan sat too close to the Karting level label).
4. **Re-ask timing:** revealed on question *n*, asked again as question *n + 3* (two fresh questions in between). If a power-up asks for a harder question at that slot, the re-ask waits for the next normal one. It never repeats the question just asked.
5. **"Harder question" today means OVERTAKE only.** `handleAero` keeps the current question ("no harder question", commit b430013); only the question generated after a correct answer with OVERTAKE active uses `boostFactor` 0.5. CLAUDE.md's AERO line ("Harder question when active") is stale; flag it to the user rather than widen this change.
6. **Flashcards get no hold:** the red grade flash (550 ms) shows the wrong answer, then the ghost appears with the chirp and the keys work at once. A wrong copy flashes the digits red and retries; the right copy turns the digits green and moves on. The card face does not light again during the copy.
7. **Dynamic difficulty, energy and coins are unchanged:** the copied answer is slow, so `updateDynamicDifficulty` gives it delta 0 (no promotion), exactly as a retried answer today.

## File Structure

- Create `client/src/lib/answerReveal.ts`: constants, `revealsOnMiss`, `ghostDigits`, `queueReask`, `takeReask`. Pure.
- Create `client/src/lib/answerReveal.test.ts`: unit tests, plus the fact-mastery check.
- Create `client/src/components/race/RadioDigits.tsx`: inline typed + ghost spans in the radio colour.
- Modify `client/src/index.css`: one `--color-radio` token in `@theme inline` (gives `text-radio`, `text-radio/40`).
- Modify `client/src/lib/raceSounds.ts`: `playRadioChirp`.
- Modify `client/src/components/race/PhoneQuestionPane.tsx`, `client/src/components/desktop/QuestionPane.tsx`: optional `radio` prop.
- Modify `client/src/pages/Game.tsx`: reveal state, hold, locks, re-ask queue.
- Modify `client/src/pages/DrivingSchool.tsx`: flashcard reveal and copy, desktop legend.
- Modify `client/src/pages/Regulations.tsx`, `CLAUDE.md`: the rules.

## Verification harness (set up once, before Task 2)

The user asked to see each step in the iOS Simulator.

1. Dev server for this worktree on a free port (8081 belongs to other worktrees): `PORT=8095 NODE_ENV=development npx tsx server/index.ts` (background Bash). Check `curl -s localhost:8095/src/lib/answerReveal.ts` serves the worktree.
2. Native shell with live reload: `npm run build` (gives `dist/public` for `cap sync`), `npx cap sync ios` (pod install), then add `"server": { "url": "http://localhost:8095" }` to the gitignored `ios/App/App/capacitor.config.json`. `git status` afterwards and restore any tracked file `cap sync` touched (e.g. `Podfile.lock`).
3. Dedicated simulators so no other session's app or data is touched: `xcrun simctl create` an iPhone 17e (small), an iPhone 18 Pro Max (large) and an iPad Pro 13-inch (M5) on iOS 27.0. Boot the small iPhone, `attach` the panel, build `ios/App/App.xcworkspace` scheme `App` with the simulator build tool, `launch`.
4. Race Day needs Practice and Qualifying first, because `grandPrixDevBypass()` is off on native. While checking Race Day only, temporarily return `Boolean(import.meta.env.DEV)` there, then `git checkout -- client/src/lib/drivingSchoolLicence.ts`. Never commit it.
5. Desktop layout: the browser pane at 1024×768 on `http://localhost:8095` (the desktop tree never renders natively). Timing checks (the 1.5 s lock) run there with javascript_tool: dispatch `keydown` during the hold and confirm the answer stays empty.
6. iPad landscape: Free Practice and the Grand Prix lock landscape after a "Turn your iPad" prompt; rotate the simulator with Device > Rotate (computer-use on the Simulator app).

---

### Task 1: The pure rules (`answerReveal.ts`)

**Files:**
- Create: `client/src/lib/answerReveal.ts`
- Test: `client/src/lib/answerReveal.test.ts`

**Interfaces:**
- Produces: `REVEAL_AFTER_MISSES = 2`, `RADIO_HOLD_MS = 1500`, `REASK_AFTER = 3`; `revealsOnMiss(missesOnQuestion: number): boolean`; `type GhostDigits = { typed: string; ghost: string }`; `ghostDigits(typed: string, answer: string): GhostDigits`; `type Reask<Q extends { display: string }> = { question: Q; due: number }`; `queueReask<Q>(queue: readonly Reask<Q>[], question: Q, serial: number): Reask<Q>[]`; `takeReask<Q>(queue: readonly Reask<Q>[], serial: number, opts: { harder: boolean; previousDisplay?: string }): { question: Q | null; queue: Reask<Q>[] }`.

- [ ] **Step 1: Write the failing test** (`client/src/lib/answerReveal.test.ts`)

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingestSession } from './factMastery.ts';
import {
  RADIO_HOLD_MS,
  REASK_AFTER,
  REVEAL_AFTER_MISSES,
  ghostDigits,
  queueReask,
  revealsOnMiss,
  takeReask,
} from './answerReveal.ts';

test('the first miss is a free retry; the second reveals the answer, once', () => {
  assert.equal(REVEAL_AFTER_MISSES, 2);
  assert.equal(RADIO_HOLD_MS, 1500);
  assert.equal(revealsOnMiss(1), false);
  assert.equal(revealsOnMiss(2), true);
  // A third miss keeps the answer up but brings no second hold
  assert.equal(revealsOnMiss(3), false);
});

test('typed digits replace the ghost digits from the left', () => {
  assert.deepEqual(ghostDigits('', '56'), { typed: '', ghost: '56' });
  assert.deepEqual(ghostDigits('5', '56'), { typed: '5', ghost: '6' });
  // A wrong digit still takes its place; the submit decides
  assert.deepEqual(ghostDigits('4', '56'), { typed: '4', ghost: '6' });
  assert.deepEqual(ghostDigits('56', '56'), { typed: '56', ghost: '' });
  assert.deepEqual(ghostDigits('567', '56'), { typed: '567', ghost: '' });
});

const q = (display: string) => ({ display });

test('a revealed question comes back REASK_AFTER questions later', () => {
  assert.equal(REASK_AFTER, 3);
  const queue = queueReask([], q('7 × 8'), 5);
  assert.equal(takeReask(queue, 6, { harder: false }).question, null);
  assert.equal(takeReask(queue, 7, { harder: false }).question, null);
  const due = takeReask(queue, 8, { harder: false });
  assert.equal(due.question?.display, '7 × 8');
  assert.deepEqual(due.queue, []);
});

test('a power-up asking for a harder question keeps the re-ask for the next normal one', () => {
  const queue = queueReask([], q('7 × 8'), 5);
  const boosted = takeReask(queue, 8, { harder: true });
  assert.equal(boosted.question, null);
  assert.equal(boosted.queue.length, 1);
  assert.equal(takeReask(boosted.queue, 9, { harder: false }).question?.display, '7 × 8');
});

test('the earliest due re-ask goes first, one per question', () => {
  let queue = queueReask([], q('6 × 7'), 2); // due 5
  queue = queueReask(queue, q('8 × 9'), 3); // due 6
  const first = takeReask(queue, 6, { harder: false });
  assert.equal(first.question?.display, '6 × 7');
  const second = takeReask(first.queue, 7, { harder: false });
  assert.equal(second.question?.display, '8 × 9');
  assert.deepEqual(second.queue, []);
});

test('a question revealed again moves to its new slot', () => {
  let queue = queueReask([], q('7 × 8'), 5); // due 8
  queue = queueReask(queue, q('7 × 8'), 8); // revealed again on the re-ask: due 11
  assert.equal(queue.length, 1);
  assert.equal(queue[0].due, 11);
});

test('a re-ask never repeats the question just asked', () => {
  const queue = queueReask([], q('7 × 8'), 5);
  const blocked = takeReask(queue, 8, { harder: false, previousDisplay: '7 × 8' });
  assert.equal(blocked.question, null);
  assert.equal(takeReask(blocked.queue, 9, { harder: false, previousDisplay: '3 × 4' }).question?.display, '7 × 8');
});

test('a revealed answer never counts as clean for fact mastery', () => {
  // The lapResults row Game writes when the kid types the radio answer: it carries both misses.
  const revealed = { fact: '7x8', responseTime: 2500, result: 'correct' as const, wrongAttempts: [54, 48] };
  assert.equal(revealed.wrongAttempts.length, REVEAL_AFTER_MISSES);
  const { stats } = ingestSession({}, [revealed], 1_000);
  assert.equal(stats['7x8'].seen, 1);
  assert.equal(stats['7x8'].correct, 0);
  assert.equal(stats['7x8'].ewmaMs, 0);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx tsx --test client/src/lib/answerReveal.test.ts`
Expected: FAIL, cannot find module `./answerReveal.ts`.

- [ ] **Step 3: Write the module** (`client/src/lib/answerReveal.ts`)

```ts
/**
 * Team radio: a wrong answer that teaches. The first miss on a question is a free retry (a typo).
 * The second miss reveals the answer as ghost digits inside the answer element and holds the keys
 * for RADIO_HOLD_MS; the kid types over the ghost to go on. The revealed question comes back
 * REASK_AFTER questions later in the same session. Pure; Game.tsx and DrivingSchool.tsx render it.
 */

/** The miss that brings the radio on. */
export const REVEAL_AFTER_MISSES = 2;
/** How long the keypad and keyboard stay locked once the answer is on screen. */
export const RADIO_HOLD_MS = 1500;
/** A revealed question is asked again this many questions later: two fresh ones in between. */
export const REASK_AFTER = 3;

/** True only on the revealing miss; later misses leave the answer up without another hold. */
export function revealsOnMiss(missesOnQuestion: number): boolean {
  return missesOnQuestion === REVEAL_AFTER_MISSES;
}

export type GhostDigits = { typed: string; ghost: string };

/** The answer element while a revealed answer is up: typed digits replace ghost digits from the left. */
export function ghostDigits(typed: string, answer: string): GhostDigits {
  return { typed, ghost: answer.slice(typed.length) };
}

type QuestionLike = { display: string };

export type Reask<Q extends QuestionLike> = { question: Q; due: number };

/**
 * Queue a revealed question to come back REASK_AFTER questions after the one it was revealed on
 * (`serial`, counted from the session's first question). One entry per display, so a question
 * revealed again moves to its new slot.
 */
export function queueReask<Q extends QuestionLike>(queue: readonly Reask<Q>[], question: Q, serial: number): Reask<Q>[] {
  return [...queue.filter((r) => r.question.display !== question.display), { question, due: serial + REASK_AFTER }];
}

/**
 * The re-ask to serve as question `serial`, if one is due: the earliest due first. Nothing is
 * served while a power-up asks for a harder question (the re-ask waits for the next normal one),
 * or when it would repeat the question just asked.
 */
export function takeReask<Q extends QuestionLike>(
  queue: readonly Reask<Q>[],
  serial: number,
  opts: { harder: boolean; previousDisplay?: string },
): { question: Q | null; queue: Reask<Q>[] } {
  let pick = -1;
  if (!opts.harder) {
    queue.forEach((r, i) => {
      if (r.due > serial || r.question.display === opts.previousDisplay) return;
      if (pick === -1 || r.due < queue[pick].due) pick = i;
    });
  }
  if (pick === -1) return { question: null, queue: [...queue] };
  return { question: queue[pick].question, queue: queue.filter((_, i) => i !== pick) };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx tsx --test client/src/lib/answerReveal.test.ts` then `npm test`
Expected: all pass (the new file is picked up by the `client/src/lib/*.test.ts` glob).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/answerReveal.ts client/src/lib/answerReveal.test.ts docs/superpowers/plans/2026-10-02-team-radio-answer-reveal.md
git commit -m "Add the team radio rules: reveal on the second miss, ghost digits, re-ask queue" -- client/src/lib/answerReveal.ts client/src/lib/answerReveal.test.ts docs/superpowers/plans/2026-10-02-team-radio-answer-reveal.md
```

### Task 2: Reveal and radio hold in every Game mode (phone and desktop panes)

**Files:**
- Modify: `client/src/index.css` (`@theme inline`, after `--color-ring`)
- Create: `client/src/components/race/RadioDigits.tsx`
- Modify: `client/src/lib/raceSounds.ts` (append `playRadioChirp`)
- Modify: `client/src/components/race/PhoneQuestionPane.tsx`
- Modify: `client/src/components/desktop/QuestionPane.tsx`
- Modify: `client/src/pages/Game.tsx` (imports; state near `wrongAttemptsRef`; keyboard effect; `handleSubmit` wrong branch; restart paths; unmount; panes; keypad; key strip)

**Interfaces:**
- Consumes: `RADIO_HOLD_MS`, `revealsOnMiss`, `ghostDigits`, `GhostDigits` from Task 1.
- Produces: `RadioDigits({ typed, ghost }: GhostDigits)`; `playRadioChirp(): void`; `radio?: GhostDigits | null` on both panes; in Game: `revealedAnswer`, `radioHold`, `radioTokenRef`, `resetTeamRadio()`, `startTeamRadio(q: Question)`.

- [ ] **Step 1: Colour token** — in `client/src/index.css`, inside `@theme inline`, after `--color-ring: hsl(var(--ring));` add:

```css
  /* Team radio: the revealed answer's ghost digits (lib/answerReveal.ts) */
  --color-radio: #2563eb;
```

- [ ] **Step 2: `RadioDigits`** (`client/src/components/race/RadioDigits.tsx`)

```tsx
import type { GhostDigits } from "@/lib/answerReveal";

/**
 * Team radio answer, drawn inside an answer element in place of the typed answer: the digits typed
 * so far in the radio colour, then the rest of the revealed answer as faint ghost digits. Inline
 * spans only, so the answer element keeps its size and place.
 */
export function RadioDigits({ typed, ghost }: GhostDigits) {
  return (
    <span className="text-radio" data-testid="radio-answer">
      {typed}
      <span className="text-radio/40" data-testid="radio-ghost">{ghost}</span>
    </span>
  );
}
```

- [ ] **Step 3: The chirp** — append to `client/src/lib/raceSounds.ts`:

```ts
/** Team radio: a squelch click, then a high-low double beep as the engineer keys the mic. */
export const playRadioChirp = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const squelch = ctx.createBufferSource();
    squelch.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200;
    const squelchGain = ctx.createGain();
    squelchGain.gain.setValueAtTime(0.12, now);
    squelchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    squelch.connect(band);
    band.connect(squelchGain);
    squelchGain.connect(ctx.destination);
    squelch.start(now);

    for (const [frequency, start] of [[1400, 0.05], [1050, 0.13]]) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(0.15, now + start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + 0.07);
      oscillator.start(now + start);
      oscillator.stop(now + start + 0.07);
    }
  } catch (e) {
    // Silent fail
  }
};
```

- [ ] **Step 4: Phone pane** — `client/src/components/race/PhoneQuestionPane.tsx`: import `RadioDigits` and `type GhostDigits`; add the prop and use it in the answer element.

```tsx
  /** Team radio: the revealed answer, drawn in the answer element in place of answerDisplay. */
  radio?: GhostDigits | null;
```

```tsx
            !flashWhite && feedback === 'idle' && !radio && "text-muted-foreground/50",
```

```tsx
          {radio ? <RadioDigits {...radio} /> : answerDisplay}
```

- [ ] **Step 5: Desktop pane** — `client/src/components/desktop/QuestionPane.tsx`: the same three edits (prop with the same doc comment, `!radio` on the idle colour, `RadioDigits` in place of `answerDisplay`). Multiplayer passes no `radio`, so it renders as before.

- [ ] **Step 6: Game state and helpers** — `client/src/pages/Game.tsx`

Imports: add `playRadioChirp` to the `@/lib/raceSounds` import and

```ts
import { RADIO_HOLD_MS, ghostDigits, revealsOnMiss } from "@/lib/answerReveal";
```

After `const wrongAttemptsRef = useRef<number[]>([]);`:

```ts
  // Team radio (lib/answerReveal.ts): the answer the second miss reveals, and the key hold after it.
  // The token voids a reveal still waiting on its red flash when the session moves on.
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);
  const [radioHold, setRadioHold] = useState(false);
  const radioTokenRef = useRef(0);
  const inputLocked = feedback !== 'idle' || radioHold;
```

Above `const handleSubmit`:

```ts
  /** Drop the radio, and void a reveal or hold still waiting on a timer. */
  const resetTeamRadio = () => {
    radioTokenRef.current += 1;
    setRevealedAnswer(null);
    setRadioHold(false);
  };

  /** The second miss: the answer goes up as ghost digits and the keys hold. The bot keeps driving. */
  const startTeamRadio = (q: Question) => {
    const token = radioTokenRef.current;
    setRevealedAnswer(String(q.answer));
    setRadioHold(true);
    if (soundEnabledRef.current) playRadioChirp();
    setTimeout(() => {
      if (radioTokenRef.current === token) setRadioHold(false);
    }, RADIO_HOLD_MS);
  };
```

- [ ] **Step 7: Locks**
  - `handleSubmit` guard: `if (!question || feedback !== 'idle' || radioHold || gameStatus !== 'racing' || !selectedCircuit) return;`
  - Keyboard effect: `if (feedback !== 'idle' || radioHold) return;` and add `radioHold` after `feedback` in its dependency array.
  - `handleStripKey`: `if (isPaused || inputLocked) return;`
  - `KeyStrip`: `disabled={isPaused || inputLocked}`
  - `RaceKeypad`: `locked={inputLocked}`

- [ ] **Step 8: The wrong-answer branch** — right after `wrongAttemptsRef.current.push(val);`:

```ts
      // After the red flash the answer clears for the retry. The second miss on this question also
      // brings the team radio on, unless the session has moved on in the meantime.
      const missed = question;
      const revealNow = revealsOnMiss(wrongAttemptsRef.current.length);
      const radioToken = radioTokenRef.current;
      const endMissFlash = () => setTimeout(() => {
        setFeedback('idle');
        setGpRaceFlash(null);
        setAnswer('');
        if (revealNow && radioTokenRef.current === radioToken) startTeamRadio(missed);
      }, 600);
```

Replace each of the four identical 600 ms timeouts (AERO race, AERO practice, practice, race) with `endMissFlash();`. The `setShowPenalty` timers and the crash returns stay as they are.

- [ ] **Step 9: Clear it when the session moves on**
  - Next-question timeout (after a correct answer): add `setRevealedAnswer(null);` after `setAnswer("");`.
  - Lights out (countdown effect, just before the first `setQuestion(generateQuestion(...))`): `resetTeamRadio();`
  - `restartRace` and `restartToSelectingScreen`: `resetTeamRadio();` after `wrongAttemptsRef.current = [];`
  - Unmount cleanup (the effect clearing `retireLeaveTimerRef`): `radioTokenRef.current += 1;`

- [ ] **Step 10: Draw it** — next to `handleStripKey`:

```ts
  // Team radio: typed digits over the revealed answer's ghost digits, between flashes only.
  const radioDigits = revealedAnswer !== null && feedback === 'idle' ? ghostDigits(answer, revealedAnswer) : null;
```

Pass `radio={radioDigits}` to `<QuestionPane>` and `<PhoneQuestionPane>`.

- [ ] **Step 11: Check and verify**

Run: `npm run check` and `npm test` (expected: clean, all pass).
Simulator (small iPhone, Free Practice 25 laps): miss twice; the ghost answer shows in the radio colour with the chirp; keys ignore taps for 1.5 s; type the first digit (it turns solid, the rest stays ghost); finish the answer; it turns green and a new question comes. Screenshot each, ask the user about the colour. Browser pane: dispatch digit `keydown`s during the hold and confirm the answer stays empty.

- [ ] **Step 12: Commit**

```bash
git commit -m "Reveal the answer on the second miss, with a radio hold" -- client/src/index.css client/src/components/race/RadioDigits.tsx client/src/lib/raceSounds.ts client/src/components/race/PhoneQuestionPane.tsx client/src/components/desktop/QuestionPane.tsx client/src/pages/Game.tsx
```

### Task 3: Ask a revealed fact again about three questions later

**Files:**
- Modify: `client/src/pages/Game.tsx`

**Interfaces:**
- Consumes: `queueReask`, `takeReask`, `type Reask` from Task 1; `resetTeamRadio`, `startTeamRadio` from Task 2.

- [ ] **Step 1: State** — extend the answerReveal import with `queueReask, takeReask, type Reask` and add after `radioTokenRef`:

```ts
  // Questions answered by the radio wait here to be asked again (REASK_AFTER questions on).
  const questionSerialRef = useRef(0);
  const reaskQueueRef = useRef<Reask<Question>[]>([]);
```

- [ ] **Step 2: Queue on reveal, clear on reset** — in `startTeamRadio`, after `setRadioHold(true);`:

```ts
    reaskQueueRef.current = queueReask(reaskQueueRef.current, q, questionSerialRef.current);
```

In `resetTeamRadio`, after `setRadioHold(false);`:

```ts
    questionSerialRef.current = 0;
    reaskQueueRef.current = [];
```

- [ ] **Step 3: Serve it** — in the next-question timeout, replace the `setQuestion(generateQuestion(...))` line with:

```ts
          // A question the radio answered comes back REASK_AFTER questions later, but never in
          // place of the harder question OVERTAKE asks for.
          questionSerialRef.current += 1;
          const reask = takeReask(reaskQueueRef.current, questionSerialRef.current, { harder: wasOvertakeActive, previousDisplay: question?.display });
          reaskQueueRef.current = reask.queue;
          setQuestion(reask.question ?? generateQuestion(selectedCircuit.id, currentDifficultyRef.current, false, boostFactor, question?.display, (isGrandPrix || isPreSeasonTesting || isQuickRace) ? selectedOperation : undefined));
```

- [ ] **Step 4: Check and verify**

Run: `npm run check`, `npm test`.
Simulator (Free Practice): miss a question twice, copy it, answer two fresh questions, and the third is the revealed one again. Screenshot the reveal and the re-ask.

- [ ] **Step 5: Commit**

```bash
git commit -m "Ask a fact the radio answered again three questions later" -- client/src/pages/Game.tsx
```

### Task 4: Flashcards show the answer on a red card

**Files:**
- Modify: `client/src/pages/DrivingSchool.tsx`

**Interfaces:**
- Consumes: `ghostDigits` (Task 1), `RadioDigits` (Task 2), `playRadioChirp` (Task 2).

- [ ] **Step 1: State** — imports: `RadioDigits` from `@/components/race/RadioDigits`, `ghostDigits` from `@/lib/answerReveal`, `playRadioChirp` from `@/lib/raceSounds`. After the `feedback` state:

```ts
  // Team radio: a red card shows its answer, and the kid types it to move on.
  const [revealed, setRevealed] = useState(false);
```

In the effect that resets `answer` and `feedback` when the card changes, also `setRevealed(false);`, and add `lap` to its dependency array. A card re-drilled alone keeps the same index from one lap to the next, so without `lap` its clock never restarts and the copy time would count against it.

- [ ] **Step 2: `submitAnswer`** — after the `Number.isNaN` guard, before the grading:

```ts
    // Copying a red card's answer: the card stays red. The right answer moves on, a wrong one retries.
    if (revealed) {
      const copied = val === current.question.answer;
      setFeedback(copied ? 'correct' : 'incorrect');
      if (!copied && state.soundEnabled) playGradeSound('red');
      window.setTimeout(() => {
        setFeedback('idle');
        setAnswer('');
        if (copied) {
          setRevealed(false);
          advanceAfterGrade(deck);
        }
      }, 550);
      return;
    }
```

And in the grading timeout, before `advanceAfterGrade(nextDeck);`:

```ts
      if (color === 'red') {
        setRevealed(true);
        if (state.soundEnabled) playRadioChirp();
        return;
      }
```

- [ ] **Step 3: Keyboard effect** — add `revealed` to its dependency array (the handler calls `submitAnswer`, which reads it).

- [ ] **Step 4: Draw it** — in the flashcard: `const lit = feedback !== 'idle' && !revealed && current.color !== 'pending';` and the answer element:

```tsx
                        className={cn(
                          'text-[min(3.75rem,23cqh)] leading-none font-bold min-h-[1em] mt-[min(1.25rem,8cqh)]',
                          lit ? 'text-white/90'
                            : revealed && feedback === 'correct' ? 'text-green-600'
                            : revealed && feedback === 'incorrect' ? 'text-red-600'
                            : 'text-muted-foreground/40',
                        )}
                        data-testid="flashcard-answer"
                      >
                        {revealed && feedback === 'idle'
                          ? <RadioDigits {...ghostDigits(answer, String(current.question.answer))} />
                          : (answer || '0')}
```

- [ ] **Step 5: Desktop legend** — `Red: wrong, back into the deck` becomes `Red: wrong; copy the answer, and it comes back next lap`.

- [ ] **Step 6: Check and verify**

Run: `npm run check`, `npm test`.
Simulator: a flashcard stage; answer one card wrong (red flash, then the ghost answer with the chirp); type a wrong copy (digits flash red, ghost back); type the right copy (green, next card). Finish the lap and see the red card return. Desktop pane: same, plus the legend.

- [ ] **Step 7: Commit**

```bash
git commit -m "Show a red flashcard's answer and have the kid type it" -- client/src/pages/DrivingSchool.tsx
```

### Task 5: Rules for players and for the next session

**Files:**
- Modify: `client/src/pages/Regulations.tsx` (Track Limits article, Fact growth line, Flashcards line)
- Modify: `CLAUDE.md` (Penalty System, Driving School flashcards)

- [ ] **Step 1: Regulations** — Track Limits `details` becomes:

```ts
          "A wrong answer turns your answer red",
          "A second wrong answer on the same question brings the team radio on: the right answer appears in the answer box, the keys pause for a moment, then type it to carry on. This happens in every session, Free Practice too",
          "A question the radio answered comes back about three questions later, so you can get it right on your own",
          "4th wrong attempt on the same question results in a crash (DNF)",
```

Fact growth line: append "; an answer the team radio gave you doesn't count". Flashcards line: "...; wrong is red, and the card shows the right answer for you to type before you move on".

- [ ] **Step 2: CLAUDE.md** — Penalty System bullets (verify every name against the code first):

```markdown
- **Team radio** (`lib/answerReveal.ts`): the 1st miss is a free retry. The 2nd miss on the same question (`REVEAL_AFTER_MISSES`; `wrongAttemptsRef` counts misses in every mode) reveals the answer once the red flash clears: ghost digits inside the answer element (`RadioDigits`, colour `--color-radio`), never in the FINAL LAP slot, with `playRadioChirp`. The keypad and keyboard lock for `RADIO_HOLD_MS` (1.5 s, `radioHold`); the bot keeps driving. Typed digits replace the ghost from the left and the answer stays up until typed; later misses keep it without another hold. The revealed question comes back `REASK_AFTER` (3) questions later in the same session (`queueReask`/`takeReask`), never in place of an OVERTAKE (harder) question. Fact mastery never counts it clean: its row carries `wrongAttempts`.
```

Flashcards bullet: "wrong is red, and the card then shows the answer as ghost digits; the kid types it to move on (no hold), and the card still returns next lap".

- [ ] **Step 3: Commit**

```bash
git commit -m "Cover the team radio in the Regulations and CLAUDE.md" -- client/src/pages/Regulations.tsx CLAUDE.md
```

### Task 6: The full layout check

- [ ] `npm test`, `npm run check`.
- [ ] Each HUD variant with a revealed answer on screen: Race Day (temporary bypass), GP Practice, GP Qualifying, Free Practice, Quick Race, on the small iPhone, the large iPhone, iPad portrait and the iPad landscape split; the desktop pane at 1024×768. Check the answer element keeps its place, the ghost never touches the grid or the FINAL LAP slot, and a three-digit answer fits.
- [ ] Flashcards on a phone, an iPad and desktop.
- [ ] Revert the temporary Race Day bypass; `git status` shows only intended files.
- [ ] Code review of the branch diff, then report.
