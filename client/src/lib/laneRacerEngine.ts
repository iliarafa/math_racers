export interface LaneRacerCallbacks {
  onCorrect: () => void;
  onWrong: () => void;
  onMiss: () => void;
  onFinished: () => void;
}

interface AnswerToken {
  lane: number; // 0, 1, 2
  value: number;
  y: number;
  isCorrect: boolean;
}

interface EngineState {
  carLane: number; // 0, 1, 2
  carLaneVisual: number; // smooth interpolation
  speed: number;
  baseSpeed: number;
  roadOffset: number;
  tokens: AnswerToken[];
  questionsAnswered: number;
  isPenalty: boolean;
  penaltyFrames: number;
  recoveryFrames: number;
  prepenaltySpeed: number;
  flashFrames: number; // correct answer flash
  paused: boolean;
}

const CAR_WIDTH = 30;
const CAR_HEIGHT = 50;
const TOKEN_WIDTH = 70;
const TOKEN_HEIGHT = 50;
const LANE_TRANSITION_MS = 150;
const BASE_SPEED = 3;
const MAX_SPEED = 4;
const SPEED_RAMP_PER_5 = 0.1;
const PENALTY_FRAMES = 60;
const RECOVERY_FRAMES = 30;
const PENALTY_FACTOR = 0.4;
const CAR_HITBOX_HALF = 20;
const SPAWN_THRESHOLD = 0.3; // spawn next set when previous passes 30% of canvas

export class LaneRacerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: LaneRacerCallbacks;
  private state: EngineState;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private laneTransitionStart: number = 0;
  private laneTransitionFrom: number = 0;
  private totalQuestions: number;
  private waitingForTokens: boolean = true;

  constructor(canvas: HTMLCanvasElement, callbacks: LaneRacerCallbacks, totalQuestions: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.totalQuestions = totalQuestions;
    this.state = {
      carLane: 1,
      carLaneVisual: 1,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      roadOffset: 0,
      tokens: [],
      questionsAnswered: 0,
      isPenalty: false,
      penaltyFrames: 0,
      recoveryFrames: 0,
      prepenaltySpeed: BASE_SPEED,
      flashFrames: 0,
      paused: false,
    };
  }

  start() {
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause() {
    this.state.paused = true;
  }

  resume() {
    if (this.state.paused) {
      this.state.paused = false;
      this.lastTimestamp = performance.now();
      this.loop(this.lastTimestamp);
    }
  }

  moveLeft() {
    if (this.state.carLane > 0) {
      this.laneTransitionFrom = this.state.carLaneVisual;
      this.laneTransitionStart = performance.now();
      this.state.carLane--;
    }
  }

  moveRight() {
    if (this.state.carLane < 2) {
      this.laneTransitionFrom = this.state.carLaneVisual;
      this.laneTransitionStart = performance.now();
      this.state.carLane++;
    }
  }

  spawnTokens(correct: number, wrong: number[]) {
    const values = [correct, ...wrong];
    // Shuffle and assign to lanes
    const lanes = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    this.state.tokens = values.map((value, i) => ({
      lane: lanes[i],
      value,
      y: -TOKEN_HEIGHT - 20, // start above canvas
      isCorrect: value === correct,
    }));
    this.waitingForTokens = false;
  }

  needsTokens(): boolean {
    return this.waitingForTokens;
  }

  isFinished(): boolean {
    return this.state.questionsAnswered >= this.totalQuestions;
  }

  private loop = (timestamp: number) => {
    if (this.state.paused) return;

    const dt = Math.min((timestamp - this.lastTimestamp) / 16.667, 3); // normalize to ~60fps, cap at 3x
    this.lastTimestamp = timestamp;

    this.update(dt, timestamp);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, timestamp: number) {
    const s = this.state;
    const h = this.canvas.height;

    // Update speed penalty/recovery
    if (s.isPenalty) {
      s.penaltyFrames -= dt;
      if (s.penaltyFrames <= 0) {
        s.isPenalty = false;
        s.recoveryFrames = RECOVERY_FRAMES;
      }
    } else if (s.recoveryFrames > 0) {
      s.recoveryFrames -= dt;
      const t = 1 - s.recoveryFrames / RECOVERY_FRAMES;
      s.speed = s.prepenaltySpeed * PENALTY_FACTOR + (s.baseSpeed - s.prepenaltySpeed * PENALTY_FACTOR) * t;
      if (s.recoveryFrames <= 0) {
        s.speed = s.baseSpeed;
      }
    }

    // Update road scroll
    s.roadOffset = (s.roadOffset + s.speed * dt) % 40;

    // Lane transition interpolation
    const transitionProgress = Math.min((timestamp - this.laneTransitionStart) / LANE_TRANSITION_MS, 1);
    const eased = 1 - Math.pow(1 - transitionProgress, 3); // ease-out cubic
    s.carLaneVisual = this.laneTransitionFrom + (s.carLane - this.laneTransitionFrom) * eased;

    // Flash timer
    if (s.flashFrames > 0) s.flashFrames -= dt;

    // Move tokens down
    for (const token of s.tokens) {
      token.y += s.speed * dt;
    }

    // Check collisions
    const carY = h * 0.85;
    for (const token of s.tokens) {
      const tokenCenterY = token.y + TOKEN_HEIGHT / 2;
      if (
        Math.abs(tokenCenterY - carY) < CAR_HITBOX_HALF &&
        token.lane === s.carLane
      ) {
        this.resolveAnswer(token);
        return;
      }
    }

    // Check if all tokens passed below canvas (miss)
    if (s.tokens.length > 0 && s.tokens.every(t => t.y > h)) {
      this.resolveMiss();
    }
  }

  private resolveAnswer(token: AnswerToken) {
    const s = this.state;
    s.questionsAnswered++;

    if (token.isCorrect) {
      s.flashFrames = 15;
      this.callbacks.onCorrect();
    } else {
      this.applyPenalty();
      this.callbacks.onWrong();
    }

    s.tokens = [];
    this.updateBaseSpeed();

    if (s.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
    }
  }

  private resolveMiss() {
    const s = this.state;
    s.questionsAnswered++;
    this.applyPenalty();
    this.callbacks.onMiss();

    s.tokens = [];
    this.updateBaseSpeed();

    if (s.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
    }
  }

  private applyPenalty() {
    const s = this.state;
    s.isPenalty = true;
    s.prepenaltySpeed = s.baseSpeed;
    s.speed = s.baseSpeed * PENALTY_FACTOR;
    s.penaltyFrames = PENALTY_FRAMES;
  }

  private updateBaseSpeed() {
    const ramps = Math.floor(this.state.questionsAnswered / 5);
    this.state.baseSpeed = Math.min(BASE_SPEED + ramps * SPEED_RAMP_PER_5, MAX_SPEED);
    if (!this.state.isPenalty) {
      this.state.speed = this.state.baseSpeed;
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this.state;

    // Clear
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    // Road dimensions
    const roadWidth = w * 0.6;
    const roadLeft = (w - roadWidth) / 2;
    const roadRight = roadLeft + roadWidth;
    const laneWidth = roadWidth / 3;

    // Road edges
    ctx.fillStyle = 'black';
    ctx.fillRect(roadLeft - 2, 0, 3, h);
    ctx.fillRect(roadRight - 1, 0, 3, h);

    // Lane dividers (dashed)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 16]);
    const divider1 = roadLeft + laneWidth;
    const divider2 = roadLeft + laneWidth * 2;
    ctx.beginPath();
    ctx.moveTo(divider1, 0);
    ctx.lineTo(divider1, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(divider2, 0);
    ctx.lineTo(divider2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    const center = w / 2;

    // Scrolling road marks (horizontal dashes across road for speed feel)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let y = s.roadOffset - 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(roadLeft + 4, y);
      ctx.lineTo(roadRight - 4, y);
      ctx.stroke();
    }

    // Answer tokens
    for (const token of s.tokens) {
      const tokenX = roadLeft + token.lane * laneWidth + (laneWidth - TOKEN_WIDTH) / 2;
      const tokenY = token.y;

      // Token box
      ctx.fillStyle = 'white';
      ctx.fillRect(tokenX, tokenY, TOKEN_WIDTH, TOKEN_HEIGHT);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeRect(tokenX, tokenY, TOKEN_WIDTH, TOKEN_HEIGHT);

      // Token text
      ctx.fillStyle = 'black';
      ctx.font = 'bold 28px Oxanium, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(token.value), tokenX + TOKEN_WIDTH / 2, tokenY + TOKEN_HEIGHT / 2);
    }

    // Car
    const carX = roadLeft + s.carLaneVisual * laneWidth + (laneWidth - CAR_WIDTH) / 2;
    const carY = h * 0.85 - CAR_HEIGHT / 2;
    this.drawCar(carX, carY);

    // Correct flash
    if (s.flashFrames > 0) {
      const alpha = s.flashFrames / 15;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.08})`;
      ctx.fillRect(0, 0, w, h);

      // Checkmark
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'black';
      ctx.font = 'bold 48px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', w / 2, h * 0.5);
      ctx.restore();
    }
  }

  private drawCar(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    // Rotate 180° around car center so front wing faces up
    ctx.translate(x + CAR_WIDTH / 2, y + CAR_HEIGHT / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-(x + CAR_WIDTH / 2), -(y + CAR_HEIGHT / 2));

    ctx.fillStyle = 'black';

    // Rear wing
    ctx.fillRect(x + 2, y, CAR_WIDTH - 4, 5);
    // Wing pillars
    ctx.fillRect(x + 12, y + 5, 6, 3);
    // Body
    ctx.fillRect(x + 6, y + 8, CAR_WIDTH - 12, 22);
    // Left tire
    ctx.fillRect(x, y + 10, 6, 16);
    // Right tire
    ctx.fillRect(x + CAR_WIDTH - 6, y + 10, 6, 16);
    // Cockpit
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 10, y + 12, 10, 8);
    ctx.fillStyle = 'black';
    // Nose
    ctx.fillRect(x + 8, y + 30, CAR_WIDTH - 16, 10);
    // Front wing
    ctx.fillRect(x + 2, y + 40, CAR_WIDTH - 4, 4);
    // Front wing endplates
    ctx.fillRect(x, y + 38, 5, 8);
    ctx.fillRect(x + CAR_WIDTH - 5, y + 38, 5, 8);

    ctx.restore();
  }
}
