import { TEAM_SVGS, type TeamId } from './carSvgs';

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

interface KerbSegment {
  yStart: number; // virtual Y position (in total scroll space)
  length: number; // length in px
  side: 'left' | 'right' | 'both';
}

interface EngineState {
  carLane: number; // 0, 1, 2
  carLaneVisual: number; // smooth interpolation
  speed: number;
  roadOffset: number;
  totalScroll: number;
  tokens: AnswerToken[];
  questionsAnswered: number;
  flashFrames: number; // correct answer flash
  paused: boolean;
}

const CAR_WIDTH = 40;
const CAR_HEIGHT = 80;

function createCarImage(svgString: string): HTMLImageElement {
  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  img.src = URL.createObjectURL(blob);
  return img;
}

const carImages: Record<string, HTMLImageElement> = {};
for (const [teamId, svg] of Object.entries(TEAM_SVGS)) {
  carImages[teamId] = createCarImage(svg);
}
const TOKEN_WIDTH = 70;
const TOKEN_HEIGHT = 50;
const LANE_TRANSITION_MS = 150;
const BASE_SPEED = 3;
const MAX_SPEED = 12;
const SPEED_INCREMENT = 0.25;
const WRONG_SPEED_DROP = 0.5;
const CAR_HITBOX_HALF = 20;

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
  private kerbs: KerbSegment[] = [];
  private nextKerbY: number = 0;
  private carImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement, callbacks: LaneRacerCallbacks, totalQuestions: number, teamId: TeamId = 'mercedes') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.totalQuestions = totalQuestions;
    this.carImage = carImages[teamId] || carImages['mercedes'];
    this.state = {
      carLane: 1,
      carLaneVisual: 1,
      speed: BASE_SPEED,
      roadOffset: 0,
      totalScroll: 0,
      tokens: [],
      questionsAnswered: 0,
      flashFrames: 0,
      paused: false,
    };
    this.generateInitialKerbs();
  }

  private generateInitialKerbs() {
    this.nextKerbY = -200;
    for (let i = 0; i < 8; i++) {
      this.spawnNextKerb();
    }
  }

  private spawnNextKerb() {
    const gap = 300 + Math.random() * 400;
    const length = 80 + Math.random() * 100;
    const r = Math.random();
    const side: 'left' | 'right' | 'both' = r < 0.4 ? 'left' : r < 0.8 ? 'right' : 'both';
    this.kerbs.push({ yStart: this.nextKerbY, length, side });
    this.nextKerbY += length + gap;
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

    // Update road scroll
    const scrollAmount = s.speed * dt;
    s.roadOffset = (s.roadOffset + scrollAmount) % 40;
    s.totalScroll += scrollAmount;

    // Remove kerbs that scrolled off bottom, spawn new ones ahead
    this.kerbs = this.kerbs.filter(k => k.yStart + k.length > s.totalScroll - h);
    while (this.nextKerbY < s.totalScroll + h * 2) {
      this.spawnNextKerb();
    }

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
      s.speed = Math.min(s.speed + SPEED_INCREMENT, MAX_SPEED);
      this.callbacks.onCorrect();
    } else {
      s.speed = Math.max(s.speed * WRONG_SPEED_DROP, BASE_SPEED);
      this.callbacks.onWrong();
    }

    s.tokens = [];

    if (s.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
    }
  }

  private resolveMiss() {
    const s = this.state;
    s.questionsAnswered++;
    s.speed = Math.max(s.speed * WRONG_SPEED_DROP, BASE_SPEED);
    this.callbacks.onMiss();

    s.tokens = [];

    if (s.questionsAnswered >= this.totalQuestions) {
      this.callbacks.onFinished();
    } else {
      this.waitingForTokens = true;
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

    // Kerbs (random corner segments)
    const kerbWidth = 8;
    const kerbBlock = 14;
    for (const kerb of this.kerbs) {
      // Convert virtual Y to screen Y
      const screenYStart = h - (kerb.yStart - s.totalScroll + h);
      const screenYEnd = screenYStart + kerb.length;
      if (screenYEnd < 0 || screenYStart > h) continue;

      for (let by = Math.max(0, screenYStart); by < Math.min(h, screenYEnd); by += kerbBlock) {
        const blockIdx = Math.floor((by - screenYStart) / kerbBlock);
        ctx.fillStyle = blockIdx % 2 === 0 ? '#e10600' : '#ffffff';
        const blockH = Math.min(kerbBlock, screenYEnd - by);
        if (kerb.side === 'left' || kerb.side === 'both') {
          ctx.fillRect(roadLeft - kerbWidth, by, kerbWidth, blockH);
        }
        if (kerb.side === 'right' || kerb.side === 'both') {
          ctx.fillRect(roadRight, by, kerbWidth, blockH);
        }
      }
    }

    // Road edges (thin black line over kerbs)
    ctx.fillStyle = 'black';
    ctx.fillRect(roadLeft - 1, 0, 2, h);
    ctx.fillRect(roadRight - 1, 0, 2, h);

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
    if (this.carImage.complete && this.carImage.naturalWidth > 0) {
      ctx.drawImage(this.carImage, x, y, CAR_WIDTH, CAR_HEIGHT);
    }
  }
}
