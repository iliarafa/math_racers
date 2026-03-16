# Lane Racer — Design Spec

## Context

F1 Math Racer currently has a text-based racing game where players answer math questions to advance sectors. This spec adds a **Lane Racer** — a visual mini-game where players steer a pixel-art car across 3 lanes on a scrolling road to collect correct answers. It provides a different, more arcade-style way to practice math within the same app.

## Game Concept

- **View:** Top-down overhead, road scrolls vertically downward
- **Visual style:** White background, black pixel-art graphics, crisp and clean. Car drawn programmatically (upgradeable to sprite later)
- **Lanes:** 3 lanes separated by dashed dividers, solid road edges
- **Gameplay:** Math question shown at the bottom. 3 answers (1 correct, 2 wrong) scroll down the road, one per lane. Player switches lanes to drive through the correct answer.
- **Race length:** 20 questions (matches `RACE_LENGTH` constant)

## Controls

- **Desktop:** Left/Right arrow keys or A/D to switch lanes. Car snaps to adjacent lane with smooth interpolation (~150ms ease-out).
- **Mobile:** Swipe left/right or tap left/right halves of screen.

## Game Flow

### 1. Setup Screen
- Select operation (circuit): SPA (+), Monaco (−), Monza (×), Suzuka (÷), Silverstone (var)
- Select difficulty (maps to `Difficulty` type): Karting = `'beginner'`, F3 = `'easy'`, F2 = `'medium'`, F1 = `'hard'`
- Uses existing circuit/difficulty data from `gameLogic.ts`
- All circuits/difficulties unlocked (arcade mode, like Practice — bypasses championship locks)
- START button launches the race
- This is a free feature (no paywall gating)

### 2. Racing
- Canvas renders the road, lane dividers, car, and answer tokens
- Road scrolls continuously at a base speed
- Each question cycle:
  1. Call `generateQuestion(circuitId, difficulty)` — pass the circuit's `id` string (e.g., `"spa"`, `"monza"`) and the mapped `Difficulty` value
  2. Call `generateWrongAnswers(question.answer, 2)` to produce 2 plausible distractors
  3. Shuffle 3 answers randomly across 3 lane positions
  4. Answer tokens spawn at the top of the canvas, scroll downward toward the car
  5. Player steers to the correct lane before answers reach the car
- HUD (DOM overlay): question counter (Q 7/20), correct count (✓ 5)
- Question bar (DOM, fixed at bottom): displays `question.display` string
- Auto-pause on `visibilitychange` event (tab/app switch). Resume on return.

### 3. Collision & Answer Resolution

**Collision model:** Lane-based, not pixel-based. A "hit" occurs when:
- The answer token's vertical center passes through the car's vertical hitbox zone (car Y ± 20px)
- The answer token is in the **same lane** as the car (lane index match)
- If the car is mid-transition between lanes, use the **target lane** (the lane the car is moving toward)

**Resolution:**
- **Correct hit:** Brief visual feedback (the answer token flashes/disappears), question counter advances, next question spawns after a gap
- **Wrong hit:** Speed reduces to 40% for 1 second, then ramps back. Question counter advances (counts as answered wrong). Next question spawns.
- **Miss (all 3 tokens pass below the car):** Treated as wrong answer. Speed penalty applies. Question counter advances. A new question spawns — the missed question does NOT repeat.

This means the game always progresses through exactly 20 questions regardless of player performance.

### 4. Finish Screen
- Shows after 20 questions are resolved (hit or missed)
- Stats: correct count / 20, accuracy %, total time
- Buttons: RETRY (same settings) and HOME (navigate to `/game`)
- Results are ephemeral — not saved to racer log or championship progression (this is an arcade mini-game)

## Rendering (Canvas)

- HTML `<canvas>` element with `requestAnimationFrame` game loop
- `image-rendering: pixelated` on canvas for crisp pixel art
- All drawing uses `fillRect` / `strokeRect` for pixel-art aesthetic
- **Canvas sizing:** Width = container width (capped at 500px). Height = container height (viewport minus question bar). Aspect ratio adapts to device.
- **Coordinate system:** All positions calculated as fractions of canvas dimensions, then rounded to integers for pixel-perfect rendering

### Car
- ~30×50 logical pixels, drawn as black rectangle composition (body, wheels, rear wing)
- Positioned at bottom ~15% of canvas, horizontally centered in its lane
- Lane positions: left = canvas center - laneWidth, center = canvas center, right = canvas center + laneWidth

### Road
- Centered on canvas, ~60% of canvas width
- Solid black edge lines (2px)
- Dashed lane dividers (2px, 8px dash, 16px gap)
- Center line: white dashed (for visual reference)
- Road markings scroll downward to create motion illusion

### Answer Tokens
- Black-outlined rectangles (~60×30px) with white fill and black number text
- Centered within their lane
- Spawn at y = -40 (above canvas top), scroll down at road speed
- Text rendered with `ctx.fillText`, monospace font, centered in token

### Speed & Timing
- **Base speed:** 3 px/frame at 60fps (≈180 px/sec)
- **Ramp:** +0.1 px/frame per 5 questions answered (so Q16-20 runs at ~3.3 px/frame)
- **Max speed:** 4 px/frame
- **Slowdown penalty:** Drops to 40% of current speed for 60 frames (~1 sec), then linear ramp back over 30 frames
- **Answer spacing:** New answer set spawns when previous set's Y position passes 30% of canvas height (ensures ~2 seconds of reaction time at base speed)

### Sound
- Reuse existing Web Audio API patterns from the codebase
- Correct answer: short high-pitched beep (similar to existing correct-answer sound)
- Wrong answer / miss: low tone (similar to existing wrong-answer sound)
- Lane switch: subtle click
- Respects `state.soundEnabled` toggle

## New Utility: `generateWrongAnswers()`

Added to `client/src/lib/gameLogic.ts`:

```typescript
export function generateWrongAnswers(correctAnswer: number, count: number): number[]
```

- Generates `count` unique wrong answers near the correct answer
- **Offset strategy:**
  - If correctAnswer ≤ 5: offsets from set {±1, ±2, ±3} (small numbers need small offsets)
  - If correctAnswer ≤ 20: offsets of ±1 to ±5, randomly chosen
  - If correctAnswer > 20: offsets of ±(1 to Math.ceil(correctAnswer * 0.3)), capped at ±20
- All wrong answers are positive integers (≥ 1)
- No duplicates among wrong answers or with correct answer
- Retry loop (max 10 attempts) if random offset produces a duplicate

## File Structure

### New Files
- `client/src/pages/LaneRacer.tsx` — Page component (setup screen, canvas mount, HUD overlay, finish screen)
- `client/src/lib/laneRacerEngine.ts` — Canvas game engine (game loop, rendering, collision detection, state management)

### Modified Files
- `client/src/App.tsx` — Add route: `<Route path="/lane-racer" component={LaneRacer} />`
- `client/src/lib/gameLogic.ts` — Add `generateWrongAnswers()` function
- `client/src/pages/Game.tsx` — Add "LANE RACER" button in the `mode_select` screen alongside Career / Grand Prix / PST options

## Integration Points

### Reused from existing codebase:
- `generateQuestion(circuitId, difficulty)` from `client/src/lib/gameLogic.ts` (line 929) — question generation. Pass circuit `.id` string as first arg, `Difficulty` type as second.
- `useGameState()` hook — access `soundEnabled` setting
- `GameLayout` from `client/src/components/layout/GameLayout.tsx` — page wrapper with `lockViewport`
- `CIRCUITS` array, `Difficulty` type, `Question` interface from `gameLogic.ts`
- `RACE_LENGTH` constant (= 20)
- `cn()` utility from `client/src/lib/utils.ts`
- Wouter `Link` / `useLocation` for navigation

### State:
- No persistent state beyond what `useGameState()` already provides
- Game session state is local to the component (useState)
- No new localStorage keys needed

## Verification

1. Run `npm run dev` and navigate to `/lane-racer`
2. Select an operation and difficulty, press START
3. Verify road scrolls smoothly, answers appear in 3 lanes, car switches lanes on arrow keys/A/D
4. Verify correct answer: visual feedback + next question
5. Verify wrong answer: speed slows temporarily
6. Verify miss: tokens scroll past, treated as wrong, next question spawns
7. Complete 20 questions — verify finish screen with accurate stats
8. Test RETRY and HOME buttons
9. Test on mobile viewport — verify swipe and tap controls
10. Test pause: switch browser tab mid-game, verify game pauses and resumes
11. Navigate from Game.tsx mode select to Lane Racer and back
12. Run `npm run check` for TypeScript errors
13. Run `npm run build` for production build
