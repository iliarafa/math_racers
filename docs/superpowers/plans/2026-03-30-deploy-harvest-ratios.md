# DEPLOY/HARVEST: An Introduction to Ratios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Jeddah Ratios circuit to career mode and build the DEPLOY/HARVEST standalone game mode with real-time energy management and stint-based ratio feedback.

**Architecture:** Two deliverables sharing a ratio question generator. Jeddah circuit integrates into existing Game.tsx via gameLogic.ts changes. DEPLOY/HARVEST is a new page (DeployHarvest.tsx) with its own route, importing shared utilities from gameLogic.ts — following the Lane Racer pattern of a standalone mode page with shared engine.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion, Wouter routing, existing gameLogic.ts engine

**Spec:** `docs/superpowers/specs/2026-03-30-deploy-harvest-ratios-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/lib/ratioQuestions.ts` | Create | Ratio question generator for 4 difficulty tiers, all question types |
| `client/src/lib/gameLogic.ts` | Modify | Add jeddah circuit, ratios operation type, bot modifier, ratio ranges |
| `client/src/pages/DeployHarvest.tsx` | Create | Full DEPLOY/HARVEST mode: setup, racing, stints, ratio feedback, results |
| `client/src/pages/Hub.tsx` | Modify | Add DEPLOY/HARVEST mode card |
| `client/src/App.tsx` | Modify | Add route + import for DeployHarvest |
| `client/src/pages/Regulations.tsx` | Modify | Add Jeddah circuit + DEPLOY/HARVEST rules |

---

### Task 1: Ratio Question Generator

**Files:**
- Create: `client/src/lib/ratioQuestions.ts`

This is the foundational piece — both the Jeddah career circuit and DEPLOY/HARVEST mode depend on it.

- [ ] **Step 1: Create ratioQuestions.ts with types and Karting generator**

```typescript
// client/src/lib/ratioQuestions.ts
import type { Question, Difficulty } from './gameLogic';

interface RatioRange {
  min: number;
  max: number;
}

// Ranges control the multipliers/scale of ratio problems per difficulty
const RATIO_RANGES: Record<Difficulty, RatioRange> = {
  beginner: { min: 1, max: 5 },   // multipliers 1-5, base ratios 1-10
  easy:     { min: 2, max: 10 },   // ratios up to 50, multipliers up to 10
  medium:   { min: 3, max: 12 },   // ratios up to 100, multi-step
  hard:     { min: 5, max: 15 },   // unit rates, efficiency comparisons
};

// Boosted ranges for deploy mode at F1 difficulty
const BOOSTED_RATIO_RANGE: RatioRange = { min: 8, max: 20 };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Karting: "For every X, there are Y. If there are Z X's, how many Y's?"
function generateBeginnerRatio(): { display: string; answer: number; num1: number; num2: number } {
  const a = randInt(2, 5);      // ratio part A
  const b = randInt(2, 6);      // ratio part B (different from a)
  const multiplier = randInt(2, 5);
  const givenValue = a * multiplier;
  const answer = b * multiplier;

  const contexts = [
    [`For every ${a} pit stops, there are ${b} tire changes`, `If there are ${givenValue} pit stops, how many tire changes?`],
    [`For every ${a} red cars, there are ${b} blue cars`, `If there are ${givenValue} red cars, how many blue?`],
    [`For every ${a} laps, a car uses ${b} units of fuel`, `How many units for ${givenValue} laps?`],
    [`A team has ${a} mechanics for every ${b} engineers`, `If there are ${givenValue} mechanics, how many engineers?`],
  ];
  const [setup, question] = contexts[Math.floor(Math.random() * contexts.length)];

  return { display: `${setup}. ${question}`, answer, num1: a, num2: b };
}

// F3: Equivalent ratios and simplifying
function generateEasyRatio(): { display: string; answer: number; num1: number; num2: number } {
  const type = Math.floor(Math.random() * 3);

  if (type === 0) {
    // Complete equivalent ratio: a:b = ?:c
    const a = randInt(2, 8);
    const b = randInt(2, 8);
    const multiplier = randInt(2, 6);
    const c = b * multiplier;
    const answer = a * multiplier;
    return { display: `${a} : ${b} = ? : ${c}`, answer, num1: a, num2: b };
  } else if (type === 1) {
    // Complete equivalent ratio: a:b = c:?
    const a = randInt(2, 8);
    const b = randInt(2, 8);
    const multiplier = randInt(2, 6);
    const c = a * multiplier;
    const answer = b * multiplier;
    return { display: `${a} : ${b} = ${c} : ?`, answer, num1: a, num2: b };
  } else {
    // Simplify ratio: "Simplify a:b. First number?"
    const gcdVal = randInt(2, 6);
    const simpA = randInt(1, 8);
    const simpB = randInt(1, 8);
    const a = simpA * gcdVal;
    const b = simpB * gcdVal;
    const answer = simpA; // First number of simplified form
    return { display: `Simplify ${a} : ${b}. What is the first number?`, answer, num1: a, num2: b };
  }
}

// F2: Proportions and word problems
function generateMediumRatio(): { display: string; answer: number; num1: number; num2: number } {
  const type = Math.floor(Math.random() * 3);

  if (type === 0) {
    // "If X laps use Y energy, how many for Z laps?"
    const laps1 = randInt(2, 6);
    const energy1 = laps1 * randInt(2, 8);
    const laps2 = randInt(3, 12);
    const answer = (energy1 / laps1) * laps2;
    return {
      display: `If ${laps1} laps use ${energy1} units, how many units for ${laps2} laps?`,
      answer, num1: energy1, num2: laps1,
    };
  } else if (type === 1) {
    // "A car deploys X for every Y it harvests. After Z deploys, how many harvests?"
    const deploy = randInt(2, 5);
    const harvest = randInt(2, 5);
    const totalDeploy = deploy * randInt(2, 6);
    const answer = (totalDeploy / deploy) * harvest;
    return {
      display: `A car deploys ${deploy} units for every ${harvest} it harvests. After ${totalDeploy} deploys, how many harvests?`,
      answer, num1: deploy, num2: harvest,
    };
  } else {
    // "Complete: a:b = c:?"
    const a = randInt(3, 10);
    const b = randInt(3, 10);
    const multiplier = randInt(3, 8);
    const c = a * multiplier;
    const answer = b * multiplier;
    return { display: `${a} : ${b} = ${c} : ?`, answer, num1: a, num2: b };
  }
}

// F1: Unit rates and multi-step rate problems
function generateHardRatio(boosted: boolean = false): { display: string; answer: number; num1: number; num2: number } {
  const range = boosted ? BOOSTED_RATIO_RANGE : RATIO_RANGES.hard;
  const type = Math.floor(Math.random() * 3);

  if (type === 0) {
    // "Car uses X units per Y laps. How many units in Z laps?"
    const unitsPerGroup = randInt(range.min, range.max);
    const lapsPerGroup = randInt(2, 5);
    const targetLaps = lapsPerGroup * randInt(2, 6);
    const answer = (unitsPerGroup / lapsPerGroup) * targetLaps;
    return {
      display: `A car uses ${unitsPerGroup} units per ${lapsPerGroup} laps. How many units in ${targetLaps} laps?`,
      answer, num1: unitsPerGroup, num2: lapsPerGroup,
    };
  } else if (type === 1) {
    // "Deploy ratio is a:b. In Z total actions, how many deploys?"
    const deployPart = randInt(2, 5);
    const harvestPart = randInt(2, 5);
    const total = (deployPart + harvestPart) * randInt(2, 6);
    const answer = (deployPart / (deployPart + harvestPart)) * total;
    return {
      display: `Deploy:Harvest ratio is ${deployPart}:${harvestPart}. In ${total} total actions, how many deploys?`,
      answer, num1: deployPart, num2: harvestPart,
    };
  } else {
    // "X units across Y questions in deploy. Z units across W questions in harvest. Total units after A deploy + B harvest?"
    const dRate = randInt(range.min, range.max);
    const dQuestions = randInt(2, 5);
    const hRate = randInt(2, range.min);
    const hQuestions = randInt(2, 5);
    const numDeploy = randInt(2, 4);
    const numHarvest = randInt(2, 4);
    const answer = (dRate * numDeploy) + (hRate * numHarvest);
    return {
      display: `Deploy costs ${dRate} per ${dQuestions} Qs. Harvest gains ${hRate} per ${hQuestions} Qs. Total cost for ${numDeploy * dQuestions} deploy + ${numHarvest * hQuestions} harvest Qs?`,
      answer, num1: dRate, num2: hRate,
    };
  }
}

/**
 * Generate a ratio question for the given difficulty.
 * @param difficulty - Player's selected difficulty tier
 * @param boosted - If true, use harder ranges (for deploy mode at F1)
 * @param previousDisplay - Avoid back-to-back duplicate questions
 */
export function generateRatioQuestion(
  difficulty: Difficulty,
  boosted: boolean = false,
  previousDisplay?: string
): Question {
  let result: { display: string; answer: number; num1: number; num2: number };
  let attempts = 0;

  do {
    attempts++;
    switch (difficulty) {
      case 'beginner':
        result = generateBeginnerRatio();
        break;
      case 'easy':
        result = generateEasyRatio();
        break;
      case 'medium':
        result = generateMediumRatio();
        break;
      case 'hard':
        result = generateHardRatio(boosted);
        break;
      default:
        result = generateBeginnerRatio();
    }
  } while (previousDisplay && result.display === previousDisplay && attempts < 5);

  // Bot time placeholder — will be set by calculateBotTime in gameLogic.ts
  return {
    display: result.display,
    answer: result.answer,
    botTime: 0,
    num1: result.num1,
    num2: result.num2,
    operation: 'Ratios',
  };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/iliasrafailidis/development/math_racers && npx tsc --noEmit client/src/lib/ratioQuestions.ts 2>&1 | head -20`

If there are import path issues (tsconfig aliases), verify with:
Run: `npm run check 2>&1 | grep -i ratio | head -10`

Expected: No errors related to ratioQuestions.ts

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/ratioQuestions.ts
git commit -m "feat: add ratio question generator for 4 difficulty tiers"
```

---

### Task 2: Add Jeddah Circuit to gameLogic.ts

**Files:**
- Modify: `client/src/lib/gameLogic.ts`

- [ ] **Step 1: Add Jeddah to the CIRCUITS array**

After the silverstone entry (line 165), add jeddah:

```typescript
  {
    id: "jeddah",
    name: "JEDDAH",
    type: "Ratios",
    description: "The Energy Corridor",
    mapUrl: "",
    paths: {
      s1: "M 40 80 L 60 30 Q 80 10 120 10 L 200 10 Q 240 10 250 40 L 260 70",
      s2: "M 260 70 L 270 100 Q 275 130 250 140 L 180 145 Q 140 145 120 130 L 100 110",
      s3: "M 100 110 Q 80 90 60 100 L 45 110 Q 30 120 30 100 L 40 80"
    }
  }
```

- [ ] **Step 2: Add ratios to the OperationRanges interface and BASE_RANGES**

In the `OperationRanges` interface (line 661), add:
```typescript
  ratios: { min: number; max: number };
```

In each `BASE_RANGES` entry, add the ratios field:
- `beginner`: `ratios: { min: 1, max: 5 },`
- `easy`: `ratios: { min: 2, max: 10 },`
- `medium`: `ratios: { min: 3, max: 12 },`
- `hard`: `ratios: { min: 5, max: 15 },`

In `BOOSTED_HARD_RANGES` (line 706), add:
```typescript
  ratios: { min: 8, max: 20 },
```

In `getOperationRanges()` return block (line 748), add:
```typescript
    ratios: interpolateRange(baseRanges.ratios, nextRanges.ratios, totalFactor),
```

- [ ] **Step 3: Add Ratios case to generateQuestion switch**

Before the `default:` case (line 985), add a new case:

```typescript
    case "Ratios": {
      // Delegate to dedicated ratio question generator
      const { generateRatioQuestion } = await import('./ratioQuestions');
      // ... actually, since generateQuestion is synchronous, use a static import
    }
```

Wait — `generateQuestion` is synchronous. Use a static import at the top of gameLogic.ts instead:

At the top of gameLogic.ts (after line 1), add:
```typescript
import { generateRatioQuestion } from './ratioQuestions';
```

Then add the Ratios case before `default:`:
```typescript
    case "Ratios": {
      const ratioQ = generateRatioQuestion(difficulty, boostFactor > 0, previousDisplay);
      display = ratioQ.display;
      answer = ratioQ.answer;
      num1 = ratioQ.num1 ?? 0;
      num2 = ratioQ.num2 ?? 0;
      break;
    }
```

- [ ] **Step 4: Add Ratios bot operation modifier**

In the `calculateBotTime` switch statement (line 626), add before the closing brace:
```typescript
    case "Ratios":
      operationModifier = 1.20; // Similar to Division complexity
      break;
```

- [ ] **Step 5: Add Ratios to EXPECTED_TIMES**

Find the `EXPECTED_TIMES` record. Add a `Ratios` entry to each difficulty level matching Division's times (since they have similar complexity):
- `beginner`: `Ratios: 5000`
- `easy`: `Ratios: 6000`
- `medium`: `Ratios: 7000`
- `hard`: `Ratios: 8000`

- [ ] **Step 6: Verify compilation**

Run: `npm run check 2>&1 | head -20`

Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/gameLogic.ts
git commit -m "feat: add Jeddah circuit with Ratios operation to career mode"
```

---

### Task 3: Add Route and Hub Card

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/Hub.tsx`

- [ ] **Step 1: Add DeployHarvest import and route to App.tsx**

After the LaneRacer import (line 24), add:
```typescript
import DeployHarvest from "@/pages/DeployHarvest";
```

After the lane-racer route (line 41), add:
```typescript
      <Route path="/deploy-harvest" component={DeployHarvest} />
```

Add `/deploy-harvest` to the `MENU_ROUTES` array (line 47).

- [ ] **Step 2: Add DEPLOY/HARVEST card to Hub.tsx**

After the Multiplayer card's closing `</Link>` (line 115) and before the Garage card comment (line 117), add:

```tsx
          {/* Deploy/Harvest */}
          <Link href="/deploy-harvest">
            <motion.button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              whileTap={{ scale: 0.98 }}
              style={hubCardStyle}
            >
              <span className="block" style={hubTitleStyle}>DEPLOY/HARVEST</span>
              <span className="block" style={hubSubStyle}>ENERGY MANAGEMENT</span>
            </motion.button>
          </Link>
```

- [ ] **Step 3: Create placeholder DeployHarvest.tsx so the route doesn't break**

Create a minimal placeholder so the app compiles:

```typescript
// client/src/pages/DeployHarvest.tsx
export default function DeployHarvest() {
  return <div className="h-screen flex items-center justify-center text-white text-2xl">DEPLOY/HARVEST — Coming Soon</div>;
}
```

- [ ] **Step 4: Verify the app compiles and Hub shows the new card**

Run: `npm run check 2>&1 | head -20`

Start the dev server and open http://localhost:8081/hub — verify the DEPLOY/HARVEST card appears between Multiplayer and Garage.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/pages/Hub.tsx client/src/pages/DeployHarvest.tsx
git commit -m "feat: add Deploy/Harvest route and Hub card"
```

---

### Task 4: DeployHarvest — Pre-Race Setup Screen

**Files:**
- Modify: `client/src/pages/DeployHarvest.tsx`

Replace the placeholder with the full component. This task covers only the pre-race setup screen (difficulty selection, lore card, start button).

- [ ] **Step 1: Build the setup screen**

```tsx
// client/src/pages/DeployHarvest.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useGameState, type Difficulty, CIRCUITS, DRIVERS, generateQuestion } from '@/lib/gameLogic';
import { generateRatioQuestion } from '@/lib/ratioQuestions';
import GameLayout from '@/components/layout/GameLayout';

type GameStatus = 'setup' | 'countdown' | 'go' | 'racing' | 'stint-review' | 'finished';

// Energy system constants from spec
const STARTING_ENERGY = 50;
const DEPLOY_DRAIN_PER_Q = 7;
const DEPLOY_WRONG_BONUS_PENALTY = 8;
const HARVEST_RECHARGE_PER_CORRECT = 7;
const DERATING_LOCKOUT_QUESTIONS = 3;
const DERATING_PROGRESS_MULTIPLIER = 0.5;
const DERATING_BOT_SPEED_MULTIPLIER = 1.5;
const DERATING_RECOVERY_ENERGY = 30;
const QUESTIONS_PER_STINT = 15;
const TOTAL_STINTS = 3;
const TOTAL_QUESTIONS = QUESTIONS_PER_STINT * TOTAL_STINTS;

export default function DeployHarvest() {
  const { state } = useGameState();

  // Setup state
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');

  // If still in setup, show the setup screen
  if (gameStatus === 'setup') {
    return (
      <GameLayout backHref="/hub" trackName="DEPLOY/HARVEST">
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 max-w-lg mx-auto w-full gap-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}>
              DEPLOY/HARVEST
            </h1>
            <p className="text-sm text-white/60 mt-1 uppercase tracking-widest"
               style={{ fontFamily: 'Oxanium, sans-serif' }}>
              An Introduction to Ratios
            </p>
          </div>

          {/* Lore Card */}
          <div className="w-full rounded-xl p-4 text-sm text-white/80 leading-relaxed"
               style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p className="font-semibold text-white mb-2" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              2026 ENERGY CRISIS
            </p>
            <p>
              The new F1 regulations split power 50/50 between engine and electric motor.
              Drivers must manage their battery — <span className="text-green-400 font-semibold">deploy</span> for
              speed bursts or <span className="text-blue-400 font-semibold">harvest</span> to recharge.
              Get the ratio wrong and you'll derate — becoming a sitting duck.
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="w-full">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-3 text-center"
               style={{ fontFamily: 'Oxanium, sans-serif' }}>
              SELECT SERIES
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DRIVERS.map((driver) => (
                <motion.button
                  key={driver.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDifficulty(driver.difficulty)}
                  className={`rounded-xl p-3 text-center transition-all ${
                    selectedDifficulty === driver.difficulty
                      ? 'ring-2 ring-green-400 bg-white/15'
                      : 'bg-white/8 hover:bg-white/12'
                  }`}
                  style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <span className="block text-white font-bold text-sm" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                    {driver.label}
                  </span>
                  <span className="block text-white/50 text-xs mt-0.5">
                    {driver.id === 'karting' ? 'Ages 6-8' : driver.id === 'f3' ? 'Ages 8-10' : driver.id === 'f2' ? 'Ages 10-12' : 'Ages 12+'}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Race Info */}
          <div className="flex gap-4 text-center text-xs text-white/50">
            <div>
              <span className="block text-white font-bold text-lg">3</span>
              Stints
            </div>
            <div>
              <span className="block text-white font-bold text-lg">45</span>
              Questions
            </div>
            <div>
              <span className="block text-white font-bold text-lg">50%</span>
              Start Energy
            </div>
          </div>

          {/* Start Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setGameStatus('countdown')}
            className="w-full py-4 rounded-xl bg-green-500 text-white font-bold text-lg uppercase tracking-wider"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            LIGHTS OUT
          </motion.button>
        </div>
      </GameLayout>
    );
  }

  // Placeholder for racing states — built in next tasks
  return (
    <GameLayout lockViewport trackName="DEPLOY/HARVEST">
      <div className="flex items-center justify-center flex-1 text-white text-xl">
        Racing... (status: {gameStatus})
      </div>
    </GameLayout>
  );
}
```

- [ ] **Step 2: Verify setup screen renders**

Run: `npm run check 2>&1 | head -20`

Open http://localhost:8081/deploy-harvest — verify:
- Title "DEPLOY/HARVEST" with subtitle "An Introduction to Ratios"
- Lore card with 2026 energy crisis text
- 4 difficulty buttons (Karting/F3/F2/F1) with selection highlighting
- Race info (3 stints, 45 questions, 50% energy)
- Green "LIGHTS OUT" button

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DeployHarvest.tsx
git commit -m "feat: build Deploy/Harvest pre-race setup screen"
```

---

### Task 5: DeployHarvest — Countdown, Core Racing Loop & Energy System

**Files:**
- Modify: `client/src/pages/DeployHarvest.tsx`

This is the largest task. It builds the countdown, the core question→answer loop, the deploy/harvest toggle, the energy system, derating, and bot progression.

- [ ] **Step 1: Add all racing state variables**

Inside the `DeployHarvest` component, after the setup state variables, add:

```tsx
  // Racing state
  const [energy, setEnergy] = useState(STARTING_ENERGY);
  const [mode, setMode] = useState<'deploy' | 'harvest'>('harvest'); // Start in harvest
  const [isDerating, setIsDerating] = useState(false);
  const [deratingQuestionsLeft, setDeratingQuestionsLeft] = useState(0);
  const [progress, setProgress] = useState(0); // Player sector progress (0 to TOTAL_QUESTIONS)
  const [botProgress, setBotProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [currentQuestionMistakes, setCurrentQuestionMistakes] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [currentStint, setCurrentStint] = useState(1); // 1, 2, or 3
  const [stintQuestionNum, setStintQuestionNum] = useState(0); // 0-14 within current stint
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [raceStartTime, setRaceStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownLight, setCountdownLight] = useState(0);
  const [showTrackLimits, setShowTrackLimits] = useState(false);
  const [showBoostMessage, setShowBoostMessage] = useState('');

  // Stint tracking for ratio feedback
  const [stintDeployCount, setStintDeployCount] = useState(0);
  const [stintHarvestCount, setStintHarvestCount] = useState(0);
  const [stintDeployCorrect, setStintDeployCorrect] = useState(0);
  const [stintHarvestCorrect, setStintHarvestCorrect] = useState(0);

  // Bot timer ref
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

- [ ] **Step 2: Add countdown logic**

```tsx
  // Countdown sequence — same pattern as Game.tsx
  useEffect(() => {
    if (gameStatus !== 'countdown') return;
    setCountdownLight(0);

    const lightTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 5; i++) {
      lightTimers.push(setTimeout(() => setCountdownLight(i), i * 1000));
    }

    // Random delay after last light (200-1300ms)
    const goDelay = 5000 + 200 + Math.random() * 1100;
    lightTimers.push(setTimeout(() => {
      setGameStatus('go');
      setTimeout(() => {
        setGameStatus('racing');
        setRaceStartTime(Date.now());
        spawnQuestion();
        startBotTimer();
      }, 300);
    }, goDelay));

    return () => lightTimers.forEach(clearTimeout);
  }, [gameStatus]);

  // Elapsed time ticker
  useEffect(() => {
    if (gameStatus !== 'racing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - raceStartTime);
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStatus, raceStartTime]);
```

- [ ] **Step 3: Add question spawning and bot timer**

```tsx
  const spawnQuestion = useCallback(() => {
    const boosted = mode === 'deploy';
    const harderDifficulty = boosted && selectedDifficulty !== 'hard'
      ? (['beginner', 'easy', 'medium', 'hard'] as Difficulty[])[
          Math.min((['beginner', 'easy', 'medium', 'hard'] as Difficulty[]).indexOf(selectedDifficulty) + 1, 3)
        ]
      : selectedDifficulty;

    const q = generateRatioQuestion(
      boosted ? harderDifficulty : selectedDifficulty,
      boosted && selectedDifficulty === 'hard', // use BOOSTED ranges for F1+deploy
      currentQuestion?.display
    );
    // Set bot time using the Question's operation
    q.botTime = calculateBotTimeForRatios(harderDifficulty);
    setCurrentQuestion(q);
    setAnswer('');
    setFeedback('idle');
    setCurrentQuestionMistakes(0);
  }, [mode, selectedDifficulty, currentQuestion?.display]);

  // Simple bot time calculation (reuses the pattern from gameLogic.ts)
  function calculateBotTimeForRatios(difficulty: Difficulty): number {
    const baseTimes: Record<Difficulty, number> = {
      beginner: 2500, easy: 3500, medium: 4500, hard: 6000,
    };
    const base = baseTimes[difficulty];
    const modifier = 1.20; // Ratios modifier
    const randomFactor = 0.75 + Math.random() * 0.5;
    return Math.round(base * modifier * randomFactor);
  }

  const startBotTimer = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    const advanceBot = () => {
      setBotProgress(prev => {
        if (prev >= TOTAL_QUESTIONS) return prev;
        return prev + 1;
      });

      // Schedule next bot advance
      const nextDelay = calculateBotTimeForRatios(selectedDifficulty)
        * (isDerating ? (1 / DERATING_BOT_SPEED_MULTIPLIER) : 1); // Bot is faster during player derating
      botTimerRef.current = setTimeout(advanceBot, nextDelay);
    };

    const initialDelay = calculateBotTimeForRatios(selectedDifficulty);
    botTimerRef.current = setTimeout(advanceBot, initialDelay);
  }, [selectedDifficulty, isDerating]);

  // Cleanup bot timer
  useEffect(() => {
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, []);
```

- [ ] **Step 4: Add answer submission and energy management**

```tsx
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || feedback !== 'idle' || !answer) return;

    const isCorrect = parseInt(answer) === currentQuestion.answer;

    if (isCorrect) {
      setFeedback('correct');

      // Energy change
      if (isDerating) {
        // No energy change during derating — it's managed by the lockout
      } else if (mode === 'deploy') {
        setEnergy(prev => Math.max(0, prev - DEPLOY_DRAIN_PER_Q));
      } else {
        setEnergy(prev => Math.min(100, prev + HARVEST_RECHARGE_PER_CORRECT));
      }

      // Progress
      let progressGain = 1;
      if (isDerating) {
        progressGain = DERATING_PROGRESS_MULTIPLIER; // 0.5
      } else if (mode === 'deploy') {
        progressGain = 2; // 2x in deploy
      }

      // Track stint stats
      if (mode === 'deploy') {
        setStintDeployCount(prev => prev + 1);
        setStintDeployCorrect(prev => prev + 1);
      } else {
        setStintHarvestCount(prev => prev + 1);
        setStintHarvestCorrect(prev => prev + 1);
      }

      setProgress(prev => {
        const newProgress = Math.min(prev + progressGain, TOTAL_QUESTIONS);
        return newProgress;
      });
      setTotalQuestionsAnswered(prev => prev + 1);
      setStintQuestionNum(prev => prev + 1);

      // Handle derating countdown
      if (isDerating) {
        setDeratingQuestionsLeft(prev => {
          const remaining = prev - 1;
          if (remaining <= 0) {
            setIsDerating(false);
            setEnergy(DERATING_RECOVERY_ENERGY);
          }
          return remaining;
        });
      }

      // Check for derating trigger (energy hits 0 after drain)
      if (!isDerating && mode === 'deploy') {
        setEnergy(prevEnergy => {
          const newEnergy = prevEnergy; // Already updated above
          if (newEnergy <= 0) {
            setIsDerating(true);
            setDeratingQuestionsLeft(DERATING_LOCKOUT_QUESTIONS);
            setMode('harvest');
          }
          return prevEnergy;
        });
      }

      // Next question after brief feedback
      setTimeout(() => {
        // Check if stint is complete
        if (stintQuestionNum + 1 >= QUESTIONS_PER_STINT && currentStint < TOTAL_STINTS) {
          setGameStatus('stint-review');
        } else if (progress + progressGain >= TOTAL_QUESTIONS) {
          setGameStatus('finished');
          if (botTimerRef.current) clearTimeout(botTimerRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          spawnQuestion();
        }
      }, 300);

    } else {
      // Wrong answer
      setFeedback('incorrect');
      setMistakes(prev => prev + 1);
      setCurrentQuestionMistakes(prev => prev + 1);
      setShowTrackLimits(true);

      // Track stint stats (wrong answer still counts as attempt in the mode)
      if (mode === 'deploy') {
        setStintDeployCount(prev => prev + 1);
      } else {
        setStintHarvestCount(prev => prev + 1);
      }

      // Energy penalty
      if (mode === 'deploy' && !isDerating) {
        setEnergy(prev => {
          const newEnergy = Math.max(0, prev - DEPLOY_DRAIN_PER_Q - DEPLOY_WRONG_BONUS_PENALTY);
          if (newEnergy <= 0) {
            setIsDerating(true);
            setDeratingQuestionsLeft(DERATING_LOCKOUT_QUESTIONS);
            setMode('harvest');
          }
          return newEnergy;
        });
      }
      // Harvest wrong: no recharge (already handled by not adding)

      // Check for DNF (4 wrong on same question)
      if (currentQuestionMistakes + 1 >= 4) {
        setGameStatus('finished');
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      setTimeout(() => {
        setFeedback('idle');
        setAnswer('');
        setShowTrackLimits(false);
      }, 800);
    }
  }, [currentQuestion, answer, feedback, mode, isDerating, energy, stintQuestionNum, currentStint, progress, currentQuestionMistakes]);
```

- [ ] **Step 5: Add deploy/harvest toggle handler**

```tsx
  const toggleMode = useCallback(() => {
    if (isDerating || gameStatus !== 'racing') return;
    setMode(prev => prev === 'deploy' ? 'harvest' : 'deploy');
    setShowBoostMessage(mode === 'deploy' ? 'HARVESTING' : 'DEPLOYING');
    setTimeout(() => setShowBoostMessage(''), 1500);
  }, [isDerating, gameStatus, mode]);

  // Keypad handlers
  const handleKeypadPress = useCallback((key: string) => {
    if (feedback !== 'idle') return;
    if (key === 'del') {
      setAnswer(prev => prev.slice(0, -1));
    } else if (key === 'submit') {
      handleSubmit();
    } else {
      setAnswer(prev => prev.length < 6 ? prev + key : prev);
    }
  }, [feedback, handleSubmit]);

  // Keyboard support
  useEffect(() => {
    if (gameStatus !== 'racing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKeypadPress(e.key);
      else if (e.key === 'Backspace') handleKeypadPress('del');
      else if (e.key === 'Enter') handleKeypadPress('submit');
      else if (e.key === ' ') { e.preventDefault(); toggleMode(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameStatus, handleKeypadPress, toggleMode]);
```

- [ ] **Step 6: Build the racing UI**

Replace the placeholder racing return statement with the full racing UI. This is a large JSX block — the key sections are:

```tsx
  // Format time helper
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // Countdown screen
  if (gameStatus === 'countdown' || gameStatus === 'go') {
    return (
      <GameLayout lockViewport hideHeader>
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="flex gap-3 mb-8">
            {[1, 2, 3, 4, 5].map(light => (
              <div
                key={light}
                className={`w-8 h-8 rounded-full transition-all duration-200 ${
                  gameStatus === 'go'
                    ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]'
                    : countdownLight >= light
                      ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          {gameStatus === 'go' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold text-green-500"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              GO!
            </motion.div>
          )}
        </div>
      </GameLayout>
    );
  }

  // Racing screen
  if (gameStatus === 'racing') {
    return (
      <GameLayout lockViewport hideHeader>
        <div className="flex flex-col h-full">
          {/* Top bar: timer + stint + energy */}
          <div className="flex items-center justify-between px-3 py-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
            <div className="text-xs text-white/60 font-mono">{formatTime(elapsedTime)}</div>
            <div className="text-xs text-white/60 uppercase tracking-wider" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              Stint {currentStint}/{TOTAL_STINTS} · Q{stintQuestionNum + 1}/{QUESTIONS_PER_STINT}
            </div>
            <div className="text-xs text-white/60">{mistakes} mistake{mistakes !== 1 ? 's' : ''}</div>
          </div>

          {/* Progress bars */}
          <div className="px-3 space-y-1">
            {/* Bot */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/50 font-medium uppercase w-6">BOT</span>
              <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${TOTAL_QUESTIONS}, 1fr)` }}>
                {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                  <div key={i} className={`aspect-square rounded-[2px] ${i < botProgress ? 'bg-purple-500/70' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
            {/* Player */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/50 font-medium uppercase w-6">YOU</span>
              <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${TOTAL_QUESTIONS}, 1fr)` }}>
                {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                  <div key={i} className={`aspect-square rounded-[2px] ${
                    i < progress
                      ? (mode === 'deploy' ? 'bg-green-500' : 'bg-blue-500')
                      : i === Math.floor(progress) ? 'bg-white/30 animate-pulse'
                      : 'bg-white/10'
                  }`} />
                ))}
              </div>
            </div>
          </div>

          {/* Energy Bar */}
          <div className="px-3 mt-2">
            <div className="h-6 rounded-lg bg-white/10 overflow-hidden relative">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-lg ${
                  isDerating ? 'bg-red-500' : mode === 'deploy' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                animate={{
                  width: `${energy}%`,
                  opacity: isDerating ? [1, 0.5, 1] : 1,
                }}
                transition={{
                  width: { duration: 0.2 },
                  opacity: isDerating ? { repeat: Infinity, duration: 0.5 } : { duration: 0 },
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white z-10">
                {isDerating ? `DERATING (${deratingQuestionsLeft} Qs)` : `${energy}%`}
              </span>
            </div>
          </div>

          {/* Mode indicator + boost message */}
          <div className="text-center mt-2">
            <span className={`text-xs font-bold uppercase tracking-widest ${
              isDerating ? 'text-red-400' : mode === 'deploy' ? 'text-green-400' : 'text-blue-400'
            }`} style={{ fontFamily: 'Oxanium, sans-serif' }}>
              {isDerating ? '⚠ DERATING' : mode === 'deploy' ? '⚡ DEPLOYING' : '🔋 HARVESTING'}
            </span>
            <AnimatePresence>
              {showBoostMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-yellow-400 font-bold mt-1"
                >
                  {showBoostMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Question display */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {/* Track limits warning */}
            <AnimatePresence>
              {showTrackLimits && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/4 bg-red-600/90 text-white font-bold text-sm px-4 py-2 rounded-lg z-20"
                >
                  TRACK LIMITS
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-lg sm:text-xl md:text-2xl text-white/90 text-center leading-relaxed max-w-md">
              {currentQuestion?.display}
            </div>
            <div className={`text-4xl sm:text-5xl md:text-6xl font-bold mt-4 ${
              feedback === 'correct' ? 'text-green-500' : feedback === 'incorrect' ? 'text-red-500' : 'text-white/40'
            }`}>
              {answer || '?'}
            </div>
          </div>

          {/* Keypad with deploy/harvest toggle */}
          <div className="px-3 pb-3 grid grid-cols-3 gap-1.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            {/* Toggle button row */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMode}
              disabled={isDerating}
              className={`col-span-3 h-[48px] sm:h-[56px] rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                isDerating
                  ? 'bg-red-500/30 text-red-300 cursor-not-allowed'
                  : mode === 'deploy'
                    ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                    : 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
              }`}
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              {isDerating ? `DERATING — ${deratingQuestionsLeft} Qs` : mode === 'deploy' ? '⚡ DEPLOYING — tap to harvest' : '🔋 HARVESTING — tap to deploy'}
            </motion.button>

            {/* Number keys */}
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleKeypadPress(String(num))}
                className="h-[56px] sm:h-[72px] rounded-xl bg-white/10 text-white font-bold text-xl active:bg-white/20"
              >
                {num}
              </motion.button>
            ))}
            {/* Bottom row: del, 0, submit */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKeypadPress('del')}
              className="h-[56px] sm:h-[72px] rounded-xl bg-white/5 text-white/60 font-bold text-sm"
            >
              DEL
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKeypadPress('0')}
              className="h-[56px] sm:h-[72px] rounded-xl bg-white/10 text-white font-bold text-xl"
            >
              0
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKeypadPress('submit')}
              className={`h-[56px] sm:h-[72px] rounded-xl font-bold text-xl ${
                answer ? 'bg-green-500 text-white' : 'bg-white/5 text-white/30'
              }`}
            >
              ✓
            </motion.button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Fallback for other states (stint-review, finished — built in next tasks)
  return (
    <GameLayout lockViewport trackName="DEPLOY/HARVEST">
      <div className="flex items-center justify-center flex-1 text-white text-xl">
        {gameStatus}
      </div>
    </GameLayout>
  );
```

- [ ] **Step 7: Verify core racing loop works**

Run: `npm run check 2>&1 | head -30`

Open http://localhost:8081/deploy-harvest:
1. Select a difficulty, press LIGHTS OUT
2. Verify countdown (5 red lights → green GO → racing)
3. Verify ratio questions appear
4. Verify keypad works (number input, delete, submit)
5. Verify deploy/harvest toggle changes mode indicator and energy bar color
6. Verify energy drains in deploy, recharges in harvest
7. Verify spacebar toggles mode
8. Verify bot progress advances

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/DeployHarvest.tsx
git commit -m "feat: implement Deploy/Harvest core racing loop with energy system"
```

---

### Task 6: DeployHarvest — Stint Review Screen

**Files:**
- Modify: `client/src/pages/DeployHarvest.tsx`

- [ ] **Step 1: Add GCD helper and stint review JSX**

Add a GCD utility function near the top of the file (after constants):

```tsx
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplifyRatio(a: number, b: number): [number, number] {
  if (a === 0 && b === 0) return [0, 0];
  if (a === 0) return [0, 1];
  if (b === 0) return [1, 0];
  const d = gcd(a, b);
  return [a / d, b / d];
}
```

- [ ] **Step 2: Add the stint-review screen rendering**

In the component body, before the fallback return, add a block for `gameStatus === 'stint-review'`:

```tsx
  // Handler to continue to next stint
  const continueToNextStint = useCallback(() => {
    setCurrentStint(prev => prev + 1);
    setStintQuestionNum(0);
    setStintDeployCount(0);
    setStintHarvestCount(0);
    setStintDeployCorrect(0);
    setStintHarvestCorrect(0);
    setGameStatus('racing');
    spawnQuestion();
  }, [spawnQuestion]);

  if (gameStatus === 'stint-review') {
    const [simpDeploy, simpHarvest] = simplifyRatio(stintDeployCount, stintHarvestCount);
    const deployAccuracy = stintDeployCount > 0 ? Math.round((stintDeployCorrect / stintDeployCount) * 100) : 0;
    const harvestAccuracy = stintHarvestCount > 0 ? Math.round((stintHarvestCorrect / stintHarvestCount) * 100) : 0;

    // Optimal ratio: higher accuracy = more deploy is viable
    const overallAccuracy = (stintDeployCorrect + stintHarvestCorrect) / Math.max(stintDeployCount + stintHarvestCount, 1);
    const optimalDeployPart = overallAccuracy > 0.85 ? 3 : overallAccuracy > 0.7 ? 2 : 1;
    const optimalHarvestPart = overallAccuracy > 0.85 ? 1 : overallAccuracy > 0.7 ? 1 : 2;

    // Generate insight
    let insight = '';
    if (stintDeployCount === 0) {
      insight = 'You stayed in harvest the entire stint. Deploying occasionally gives 2x progress — try mixing it in next stint.';
    } else if (stintHarvestCount === 0) {
      insight = 'All deploy, no harvest! Aggressive, but risky. Mix in some harvest to avoid derating.';
    } else if (simpDeploy > optimalDeployPart * 1.5) {
      insight = `You deployed aggressively (${simpDeploy}:${simpHarvest}) vs optimal ${optimalDeployPart}:${optimalHarvestPart}. More harvesting would maintain higher accuracy on harder questions.`;
    } else if (simpHarvest > optimalHarvestPart * 1.5) {
      insight = `Conservative strategy (${simpDeploy}:${simpHarvest}). You could deploy more — your accuracy supports it.`;
    } else {
      insight = `Good balance (${simpDeploy}:${simpHarvest}). Your ratio is close to optimal for your accuracy level.`;
    }

    return (
      <GameLayout lockViewport trackName="DEPLOY/HARVEST">
        <div className="flex flex-col items-center justify-center flex-1 px-6 max-w-md mx-auto w-full gap-6">
          <div className="text-xs text-white/50 uppercase tracking-widest" style={{ fontFamily: 'Oxanium, sans-serif' }}>
            Stint {currentStint} Review
          </div>

          {/* Ratio display */}
          <div className="text-center">
            <div className="text-xs text-white/50 uppercase tracking-widest mb-2">Your Deploy : Harvest Ratio</div>
            <div className="text-5xl font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>
              <span className="text-green-400">{stintDeployCount}</span>
              <span className="text-white/30"> : </span>
              <span className="text-blue-400">{stintHarvestCount}</span>
            </div>
            <div className="text-sm text-white/50 mt-1">
              Simplified: <span className="text-white font-bold">{simpDeploy} : {simpHarvest}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-green-400">Deploy Acc.</div>
              <div className="text-2xl font-bold text-white">{deployAccuracy}%</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-blue-400">Harvest Acc.</div>
              <div className="text-2xl font-bold text-white">{harvestAccuracy}%</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-yellow-400">Optimal</div>
              <div className="text-2xl font-bold text-white">{optimalDeployPart} : {optimalHarvestPart}</div>
            </div>
          </div>

          {/* Insight */}
          <div className="w-full rounded-xl p-4 text-sm text-white/80 leading-relaxed"
               style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <span className="font-semibold text-yellow-400">Insight: </span>{insight}
          </div>

          {/* Energy status */}
          <div className="text-xs text-white/40">
            Energy: {energy}% · Progress: {progress}/{TOTAL_QUESTIONS} · Bot: {botProgress}/{TOTAL_QUESTIONS}
          </div>

          {/* Continue button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={continueToNextStint}
            className="w-full py-4 rounded-xl bg-green-500 text-white font-bold text-lg uppercase tracking-wider"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            STINT {currentStint + 1} — LIGHTS OUT
          </motion.button>
        </div>
      </GameLayout>
    );
  }
```

- [ ] **Step 3: Verify stint review screen**

Open http://localhost:8081/deploy-harvest, race through 15 questions toggling between deploy and harvest. After question 15, verify:
- Stint review screen appears
- Shows deploy:harvest ratio with simplified form
- Shows accuracy percentages
- Shows optimal ratio
- Shows insight text
- "STINT 2 — LIGHTS OUT" button continues to next stint

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/DeployHarvest.tsx
git commit -m "feat: add stint review screen with ratio feedback"
```

---

### Task 7: DeployHarvest — Results Screen

**Files:**
- Modify: `client/src/pages/DeployHarvest.tsx`

- [ ] **Step 1: Add the finished screen**

Add the results screen block for `gameStatus === 'finished'`:

```tsx
  if (gameStatus === 'finished') {
    const playerWon = progress >= TOTAL_QUESTIONS && (progress > botProgress || mistakes === 0);
    const position = progress > botProgress ? 1 : progress === botProgress ? (mistakes === 0 ? 1 : 2) : 2;
    const totalAccuracy = totalQuestionsAnswered > 0
      ? Math.round(((totalQuestionsAnswered - mistakes) / totalQuestionsAnswered) * 100)
      : 0;
    const isDNF = currentQuestionMistakes >= 4;

    return (
      <GameLayout trackName="DEPLOY/HARVEST" backHref="/hub">
        <div className="flex flex-col items-center justify-center flex-1 px-6 max-w-md mx-auto w-full gap-5 py-8">
          {/* Position */}
          <div className="text-center">
            {isDNF ? (
              <div className="text-6xl font-bold text-red-500" style={{ fontFamily: 'Oxanium, sans-serif' }}>DNF</div>
            ) : (
              <div className="text-7xl font-bold text-white tracking-tighter" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                P{position}
              </div>
            )}
            <div className="text-sm text-white/50 mt-1 uppercase tracking-wider">
              {isDNF ? 'Race Over — Too Many Mistakes' : position === 1 ? 'Race Winner' : 'Race Finished'}
            </div>
          </div>

          {/* Results grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-white/50">Time</div>
              <div className="text-lg font-bold text-white font-mono">{formatTime(elapsedTime)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-white/50">Accuracy</div>
              <div className="text-lg font-bold text-white">{totalAccuracy}%</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-white/50">Mistakes</div>
              <div className={`text-lg font-bold ${mistakes > 0 ? 'text-red-400' : 'text-green-400'}`}>{mistakes}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-xs text-white/50">Progress</div>
              <div className="text-lg font-bold text-white">{progress}/{TOTAL_QUESTIONS}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Reset all state
                setGameStatus('setup');
                setEnergy(STARTING_ENERGY);
                setMode('harvest');
                setIsDerating(false);
                setDeratingQuestionsLeft(0);
                setProgress(0);
                setBotProgress(0);
                setCurrentQuestion(null);
                setAnswer('');
                setMistakes(0);
                setCurrentQuestionMistakes(0);
                setFeedback('idle');
                setCurrentStint(1);
                setStintQuestionNum(0);
                setTotalQuestionsAnswered(0);
                setElapsedTime(0);
                setStintDeployCount(0);
                setStintHarvestCount(0);
                setStintDeployCorrect(0);
                setStintHarvestCorrect(0);
              }}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm uppercase tracking-wider"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              RACE AGAIN
            </motion.button>
            <Link href="/hub">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full py-3 rounded-xl text-white/70 font-bold text-sm uppercase tracking-wider"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', fontFamily: 'Oxanium, sans-serif' }}
              >
                MAIN MENU
              </motion.button>
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }
```

- [ ] **Step 2: Verify results screen**

Complete a full race (or trigger DNF by getting 4 wrong on one question). Verify:
- Position shows P1 or P2 (or DNF)
- Stats grid shows time, accuracy, mistakes, progress
- "RACE AGAIN" resets all state to setup
- "MAIN MENU" navigates to /hub

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DeployHarvest.tsx
git commit -m "feat: add Deploy/Harvest results screen"
```

---

### Task 8: Update Regulations Page

**Files:**
- Modify: `client/src/pages/Regulations.tsx`

- [ ] **Step 1: Read the current chapters array to find the insertion point**

Read `client/src/pages/Regulations.tsx` lines 22-264 to understand the exact structure and find where to add the new content.

- [ ] **Step 2: Add Jeddah circuit article to Chapter I (Race Procedures)**

Find the circuits/race article in Chapter I and add Jeddah to the circuit list. Add a new article for the Ratios operation:

```typescript
{
  id: "ratios",
  title: "Ratios (Jeddah)",
  description: "The Energy Corridor — Jeddah street circuit introduces ratio problems.",
  details: [
    "# Question Types by Series",
    "Karting — \"For every X, there are Y\" concrete ratio problems",
    "F3 — Equivalent ratios and simplifying (e.g., 3:5 = ?:15)",
    "F2 — Proportions and cross-multiplication word problems",
    "F1 — Unit rates, efficiency comparisons, multi-step rate calculations",
    "All answers are positive integers.",
  ],
},
```

- [ ] **Step 3: Add DEPLOY/HARVEST article to Chapter III (Race Formats)**

Add a new article to the Race Formats chapter:

```typescript
{
  id: "deploy-harvest",
  title: "Deploy/Harvest",
  description: "Energy management mode — An Introduction to Ratios. 3 stints of 15 questions with ratio feedback.",
  details: [
    "# How It Works",
    "Toggle between Deploy (⚡) and Harvest (🔋) modes during the race.",
    "Deploy — Harder questions, 2x progress, energy drains per question.",
    "Harvest — Base difficulty, 1x progress, energy recharges per correct answer.",
    "# Derating",
    "If energy hits 0%, you derate: forced harvest for 3 questions at 0.5x progress while the bot speeds up.",
    "# Stint Reviews",
    "After each stint of 15 questions, see your Deploy:Harvest ratio, accuracy breakdown, and optimal strategy feedback.",
    "# Energy System",
    "Start at 50% — Deploy drains 7% per question, wrong answer costs 15% total — Harvest recharges 7% per correct answer.",
  ],
  richDetails: [
    { color: "#22c55e", label: "Deploy", text: "2x progress, harder questions, energy drains" },
    { color: "#3b82f6", label: "Harvest", text: "1x progress, base difficulty, energy recharges" },
    { color: "#ef4444", label: "Derating", text: "0% energy = 3Q lockout, 0.5x progress, bot 1.5x speed" },
  ],
},
```

- [ ] **Step 4: Verify Regulations page**

Open http://localhost:8081/regulations — verify:
- Jeddah/Ratios article appears in circuits section
- Deploy/Harvest article appears in race formats section
- Content is accurate and readable

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Regulations.tsx
git commit -m "feat: add Jeddah Ratios circuit and Deploy/Harvest rules to Regulations"
```

---

### Task 9: Polish & Bug Fixes

**Files:**
- Modify: `client/src/pages/DeployHarvest.tsx`

This task catches issues found during manual testing of the full flow.

- [ ] **Step 1: Test the full flow end-to-end**

Open http://localhost:8081/deploy-harvest and test:
1. Setup → select each difficulty → press LIGHTS OUT
2. Countdown → 5 lights → GO → racing starts
3. Toggle deploy/harvest several times with spacebar and tap
4. Answer questions correctly and incorrectly in both modes
5. Verify energy drains in deploy (-7% per Q) and recharges in harvest (+7% per correct)
6. Deplete energy to 0% → verify derating (lockout, 0.5x progress, bot surge)
7. Complete 15 questions → verify stint review screen with ratio data
8. Continue through all 3 stints → verify results screen
9. Trigger DNF (4 wrong on same question) → verify DNF screen
10. Press "RACE AGAIN" → verify clean reset
11. Press "MAIN MENU" → verify navigation

- [ ] **Step 2: Fix any bugs found during testing**

Common issues to watch for:
- `spawnQuestion` dependency array missing variables (stale closures)
- Bot timer not restarting after stint review
- Energy state not updating correctly due to stale closure in `handleSubmit`
- Progress bar rendering for fractional progress (0.5x during derating)
- Stint question counter not resetting between stints

- [ ] **Step 3: Test Jeddah in career mode**

Open http://localhost:8081/game:
1. Verify Jeddah appears as the 6th circuit in circuit selection
2. Select Jeddah at Karting difficulty → start a race
3. Verify ratio questions appear (word problems, "For every X...")
4. Verify bot timing feels reasonable (~1.20x modifier)
5. Test with power-ups enabled → verify OVERTAKE/AERO work with ratio questions

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish Deploy/Harvest mode and fix bugs from testing"
```

---

## Post-Implementation Checklist

After all tasks are complete, verify:

- [ ] `npm run check` passes with no errors
- [ ] Hub page shows 4 cards: Single Player, Multiplayer, Deploy/Harvest, Garage
- [ ] `/deploy-harvest` route loads the full mode
- [ ] Jeddah appears as 6th circuit in career mode with ratio questions
- [ ] Regulations page documents both new features
- [ ] Full Deploy/Harvest race completes without crashes (3 stints, review screens, results)
- [ ] Energy system works correctly (drain, recharge, derating, recovery)
- [ ] Bot races alongside player at appropriate difficulty
