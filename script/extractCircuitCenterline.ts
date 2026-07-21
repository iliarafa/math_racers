/**
 * Extract a dense medial centerline from a circuit silhouette PNG.
 *
 * Method: densify the existing path seed → snap each sample onto the
 * distance-transform ridge of the PNG mask (keeps ordering, matches art).
 * Writes into circuitPathData.json without changing w/h.
 *
 * Usage: npx tsx script/extractCircuitCenterline.ts spa
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

type Pt = { x: number; y: number };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'client/src/assets');
const PATH_JSON = path.join(ROOT, 'client/src/lib/circuitPathData.json');

const ASSET_BY_ID: Record<string, string> = {
  spa: 'circuit_spa_black.png',
  monza: 'circuit_monza_black.png',
  monaco: 'circuit_monaco_black.png',
  suzuka: 'circuit_suzuka_black.png',
  silverstone: 'circuit_silverstone_black.png',
  hungary: 'circuit_hungary.png',
};

function loadTrack(file: string): { w: number; h: number; track: Uint8Array } {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width: w, height: h, data } = png;
  const track = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    track[p] = data[i + 3] > 10 && L < 120 ? 1 : 0;
  }
  return { w, h, track };
}

/** Chamfer distance transform (distance to background) in pixels. */
function distanceTransform(track: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e6;
  const dt = new Float32Array(w * h);
  for (let i = 0; i < dt.length; i++) dt[i] = track[i] ? INF : 0;

  // forward
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!track[i]) continue;
      if (x > 0) dt[i] = Math.min(dt[i], dt[i - 1] + 1);
      if (y > 0) dt[i] = Math.min(dt[i], dt[i - w] + 1);
      if (x > 0 && y > 0) dt[i] = Math.min(dt[i], dt[i - w - 1] + 1.414);
      if (x + 1 < w && y > 0) dt[i] = Math.min(dt[i], dt[i - w + 1] + 1.414);
    }
  }
  // backward
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!track[i]) continue;
      if (x + 1 < w) dt[i] = Math.min(dt[i], dt[i + 1] + 1);
      if (y + 1 < h) dt[i] = Math.min(dt[i], dt[i + w] + 1);
      if (x + 1 < w && y + 1 < h) dt[i] = Math.min(dt[i], dt[i + w + 1] + 1.414);
      if (x > 0 && y + 1 < h) dt[i] = Math.min(dt[i], dt[i + w - 1] + 1.414);
    }
  }
  return dt;
}

function parsePolyline(d: string): Pt[] {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  if (pts.length >= 2) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-3) pts.pop();
  }
  return pts;
}

function densify(pts: Pt[], spacing: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / spacing));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/**
 * Snap toward the medial ridge, but only along the local normal of the seed
 * path. A disc search can jump to a parallel arm in a chicane (Bus Stop).
 */
function snapToRidgeAlongNormal(
  p: Pt,
  tangent: Pt,
  dt: Float32Array,
  track: Uint8Array,
  w: number,
  h: number,
  maxOffset: number
): Pt {
  const len = Math.hypot(tangent.x, tangent.y) || 1;
  const nx = -tangent.y / len;
  const ny = tangent.x / len;

  let best = { x: p.x, y: p.y, score: -1 };
  for (let o = -maxOffset; o <= maxOffset; o += 0.5) {
    const x = Math.round(p.x + nx * o);
    const y = Math.round(p.y + ny * o);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const i = y * w + x;
    if (!track[i]) continue;
    const score = dt[i] - 0.02 * Math.abs(o);
    if (score > best.score) best = { x, y, score };
  }
  if (best.score < 0) return p;
  return { x: best.x, y: best.y };
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplifyClosed(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length < 4) return pts;
  const n = pts.length;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let maxD = 0;
    let maxK = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distToSeg(pts[k], pts[i], pts[j]);
      if (d > maxD) {
        maxD = d;
        maxK = k;
      }
    }
    if (maxK >= 0 && maxD > epsilon) {
      keep[maxK] = 1;
      stack.push([i, maxK], [maxK, j]);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
  if (out.length >= 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1.5) out.pop();
  }
  return out;
}

/** Drop consecutive duplicates / micro-stutters. */
function cleanup(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 0.6) continue;
    out.push(p);
  }
  return out;
}

function fmt(n: number): string {
  // 0.01 — 0.1 quantized medial samples into visible stairs under Catmull-Rom.
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

function toPathD(pts: Pt[]): string {
  const parts = [`M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`];
  for (let i = 1; i < pts.length; i++) {
    parts.push(`L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Bootstrap a closed seed polyline when circuitPathData.json has no entry.
 * Walks the outer mask contour (Moore neighborhood), samples evenly, then
 * the normal densify→ridge-snap pass pulls it onto the medial centerline.
 */
function bootstrapSeedFromMask(
  track: Uint8Array,
  w: number,
  h: number,
  sampleEvery = 10
): Pt[] {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && track[y * w + x] === 1;

  // Prefer a start on the left outer edge near mid-height (Hungaroring S/F straight).
  const midY = Math.floor(h / 2);
  let start: Pt | null = null;
  for (let dy = 0; dy < h && !start; dy++) {
    for (const y of [midY + dy, midY - dy]) {
      if (y < 0 || y >= h) continue;
      for (let x = 0; x < w; x++) {
        if (at(x, y) && !at(x - 1, y)) {
          start = { x, y };
          break;
        }
      }
      if (start) break;
    }
  }
  if (!start) {
    throw new Error('bootstrapSeedFromMask: no track boundary pixel found');
  }

  // 8-connected clockwise Moore dirs, indexed so +1 = turn right-ish from incoming.
  const dirs: Pt[] = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
  ];

  const contour: Pt[] = [];
  let cur = { ...start };
  // Enter from the left (background → track); first search starts facing up (N).
  let dirIdx = 6; // N
  const maxSteps = w * h;
  for (let step = 0; step < maxSteps; step++) {
    contour.push({ ...cur });
    // From the direction we arrived, turn left-most (CCW search) to hug the outer wall.
    // Start looking from dirIdx+6 (back-left) so we keep the background on our left → outer walk.
    let found: Pt | null = null;
    let foundDir = dirIdx;
    for (let k = 0; k < 8; k++) {
      const di = (dirIdx + 6 + k) % 8;
      const nx = cur.x + dirs[di].x;
      const ny = cur.y + dirs[di].y;
      if (at(nx, ny)) {
        found = { x: nx, y: ny };
        foundDir = di;
        break;
      }
    }
    if (!found) break;
    cur = found;
    dirIdx = foundDir;
    if (step > 20 && cur.x === start.x && cur.y === start.y) break;
  }

  if (contour.length < 40) {
    throw new Error(
      `bootstrapSeedFromMask: contour too short (${contour.length}) — mask may be fragmented`
    );
  }

  // Evenly sample ~every sampleEvery pixels along the contour.
  const seed: Pt[] = [];
  for (let i = 0; i < contour.length; i += sampleEvery) {
    seed.push(contour[i]);
  }
  // Ensure closed-ish and not duplicating start
  if (seed.length >= 2) {
    const a = seed[0];
    const b = seed[seed.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < sampleEvery) seed.pop();
  }
  console.log(
    `Bootstrapped seed: contour=${contour.length} → seed=${seed.length} (every ${sampleEvery})`
  );
  return seed;
}

type BandPick = 'lower' | 'upper';

/** Medial pixel in the lower (max y) or upper (min y) track band at column x. */
function medialInBand(
  x: number,
  dt: Float32Array,
  track: Uint8Array,
  w: number,
  h: number,
  pick: BandPick
): Pt | null {
  const ys: number[] = [];
  for (let y = 0; y < h; y++) if (track[y * w + x]) ys.push(y);
  if (!ys.length) return null;

  const clusters: number[][] = [];
  let cur: number[] = [];
  for (const y of ys) {
    if (!cur.length || y === cur[cur.length - 1] + 1) cur.push(y);
    else {
      clusters.push(cur);
      cur = [y];
    }
  }
  if (cur.length) clusters.push(cur);

  const scored = clusters.map((c) => {
    let bestY = c[0];
    let best = -1;
    for (const y of c) {
      if (dt[y * w + x] > best) {
        best = dt[y * w + x];
        bestY = y;
      }
    }
    return { mid: bestY, yAvg: (c[0] + c[c.length - 1]) / 2 };
  });
  scored.sort((a, b) => a.yAvg - b.yAvg);
  const chosen = pick === 'lower' ? scored[scored.length - 1] : scored[0];
  return { x, y: chosen.mid };
}

/**
 * Geometric midpoint of the lower/upper track band at column x.
 * Prefer this over DT ridge when the silhouette kisses the image edge —
 * Spa's bottom tip touches y=h-1, so DT falsely peaks on the outer pixel.
 */
function bandGeomMid(
  x: number,
  track: Uint8Array,
  w: number,
  h: number,
  pick: BandPick
): Pt | null {
  const ys: number[] = [];
  for (let y = 0; y < h; y++) if (track[y * w + x]) ys.push(y);
  if (!ys.length) return null;
  const clusters: number[][] = [];
  let cur: number[] = [];
  for (const y of ys) {
    if (!cur.length || y === cur[cur.length - 1] + 1) cur.push(y);
    else {
      clusters.push(cur);
      cur = [y];
    }
  }
  if (cur.length) clusters.push(cur);
  const c = pick === 'lower' ? clusters[clusters.length - 1] : clusters[0];
  return { x, y: (c[0] + c[c.length - 1]) / 2 };
}

/**
 * Spa end: Bus Stop on the lower band, then around La Source hairpin (bottom),
 * then up the exit arm — never chord across the hairpin.
 */
/** Circumcircle of three non-collinear points. */
function circumcircle(
  a: Pt,
  b: Pt,
  c: Pt
): { cx: number; cy: number; r: number } | null {
  const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(D) < 1e-6) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / D;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / D;
  return { cx, cy, r: Math.hypot(a.x - cx, a.y - cy) };
}

/**
 * Evenly sample the circular arc A→C that passes through T (same orientation
 * as the shorter turn A→T→C). Falls back to null if points are near-collinear.
 */
function sampleCircularArc(A: Pt, T: Pt, C: Pt, samples: number): Pt[] | null {
  const circ = circumcircle(A, T, C);
  if (!circ) return null;
  const { cx, cy, r } = circ;
  const ang = (p: Pt) => Math.atan2(p.y - cy, p.x - cx);
  let a0 = ang(A);
  let aT = ang(T);
  let a1 = ang(C);
  // Unwrap so a0 → aT → a1 is monotonic
  const unwrap = (from: number, to: number, via: number): [number, number] => {
    let t = to;
    let v = via;
    while (v < from) v += Math.PI * 2;
    while (v > from + Math.PI * 2) v -= Math.PI * 2;
    while (t < v) t += Math.PI * 2;
    while (t > v + Math.PI * 2) t -= Math.PI * 2;
    // Prefer the short arc that still contains via
    if (Math.abs(t - from) > Math.PI * 2 * 0.75) {
      if (t > from) t -= Math.PI * 2;
      else t += Math.PI * 2;
      v = via;
      while (v < Math.min(from, t)) v += Math.PI * 2;
      while (v > Math.max(from, t)) v -= Math.PI * 2;
    }
    return [t, v];
  };
  [a1, aT] = unwrap(a0, a1, aT);
  // If via is not between a0 and a1, flip the long way
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  if (aT < lo - 1e-6 || aT > hi + 1e-6) {
    if (a1 > a0) a1 -= Math.PI * 2;
    else a1 += Math.PI * 2;
  }

  const out: Pt[] = [];
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const a = a0 + (a1 - a0) * t;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

/** 3-tap moving average (keeps endpoints). Softens pixel stairs without a V. */
function smoothOpen(pts: Pt[], passes: number): Pt[] {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) return cur;
    const next: Pt[] = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      next.push({
        x: (cur[i - 1].x + cur[i].x + cur[i + 1].x) / 3,
        y: (cur[i - 1].y + cur[i].y + cur[i + 1].y) / 3,
      });
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

/**
 * Round a sharp vertical apex (top crest or bottom dip).
 * Both use geometric band midpoints (DT ridge lies about image-edge tips) plus
 * a short circular arc through the tip for a round, centered crest/dip.
 * Bottom travel is right→left; top (Raidillon) is left→right.
 */
function roundSharpApex(
  pts: Pt[],
  _dt: Float32Array,
  track: Uint8Array,
  w: number,
  h: number,
  side: 'top' | 'bottom',
  x0: number,
  x1: number
): Pt[] {
  const isMoreExtreme = (y: number, ref: number) =>
    side === 'top' ? y < ref : y > ref;

  let tip = -1;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].x <= x0 || pts[i].x >= x1) continue;
    if (tip < 0 || isMoreExtreme(pts[i].y, pts[tip].y)) tip = i;
  }
  if (tip < 0) return pts;
  if (side === 'top' && pts[tip].y > 8) return pts;
  if (side === 'bottom' && pts[tip].y < h - 9) return pts;

  const rise = 14;
  let i0 = tip;
  let i1 = tip;
  if (side === 'bottom') {
    while (i0 > 2 && pts[tip].y - pts[i0].y < rise) i0--;
    while (i1 < pts.length - 3 && pts[tip].y - pts[i1].y < rise) i1++;
  } else {
    while (i0 > 2 && pts[i0].y - pts[tip].y < rise) i0--;
    while (i1 < pts.length - 3 && pts[i1].y - pts[tip].y < rise) i1++;
  }
  if (i1 - i0 < 6) return pts;

  const tipY = pts[tip].y;
  const xLo = Math.min(pts[i0].x, pts[i1].x);
  const xHi = Math.max(pts[i0].x, pts[i1].x);
  const pick: BandPick = side === 'top' ? 'upper' : 'lower';

  /** Geom mid of the tip band; skip fat/merged columns. */
  const apexMid = (x: number): Pt | null => {
    const ys: number[] = [];
    for (let y = 0; y < h; y++) if (track[y * w + x]) ys.push(y);
    if (!ys.length) return null;
    const clusters: number[][] = [];
    let cur: number[] = [];
    for (const y of ys) {
      if (!cur.length || y === cur[cur.length - 1] + 1) cur.push(y);
      else {
        clusters.push(cur);
        cur = [y];
      }
    }
    if (cur.length) clusters.push(cur);
    const c = pick === 'lower' ? clusters[clusters.length - 1] : clusters[0];
    const y0 = c[0];
    const y1 = c[c.length - 1];
    if (y1 - y0 > 12) return null;
    if (side === 'bottom' && y1 < tipY - 18) return null;
    if (side === 'top' && y0 > tipY + 18) return null;
    return { x, y: (y0 + y1) / 2 };
  };

  // Sample columns in path travel order
  const travelRightToLeft = pts[i1].x < pts[i0].x;
  const raw: Pt[] = [];
  if (travelRightToLeft) {
    for (let x = Math.round(xHi); x >= Math.round(xLo); x--) {
      const p = apexMid(x);
      if (!p) continue;
      const prev = raw[raw.length - 1];
      if (prev && Math.abs(p.y - prev.y) > 4) continue;
      raw.push(p);
    }
  } else {
    for (let x = Math.round(xLo); x <= Math.round(xHi); x++) {
      const p = apexMid(x);
      if (!p) continue;
      const prev = raw[raw.length - 1];
      if (prev && Math.abs(p.y - prev.y) > 4) continue;
      raw.push(p);
    }
  }
  if (raw.length < 8) return pts;

  let tipGeom = raw[0];
  for (const p of raw) {
    if (isMoreExtreme(p.y, tipGeom.y)) tipGeom = p;
  }
  const tipX = tipGeom.x;
  const T = tipGeom;
  let arc: Pt[];

  if (side === 'top') {
    // Top crest: stay on geom mids. Circles round the tip but drift off the
    // ribbon on the shoulders; heavy smooth removes stair wobble without that.
    arc = smoothOpen(raw, 7);
    // Soft tip pin: blend T with the smoothed point so we keep centering
    // without a V-notch (full replace was too sharp).
    let tipI = 0;
    for (let i = 1; i < arc.length; i++) {
      if (Math.abs(arc[i].x - tipX) < Math.abs(arc[tipI].x - tipX)) tipI = i;
    }
    const s = arc[tipI];
    arc[tipI] = { x: T.x, y: s.y * 0.35 + T.y * 0.65 };
    if (tipI > 1 && tipI < arc.length - 2) {
      for (let pass = 0; pass < 2; pass++) {
        for (const k of [tipI - 1, tipI + 1]) {
          arc[k] = {
            x: (arc[k - 1].x + arc[k].x + arc[k + 1].x) / 3,
            y: (arc[k - 1].y + arc[k].y + arc[k + 1].y) / 3,
          };
        }
      }
    }
  } else {
    // Bottom dip: short circular arc through tip + geom flank mids
    const arcHalf = 10;
    const hiX = Math.round(tipX + arcHalf);
    const loX = Math.round(tipX - arcHalf);
    const midHi =
      apexMid(hiX) ?? raw.find((p) => p.x >= hiX - 0.5) ?? raw[0];
    const midLo =
      apexMid(loX) ?? raw.find((p) => p.x <= loX + 0.5) ?? raw[raw.length - 1];
    const A = travelRightToLeft ? midHi : midLo;
    const C = travelRightToLeft ? midLo : midHi;
    const circle = sampleCircularArc(A, T, C, 28);
    if (circle) {
      const pre = travelRightToLeft
        ? raw.filter((p) => p.x > A.x + 0.01)
        : raw.filter((p) => p.x < A.x - 0.01);
      const post = travelRightToLeft
        ? raw.filter((p) => p.x < C.x - 0.01)
        : raw.filter((p) => p.x > C.x + 0.01);
      arc = smoothOpen([...pre, ...circle, ...post], 2);
    } else {
      arc = smoothOpen(raw, 4);
    }
  }

  const near = (target: Pt, lo: number, hi: number) => {
    let best = lo;
    let bd = Infinity;
    for (let i = lo; i <= hi; i++) {
      const d = Math.hypot(pts[i].x - target.x, pts[i].y - target.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const s0 = near(arc[0], Math.max(1, tip - 50), tip);
  const s1 = near(arc[arc.length - 1], tip, Math.min(pts.length - 2, tip + 50));

  console.log(
    `${side} apex ${side === 'top' ? 'geom-smooth' : 'geom+circle'} T=(${T.x.toFixed(1)},${T.y.toFixed(1)}) cols=${raw.length} out=${arc.length} splice=${s0}..${s1}`
  );
  return [...cleanup(pts.slice(0, s0)), ...arc, ...cleanup(pts.slice(s1 + 1))];
}

/**
 * Round a sharp horizontal apex (left/right tip). Samples geometric midpoints
 * per row — DT ridge lies when the silhouette kisses the image edge (Spa's
 * right tip at x≈356). `y0..y1` bounds the search window.
 */
function roundSharpSideApex(
  pts: Pt[],
  track: Uint8Array,
  w: number,
  h: number,
  side: 'left' | 'right',
  y0: number,
  y1: number
): Pt[] {
  const isMoreExtreme = (x: number, ref: number) =>
    side === 'right' ? x > ref : x < ref;

  let tip = -1;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y <= y0 || pts[i].y >= y1) continue;
    if (tip < 0 || isMoreExtreme(pts[i].x, pts[tip].x)) tip = i;
  }
  if (tip < 0) return pts;
  if (side === 'right' && pts[tip].x < w - 9) return pts;
  if (side === 'left' && pts[tip].x > 8) return pts;

  const rise = 14;
  let i0 = tip;
  let i1 = tip;
  while (i0 > 2 && Math.abs(pts[i0].x - pts[tip].x) < rise) i0--;
  while (i1 < pts.length - 3 && Math.abs(pts[i1].x - pts[tip].x) < rise) i1++;
  // Also require we've moved enough in y so the window isn't tiny
  while (i0 > 2 && Math.abs(pts[tip].y - pts[i0].y) < 8) i0--;
  while (i1 < pts.length - 3 && Math.abs(pts[tip].y - pts[i1].y) < 8) i1++;
  if (i1 - i0 < 6) return pts;

  const tipX = pts[tip].x;
  const yLo = Math.min(pts[i0].y, pts[i1].y);
  const yHi = Math.max(pts[i0].y, pts[i1].y);

  /** Geom mid of the leftmost/rightmost track band on row y. */
  const sideMid = (y: number): Pt | null => {
    const xs: number[] = [];
    for (let x = 0; x < w; x++) if (track[y * w + x]) xs.push(x);
    if (!xs.length) return null;
    const clusters: number[][] = [];
    let cur: number[] = [];
    for (const x of xs) {
      if (!cur.length || x === cur[cur.length - 1] + 1) cur.push(x);
      else {
        clusters.push(cur);
        cur = [x];
      }
    }
    if (cur.length) clusters.push(cur);
    const c = side === 'right' ? clusters[clusters.length - 1] : clusters[0];
    const x0b = c[0];
    const x1b = c[c.length - 1];
    if (x1b - x0b > 14) return null; // fat vertical section / merged bands
    if (side === 'right' && x1b < tipX - 18) return null;
    if (side === 'left' && x0b > tipX + 18) return null;
    return { x: (x0b + x1b) / 2, y };
  };

  const travelDown = pts[i1].y > pts[i0].y;
  const raw: Pt[] = [];
  if (travelDown) {
    for (let y = Math.round(yLo); y <= Math.round(yHi); y++) {
      const p = sideMid(y);
      if (!p) continue;
      const prev = raw[raw.length - 1];
      if (prev && Math.abs(p.x - prev.x) > 4) continue;
      raw.push(p);
    }
  } else {
    for (let y = Math.round(yHi); y >= Math.round(yLo); y--) {
      const p = sideMid(y);
      if (!p) continue;
      const prev = raw[raw.length - 1];
      if (prev && Math.abs(p.x - prev.x) > 4) continue;
      raw.push(p);
    }
  }
  if (raw.length < 8) return pts;

  let tipGeom = raw[0];
  for (const p of raw) {
    if (isMoreExtreme(p.x, tipGeom.x)) tipGeom = p;
  }
  const T = tipGeom;
  let arc = smoothOpen(raw, 7);
  // Soft tip pin (same recipe as top crest)
  let tipI = 0;
  for (let i = 1; i < arc.length; i++) {
    if (Math.abs(arc[i].y - T.y) < Math.abs(arc[tipI].y - T.y)) tipI = i;
  }
  const s = arc[tipI];
  arc[tipI] = { x: s.x * 0.35 + T.x * 0.65, y: T.y };
  if (tipI > 1 && tipI < arc.length - 2) {
    for (let pass = 0; pass < 2; pass++) {
      for (const k of [tipI - 1, tipI + 1]) {
        arc[k] = {
          x: (arc[k - 1].x + arc[k].x + arc[k + 1].x) / 3,
          y: (arc[k - 1].y + arc[k].y + arc[k + 1].y) / 3,
        };
      }
    }
  }

  const near = (target: Pt, lo: number, hi: number) => {
    let best = lo;
    let bd = Infinity;
    for (let i = lo; i <= hi; i++) {
      const d = Math.hypot(pts[i].x - target.x, pts[i].y - target.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const s0 = near(arc[0], Math.max(1, tip - 50), tip);
  const s1 = near(arc[arc.length - 1], tip, Math.min(pts.length - 2, tip + 50));

  console.log(
    `${side} apex geom-smooth T=(${T.x.toFixed(1)},${T.y.toFixed(1)}) rows=${raw.length} out=${arc.length} splice=${s0}..${s1}`
  );
  return [...cleanup(pts.slice(0, s0)), ...arc, ...cleanup(pts.slice(s1 + 1))];
}

function fixSpaBusStopAndLaSource(
  seed: Pt[],
  dt: Float32Array,
  track: Uint8Array,
  w: number,
  h: number
): Pt[] {
  let i0 = -1;
  for (let i = 0; i < seed.length; i++) {
    const p = seed[i];
    if (p.x < 150 && p.x > 120 && p.y > 150 && p.y < 175) {
      i0 = i;
      break;
    }
  }
  if (i0 < 0) return seed;

  // Keep start→Eau Rouge→…→Bus Stop entry. Tail is only the approach into the hairpin;
  // the exit out of La Source is already seed[0]… (closed by densify).
  const head = seed.slice(0, i0);
  const startX = Math.round(seed[i0].x);

  // Lower-band medial into the hairpin; densify closes to head[0] (start/finish)
  const approach: Pt[] = [];
  for (let x = startX; x >= 3; x--) {
    const p = medialInBand(x, dt, track, w, h, 'lower');
    if (p) approach.push(p);
  }

  console.log(
    `Spa Bus Stop + La Source rewrite: keep [0..${i0}), approach ${approach.length}`
  );
  return [...head, ...approach];
}

function main() {
  const id = process.argv[2] || 'spa';
  const asset = ASSET_BY_ID[id];
  if (!asset) {
    console.error(`Unknown circuit id: ${id}`);
    process.exit(1);
  }

  const jsonPath = PATH_JSON;
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<
    string,
    { w: number; h: number; trackPixels?: number; contourLen?: number; points: number; d: string }
  >;

  const file = path.join(ASSETS, asset);
  const { w, h, track } = loadTrack(file);
  const trackCount = track.reduce((a, b) => a + b, 0);
  console.log(`Loaded ${asset} ${w}×${h}, track=${trackCount}`);

  const dt = distanceTransform(track, w, h);

  let entry = json[id];
  if (!entry?.d) {
    // New circuit: bootstrap a seed from the PNG mask at native pixel size.
    const seedPts = bootstrapSeedFromMask(track, w, h, 10);
    entry = { w, h, points: seedPts.length, d: toPathD(seedPts) };
    json[id] = entry;
    console.log(`Created seed entry for ${id} at ${w}×${h}`);
  }

  if (entry.w !== w || entry.h !== h) {
    console.warn(`Note: JSON viewBox ${entry.w}×${entry.h} vs PNG ${w}×${h} — snapping in PNG space then keeping JSON w/h`);
  }

  let seed = parsePolyline(entry.d);
  // Map seed from JSON space → PNG space if needed
  const sx = w / entry.w;
  const sy = h / entry.h;
  let seedPng = seed.map((p) => ({ x: p.x * sx, y: p.y * sy }));
  if (id === 'spa') {
    seedPng = fixSpaBusStopAndLaSource(seedPng, dt, track, w, h);
  }

  const dense = densify(seedPng, 1.8);
  console.log(`Seed ${seedPng.length} → densified ${dense.length}`);

  const snapped: Pt[] = [];
  for (let i = 0; i < dense.length; i++) {
    const seedPt = dense[i];
    const prevSeed = dense[(i - 1 + dense.length) % dense.length];
    const nextSeed = dense[(i + 1) % dense.length];
    const tangent = { x: nextSeed.x - prevSeed.x, y: nextSeed.y - prevSeed.y };
    const raw = snapToRidgeAlongNormal(seedPt, tangent, dt, track, w, h, 6);
    const prev = snapped[i - 1];
    if (prev && Math.hypot(raw.x - prev.x, raw.y - prev.y) > 10) {
      snapped.push({
        x: (prev.x + seedPt.x) / 2,
        y: (prev.y + seedPt.y) / 2,
      });
    } else {
      snapped.push(raw);
    }
  }
  // Keep dense samples — light cleanup only (RDP cuts chicanes / straights)
  let cycle = cleanup(snapped);

  if (id === 'spa') {
    // Drop tip spikes that dart to x<=2 after the hairpin has already climbed
    const cleaned: Pt[] = [];
    let seenClimb = false;
    for (let i = 0; i < cycle.length; i++) {
      const p = cycle[i];
      const prev = cleaned[cleaned.length - 1];
      if (prev && prev.x < 20 && prev.y > 195 && p.x <= 2 && p.y < prev.y + 5) {
        // spike into the tip after climb — skip
        continue;
      }
      if (p.x < 12 && p.y < 205 && p.y > 190) seenClimb = true;
      if (seenClimb && p.x <= 2) continue;
      cleaned.push(p);
    }
    cycle = cleaned.length > 100 ? cleaned : cycle;
    // Raidillon crest (top) and the Pouhon-loop dip (bottom)
    cycle = roundSharpApex(cycle, dt, track, w, h, 'top', 220, 290);
    cycle = roundSharpApex(cycle, dt, track, w, h, 'bottom', 280, 330);
    // Far-right tip (Les Combes / Malmedy side) — V-spike at image edge
    cycle = roundSharpSideApex(cycle, track, w, h, 'right', 40, 85);
  }

  // Map back to JSON viewBox
  const out = cycle.map((p) => ({ x: p.x / sx, y: p.y / sy }));
  console.log(`Centerline points=${out.length} maxX=${Math.max(...out.map((p) => p.x)).toFixed(1)}`);

  json[id] = {
    ...entry,
    w: entry.w,
    h: entry.h,
    trackPixels: trackCount,
    points: out.length,
    d: toPathD(out),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`Wrote ${id} (viewBox ${entry.w}×${entry.h})`);
}

main();
