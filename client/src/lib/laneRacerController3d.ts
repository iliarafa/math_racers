import type { Difficulty } from './gameLogic';
import {
  BASE_SPEED,
  MAX_SPEED,
  speedAfterCorrect,
  speedAfterWrong,
  speedToKmh,
} from './laneRacerHud';

export interface LaneRacerEngineCallbacks {
  onCorrect: () => void;
  onWrong: () => void;
  onMiss: () => void;
  onFinished: () => void;
}

export interface AnswerToken3D {
  id: number;
  lane: number;
  value: number;
  z: number;
  isCorrect: boolean;
}

export interface LaneRacerRenderState {
  carLane: number;
  carLaneVisual: number;
  /** Continuous world X from carLaneVisual (not discrete lane centers). */
  carX: number;
  /** Yaw (rad) during lane change — 0 when settled. */
  carYaw: number;
  /** Roll (rad) during lane change — 0 when settled. */
  carRoll: number;
  /** Accumulated world scroll (same units as token.z). */
  worldScrollZ: number;
  /** Scroll applied this frame — same delta used for tokens and road geometry. */
  scrollDelta: number;
  tokens: AnswerToken3D[];
  flashColor: 'green' | 'red' | null;
  flashAlpha: number;
  speedKmh: number;
  popupLabel: string;
  popupAlpha: number;
  shakeMagnitude: number;
  carPunchScale: number;
  particles: Array<{ x: number; y: number; z: number; life: number; maxLife: number; color: string }>;
}

/** Early: flowing continuous X, flat (no lean). Late slide keeps lean. */
const LANE_EARLY_MS = 250;
const LANE_LATE_MS = 300;
/** Early stays flat — lean is reserved for late slides. */
const LANE_EARLY_YAW = 0;
const LANE_EARLY_ROLL = 0;
const LANE_LATE_YAW = (10 * Math.PI) / 180;
const LANE_LATE_ROLL = (5 * Math.PI) / 180;
/** Ease-out power: both modes cubic for continuous flow; late is longer + leans. */
const LANE_EARLY_EASE_POWER = 3;
const LANE_LATE_EASE_POWER = 3;
const FLASH_FRAMES = 12;
const SHAKE_FRAMES_WRONG = 14;
const CAR_PUNCH_FRAMES = 10;
const POPUP_FRAMES = 40;
const TOKEN_SPAWN_Z = -48;
const COLLISION_Z = 1.2;
const COLLISION_BAND = 1.4;
const LANE_X = [-2.4, 0, 2.4] as const;

// Match 2D engine timing: ~3.5 s from spawn to collision at BASE_SPEED (667 px canvas ref).
const TRACK_LENGTH = COLLISION_Z - TOKEN_SPAWN_Z;
/** Last 30% of spawn→collision: late-slide band. */
const LATE_SLIDE_FRACTION = 0.3;
const LATE_SLIDE_Z = COLLISION_Z - LATE_SLIDE_FRACTION * TRACK_LENGTH;
const TARGET_CROSS_FRAMES = 210;
const SCROLL_STEP = TRACK_LENGTH / (TARGET_CROSS_FRAMES * BASE_SPEED);

let nextTokenId = 0;

export function laneXForIndex(lane: number): number {
  return LANE_X[lane] ?? 0;
}

/** Continuous X across lanes 0..2 (fractional lane values interpolate). */
export function laneXVisual(lane: number): number {
  return LANE_X[0] + lane * (LANE_X[1] - LANE_X[0]);
}

export class LaneRacerController3D {
  private callbacks: LaneRacerEngineCallbacks;
  private totalQuestions: number;
  private difficulty: Difficulty;

  private carLane = 1;
  private carLaneVisual = 1;
  private carYaw = 0;
  private carRoll = 0;
  private laneTransitionStart = 0;
  private laneTransitionFrom = 1;
  private activeTransitionMs = LANE_EARLY_MS;
  private activeLeanYaw = LANE_EARLY_YAW;
  private activeLeanRoll = LANE_EARLY_ROLL;
  private activeEasePower = LANE_EARLY_EASE_POWER;
  private speed = BASE_SPEED;
  private worldScrollZ = 0;
  private scrollDelta = 0;
  private tokens: AnswerToken3D[] = [];
  private questionsAnswered = 0;
  private waitingForTokens = true;
  private paused = false;
  private combo = 0;
  private wrongStreak = 0;
  private flashFrames = 0;
  private flashColor: 'green' | 'red' | null = null;
  private shakeFrames = 0;
  private carPunchFrames = 0;
  private popupFrames = 0;
  private popupLabel = '';
  private particles: LaneRacerRenderState['particles'] = [];
  private burstPending = false;
  private onStructureChange: (() => void) | null = null;

  readonly renderState: LaneRacerRenderState = {
    carLane: 1,
    carLaneVisual: 1,
    carX: laneXVisual(1),
    carYaw: 0,
    carRoll: 0,
    worldScrollZ: 0,
    scrollDelta: 0,
    tokens: [],
    flashColor: null,
    flashAlpha: 0,
    speedKmh: speedToKmh(BASE_SPEED),
    popupLabel: '',
    popupAlpha: 0,
    shakeMagnitude: 0,
    carPunchScale: 1,
    particles: [],
  };

  constructor(
    callbacks: LaneRacerEngineCallbacks,
    totalQuestions: number,
    difficulty: Difficulty = 'beginner',
  ) {
    this.callbacks = callbacks;
    this.totalQuestions = totalQuestions;
    this.difficulty = difficulty;
  }

  setStructureChangeListener(listener: (() => void) | null) {
    this.onStructureChange = listener;
  }

  start() {
    // Game loop driven by R3F useFrame
  }

  destroy() {
    this.onStructureChange = null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  moveLeft() {
    if (this.carLane > 0) {
      this.beginLaneTransition();
      this.carLane--;
    }
  }

  moveRight() {
    if (this.carLane < 2) {
      this.beginLaneTransition();
      this.carLane++;
    }
  }

  private isLateSlideWindow(): boolean {
    if (this.tokens.length === 0) return false;
    return this.tokens[0].z >= LATE_SLIDE_Z;
  }

  private beginLaneTransition() {
    this.laneTransitionFrom = this.carLaneVisual;
    this.laneTransitionStart = performance.now();
    if (this.isLateSlideWindow()) {
      this.activeTransitionMs = LANE_LATE_MS;
      this.activeLeanYaw = LANE_LATE_YAW;
      this.activeLeanRoll = LANE_LATE_ROLL;
      this.activeEasePower = LANE_LATE_EASE_POWER;
    } else {
      this.activeTransitionMs = LANE_EARLY_MS;
      this.activeLeanYaw = LANE_EARLY_YAW;
      this.activeLeanRoll = LANE_EARLY_ROLL;
      this.activeEasePower = LANE_EARLY_EASE_POWER;
    }
  }

  spawnTokens(correct: number, wrong: number[]) {
    const values = [correct, ...wrong];
    const lanes = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    this.tokens = values.map((value, i) => ({
      id: nextTokenId++,
      lane: lanes[i],
      value,
      z: TOKEN_SPAWN_Z,
      isCorrect: value === correct,
    }));
    this.waitingForTokens = false;
    this.syncRenderState();
    this.onStructureChange?.();
  }

  needsTokens(): boolean {
    return this.waitingForTokens;
  }

  isFinished(): boolean {
    return this.questionsAnswered >= this.totalQuestions;
  }

  setSafeBottomInset(_px: number) {
    // Reserved for future HUD placement in 3D view
  }

  tick(deltaSeconds: number) {
    if (this.paused) {
      this.scrollDelta = 0;
      this.renderState.scrollDelta = 0;
      return;
    }
    const dt = Math.min((deltaSeconds * 1000) / 16.667, 3);
    this.step(dt, performance.now());
  }

  private step(dt: number, timestamp: number) {
    const scrollAmount = this.speed * dt * SCROLL_STEP;
    this.scrollDelta = scrollAmount;
    this.worldScrollZ += scrollAmount;

    const transitionProgress = Math.min(
      (timestamp - this.laneTransitionStart) / this.activeTransitionMs,
      1,
    );
    const eased = 1 - Math.pow(1 - transitionProgress, this.activeEasePower);
    this.carLaneVisual =
      this.laneTransitionFrom + (this.carLane - this.laneTransitionFrom) * eased;

    if (transitionProgress >= 1) {
      this.carYaw = 0;
      this.carRoll = 0;
    } else {
      const dir = Math.sign(this.carLane - this.laneTransitionFrom) || 0;
      const envelope = Math.sin(Math.PI * transitionProgress);
      this.carYaw = dir * this.activeLeanYaw * envelope;
      this.carRoll = -dir * this.activeLeanRoll * envelope;
    }

    if (this.flashFrames > 0) this.flashFrames -= dt;
    if (this.shakeFrames > 0) this.shakeFrames -= dt;
    if (this.carPunchFrames > 0) this.carPunchFrames -= dt;
    if (this.popupFrames > 0) this.popupFrames -= dt;

    for (const p of this.particles) {
      p.y += 0.04 * dt;
      p.life -= dt;
    }
    if (this.particles.length > 0) {
      this.particles = this.particles.filter(p => p.life > 0);
    }

    for (const token of this.tokens) {
      token.z += scrollAmount;
    }

    for (const token of this.tokens) {
      if (
        Math.abs(token.z - COLLISION_Z) < COLLISION_BAND &&
        token.lane === this.carLane
      ) {
        this.resolveAnswer(token);
        return;
      }
    }

    if (this.tokens.length > 0 && this.tokens.every(t => t.z > 8)) {
      this.resolveMiss();
    }

    if (this.burstPending) {
      this.spawnBurst();
      this.burstPending = false;
    }

    this.syncRenderState();
  }

  private syncRenderState() {
    const rs = this.renderState;
    rs.carLane = this.carLane;
    rs.carLaneVisual = this.carLaneVisual;
    rs.carX = laneXVisual(this.carLaneVisual);
    rs.carYaw = this.carYaw;
    rs.carRoll = this.carRoll;
    rs.worldScrollZ = this.worldScrollZ;
    rs.scrollDelta = this.scrollDelta;
    rs.tokens = this.tokens;
    rs.flashColor = this.flashFrames > 0 ? this.flashColor : null;
    rs.flashAlpha = this.flashFrames > 0 ? this.flashFrames / FLASH_FRAMES : 0;
    rs.speedKmh = speedToKmh(this.speed);
    rs.popupLabel = this.popupLabel;
    rs.popupAlpha = this.popupFrames > 0 ? this.popupFrames / POPUP_FRAMES : 0;
    rs.shakeMagnitude = this.shakeFrames > 0 ? (this.flashColor === 'red' ? 0.08 : 0.04) : 0;
    rs.carPunchScale = this.carPunchFrames > 0 ? 1 + (this.carPunchFrames / CAR_PUNCH_FRAMES) * 0.12 : 1;
    rs.particles = this.particles;
  }

  private triggerCorrectFeedback() {
    this.flashFrames = FLASH_FRAMES;
    this.flashColor = 'green';
    this.carPunchFrames = CAR_PUNCH_FRAMES;
    this.burstPending = true;
  }

  private triggerWrongFeedback() {
    this.flashFrames = FLASH_FRAMES;
    this.flashColor = 'red';
    this.shakeFrames = SHAKE_FRAMES_WRONG;
    this.popupFrames = 0;
  }

  private showMessage(label: string) {
    this.popupFrames = POPUP_FRAMES;
    this.popupLabel = label;
  }

  private resolveAnswer(token: AnswerToken3D) {
    this.questionsAnswered++;

    if (token.isCorrect) {
      this.combo++;
      this.wrongStreak = 0;
      const prevSpeed = this.speed;
      this.speed = speedAfterCorrect(this.speed, this.combo, this.difficulty);
      this.triggerCorrectFeedback();
      if (this.speed >= MAX_SPEED && prevSpeed < MAX_SPEED) {
        this.showMessage('MAX SPEED');
      }
      this.callbacks.onCorrect();
    } else {
      this.combo = 0;
      this.wrongStreak++;
      this.speed = speedAfterWrong(this.speed, this.wrongStreak);
      this.triggerWrongFeedback();
      this.callbacks.onWrong();
    }

    this.tokens = [];

    if (this.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
    }
    this.syncRenderState();
    this.onStructureChange?.();
  }

  private resolveMiss() {
    this.questionsAnswered++;
    this.combo = 0;
    this.wrongStreak++;
    this.speed = speedAfterWrong(this.speed, this.wrongStreak);
    this.triggerWrongFeedback();
    this.callbacks.onMiss();

    this.tokens = [];

    if (this.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
    }
    this.syncRenderState();
    this.onStructureChange?.();
  }

  private spawnBurst() {
    const x = laneXForIndex(this.carLane);
    const colors = ['#7CFFB0', '#19ff7a', '#ffffff'];
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x: x + Math.cos(ang) * 0.3,
        y: 0.8 + Math.random() * 0.4,
        z: 1 + Math.sin(ang) * 0.3,
        life: 18 + Math.random() * 10,
        maxLife: 28,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
}

export type LaneRacerEngineRef = {
  moveLeft(): void;
  moveRight(): void;
  spawnTokens(correct: number, wrong: number[]): void;
  needsTokens(): boolean;
  isFinished(): boolean;
  pause(): void;
  resume(): void;
  destroy(): void;
  setSafeBottomInset(px: number): void;
};
