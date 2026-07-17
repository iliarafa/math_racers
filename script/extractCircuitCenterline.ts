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
  const r = Math.round(n * 10) / 10;
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
 * Spa end: Bus Stop on the lower band, then around La Source hairpin (bottom),
 * then up the exit arm — never chord across the hairpin.
 */
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
  const entry = json[id];
  if (!entry?.d) {
    console.error(`No seed path for ${id} in circuitPathData.json`);
    process.exit(1);
  }

  const file = path.join(ASSETS, asset);
  const { w, h, track } = loadTrack(file);
  const trackCount = track.reduce((a, b) => a + b, 0);
  console.log(`Loaded ${asset} ${w}×${h}, track=${trackCount}`);

  if (entry.w !== w || entry.h !== h) {
    console.warn(`Note: JSON viewBox ${entry.w}×${entry.h} vs PNG ${w}×${h} — snapping in PNG space then keeping JSON w/h`);
  }

  const dt = distanceTransform(track, w, h);
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
