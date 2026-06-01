import { TEAM_SVGS, type TeamId } from './carSvgs';
import type { Difficulty } from './gameLogic';
import {
  BASE_SPEED,
  MAX_SPEED,
  speedAfterCorrect,
  speedAfterWrong,
  speedToKmh,
} from './laneRacerHud';

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
  flashFrames: number;
  flashColor: 'green' | 'red';
  combo: number;
  wrongStreak: number;
  shakeFrames: number;
  carPunchFrames: number;
  popupFrames: number;
  popupLabel: string;
  particles: Particle[];
  burstPending: boolean;
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
const CAR_HITBOX_HALF = 20;

// Feedback timers, measured in normalized ~60fps frames (dt-decremented).
const FLASH_FRAMES = 12;
const SHAKE_FRAMES_WRONG = 14;
const CAR_PUNCH_FRAMES = 10;
const POPUP_FRAMES = 40;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

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
  private asphaltPattern: CanvasPattern | null = null;
  private difficulty: Difficulty;

  constructor(canvas: HTMLCanvasElement, callbacks: LaneRacerCallbacks, totalQuestions: number, teamId: TeamId = 'mercedes', difficulty: Difficulty = 'beginner') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.totalQuestions = totalQuestions;
    this.carImage = carImages[teamId] || carImages['mercedes'];
    this.difficulty = difficulty;
    this.state = {
      carLane: 1,
      carLaneVisual: 1,
      speed: BASE_SPEED,
      roadOffset: 0,
      totalScroll: 0,
      tokens: [],
      questionsAnswered: 0,
      flashFrames: 0,
      flashColor: 'green',
      combo: 0,
      wrongStreak: 0,
      shakeFrames: 0,
      carPunchFrames: 0,
      popupFrames: 0,
      popupLabel: '',
      particles: [],
      burstPending: false,
      paused: false,
    };
    this.generateInitialKerbs();
    this.createAsphaltPattern();
  }

  private createAsphaltPattern() {
    const size = 64;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext('2d')!;
    // Base asphalt color
    octx.fillStyle = '#3a3a3a';
    octx.fillRect(0, 0, size, size);
    // Random grain dots
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = 45 + Math.floor(Math.random() * 30);
      octx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      octx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
    this.asphaltPattern = this.ctx.createPattern(offscreen, 'repeat');
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
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Scale speed to canvas size (reference: iPhone ~667px height)
    const scale = h / 667;

    // Update road scroll
    const scrollAmount = s.speed * dt * scale;
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

    // Feedback timers
    if (s.flashFrames > 0) s.flashFrames -= dt;
    if (s.shakeFrames > 0) s.shakeFrames -= dt;
    if (s.carPunchFrames > 0) s.carPunchFrames -= dt;
    if (s.popupFrames > 0) s.popupFrames -= dt;

    // Particles (gravity + fade)
    for (const p of s.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt;
      p.life -= dt;
    }
    if (s.particles.length > 0) {
      s.particles = s.particles.filter(p => p.life > 0);
    }

    // Move tokens down
    for (const token of s.tokens) {
      token.y += s.speed * dt * scale;
    }

    // Check collisions (proportional sizes)
    const collRoadWidth = w * 0.6;
    const collLaneWidth = collRoadWidth / 3;
    const collTokenH = Math.round(collLaneWidth * 0.7 * 0.71);
    const collHitboxHalf = Math.round(collLaneWidth * 0.2);
    const carY = h * 0.82;
    for (const token of s.tokens) {
      const tokenCenterY = token.y + collTokenH / 2;
      if (
        Math.abs(tokenCenterY - carY) < collHitboxHalf &&
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

  private triggerCorrectFeedback() {
    const s = this.state;
    s.flashFrames = FLASH_FRAMES;
    s.flashColor = 'green';
    s.carPunchFrames = CAR_PUNCH_FRAMES;
    s.burstPending = true;
  }

  private showMessage(label: string) {
    this.state.popupFrames = POPUP_FRAMES;
    this.state.popupLabel = label;
  }

  private triggerWrongFeedback() {
    const s = this.state;
    s.flashFrames = FLASH_FRAMES;
    s.flashColor = 'red';
    s.shakeFrames = SHAKE_FRAMES_WRONG;
    s.popupFrames = 0;
  }

  private resolveAnswer(token: AnswerToken) {
    const s = this.state;
    s.questionsAnswered++;

    if (token.isCorrect) {
      s.combo++;
      s.wrongStreak = 0;
      const prevSpeed = s.speed;
      s.speed = speedAfterCorrect(s.speed, s.combo, this.difficulty);
      this.triggerCorrectFeedback();
      // Single in-race message: announce the moment max speed is reached
      if (s.speed >= MAX_SPEED && prevSpeed < MAX_SPEED) {
        this.showMessage('MAX SPEED');
      }
      this.callbacks.onCorrect();
    } else {
      s.combo = 0;
      s.wrongStreak++;
      s.speed = speedAfterWrong(s.speed, s.wrongStreak);
      this.triggerWrongFeedback();
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
    s.combo = 0;
    s.wrongStreak++;
    s.speed = speedAfterWrong(s.speed, s.wrongStreak);
    this.triggerWrongFeedback();
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

    // Road dimensions
    const roadWidth = w * 0.6;
    const roadLeft = (w - roadWidth) / 2;
    const roadRight = roadLeft + roadWidth;
    const laneWidth = roadWidth / 3;

    // Proportional sizes (matched to iPhone ratios)
    const tokenW = Math.round(laneWidth * 0.7);
    const tokenH = Math.round(tokenW * 0.71);
    const carW = Math.round(laneWidth * 0.4);
    const carH = carW * 2;
    const fontSize = Math.round(tokenW * 0.4);

    // Screen shake (wraps the whole scene)
    ctx.save();
    if (s.shakeFrames > 0) {
      const mag = s.flashColor === 'red' ? 6 : 3;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // Green runoff / grass background
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, w, h);

    // Scrolling grass texture stripes — locked to the road speed (stripe
    // period 20 divides the roadOffset wrap of 40, so the loop is seamless).
    ctx.fillStyle = '#265222';
    for (let y = (s.roadOffset % 20) - 20; y < h; y += 20) {
      ctx.fillRect(0, y, roadLeft - 10, 6);
      ctx.fillRect(roadRight + 10, y, w - roadRight - 10, 6);
    }

    // Asphalt road surface with scrolling texture
    ctx.save();
    if (this.asphaltPattern) {
      ctx.translate(0, s.roadOffset);
      ctx.fillStyle = this.asphaltPattern;
      ctx.fillRect(roadLeft, -s.roadOffset, roadWidth, h + 64);
      ctx.translate(0, -s.roadOffset);
    } else {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(roadLeft, 0, roadWidth, h);
    }
    ctx.restore();

    // Kerbs (random corner segments)
    const kerbWidth = 8;
    const kerbBlock = 14;
    for (const kerb of this.kerbs) {
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

    // Road edges (white lines)
    ctx.fillStyle = 'white';
    ctx.fillRect(roadLeft - 1, 0, 2, h);
    ctx.fillRect(roadRight - 1, 0, 2, h);

    // Lane dividers (white dashed) — scroll with the road via lineDashOffset.
    // Dash period (8+12=20) divides the roadOffset wrap (40) so the motion is
    // seamless across the wrap.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -s.roadOffset;
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
    ctx.lineDashOffset = 0;

    // Answer tokens
    for (const token of s.tokens) {
      const tokenX = roadLeft + token.lane * laneWidth + (laneWidth - tokenW) / 2;
      const tokenY = token.y;

      // Token box
      ctx.fillStyle = 'white';
      ctx.fillRect(tokenX, tokenY, tokenW, tokenH);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeRect(tokenX, tokenY, tokenW, tokenH);

      // Token text
      ctx.fillStyle = 'black';
      ctx.font = `bold ${fontSize}px Oxanium, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(token.value), tokenX + tokenW / 2, tokenY + tokenH / 2);
    }

    // Car (with punch-zoom on a correct catch)
    const carX = roadLeft + s.carLaneVisual * laneWidth + (laneWidth - carW) / 2;
    const carY2 = h * 0.82 - carH / 2;
    const punch = s.carPunchFrames > 0 ? 1 + (s.carPunchFrames / CAR_PUNCH_FRAMES) * 0.14 : 1;
    if (punch !== 1) {
      const pcx = carX + carW / 2;
      const pcy = carY2 + carH / 2;
      ctx.save();
      ctx.translate(pcx, pcy);
      ctx.scale(punch, punch);
      ctx.translate(-pcx, -pcy);
      this.drawCar(carX, carY2, carW, carH);
      ctx.restore();
    } else {
      this.drawCar(carX, carY2, carW, carH);
    }

    // Catch burst particles
    if (s.burstPending) {
      this.spawnBurst(carX + carW / 2, carY2 + carH / 2);
      s.burstPending = false;
    }
    this.drawParticles();

    // Flash + popups (over the scene), then close shake, then HUD speedometer
    this.drawFlash(w, h);
    this.drawPopups(w, h);
    ctx.restore(); // close screen-shake transform
    this.drawSpeedometer(w, h);
  }

  private spawnBurst(x: number, y: number) {
    const colors = ['#7CFFB0', '#19ff7a', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      const spd = 2 + Math.random() * 3;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        life: 18 + Math.random() * 10,
        maxLife: 28,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  private drawFlash(w: number, h: number) {
    const s = this.state;
    if (s.flashFrames <= 0) return;
    const alpha = s.flashFrames / FLASH_FRAMES;
    const ctx = this.ctx;
    if (s.flashColor === 'green') {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.8, 0, w * 0.5, h * 0.8, h * 0.6);
      grad.addColorStop(0, `rgba(34,255,120,${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(34,255,120,0)');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = `rgba(225,6,0,${alpha * 0.35})`;
    }
    ctx.fillRect(0, 0, w, h);
  }

  private drawPopups(w: number, h: number) {
    const s = this.state;
    if (s.popupFrames <= 0) return;
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = s.popupFrames / POPUP_FRAMES;
    const rise = (1 - t) * 20;
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(w * 0.09)}px Oxanium, sans-serif`;
    ctx.fillText(s.popupLabel, w / 2, h * 0.34 - rise);
    ctx.globalAlpha = 1;
  }

  private drawSpeedometer(w: number, h: number) {
    const ctx = this.ctx;
    const kmh = speedToKmh(this.state.speed);
    const pad = Math.round(w * 0.045);

    // Readout
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.round(w * 0.022)}px Oxanium, sans-serif`;
    ctx.fillText('KM/H', w - pad, h - pad);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(w * 0.05)}px Oxanium, sans-serif`;
    ctx.fillText(`${kmh}`, w - pad, h - pad - Math.round(w * 0.026));
  }

  private drawCar(x: number, y: number, w: number = CAR_WIDTH, h: number = CAR_HEIGHT) {
    const ctx = this.ctx;
    if (this.carImage.complete && this.carImage.naturalWidth > 0) {
      ctx.drawImage(this.carImage, x, y, w, h);
    }
  }
}
