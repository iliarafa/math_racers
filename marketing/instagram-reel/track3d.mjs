// The Grand Prix card's circuit map, lifted off the card as a 3D floating highway.
//
// buildTrack() is pure geometry, from the app's own data:
//  - the circuit centreline (client/src/lib/circuitPathData.json, path units);
//  - the setup-card map (client/src/assets/<circuit>_setup_track.png), whose thin coloured
//    stripe marks each sector.
// The centreline is snapped onto those stripes, so the 3D roads sit exactly on the map's
// sector lines. Where the circuit runs back alongside itself (Baku's "neck") the centreline's
// two passes overlap; there each pass is snapped to its own sector's stripe (the colour of the
// track it connects to on either side), and the scene lifts one pass over the other as a
// flyover.

const TWO_PASS_RADIUS = 11;   // path units: closer than this to a far part of the lap = two-way
const FAR_INDEX = 60;         // centreline points apart before a nearby point counts as "far"
const SNAP_RADIUS = 12;       // PNG px searched for a stripe pixel
const SMOOTH_PASSES = 6;      // [1 2 1] passes over the resampled line

/** Stripe class of an RGBA pixel: 0 yellow, 1 blue, 2 magenta, -1 none. */
function stripeClass(r, g, b, a) {
  if (a <= 128 || Math.max(r, g, b) - Math.min(r, g, b) <= 90) return -1;
  if (r > 150 && g > 110 && b < 100) return 0;
  if (b > 140 && r < 140) return 1;
  if (r > 150 && g < 100 && b > 40) return 2;
  return -1;
}

/**
 * @param {{ pathD: string, pathW: number, img: { width: number, height: number, data: ArrayLike<number> }, spacing?: number }} o
 */
export function buildTrack({ pathD, pathW, img, spacing = 1.5 }) {
  const S = img.width / pathW;                       // PNG px per path unit
  const src = [...pathD.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => [Number(m[1]), Number(m[2])]);
  const n = src.length;

  // stripe pixels, bucketed on a grid for nearest-pixel lookups
  const CELL = 8, gw = Math.ceil(img.width / CELL), gh = Math.ceil(img.height / CELL);
  const grid = Array.from({ length: gw * gh }, () => []);
  const sums = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const o = (y * img.width + x) * 4, d = img.data;
    const c = stripeClass(d[o], d[o + 1], d[o + 2], d[o + 3]);
    if (c < 0) continue;
    grid[((y / CELL) | 0) * gw + ((x / CELL) | 0)].push(x, y, c);
    sums[c][0] += d[o]; sums[c][1] += d[o + 1]; sums[c][2] += d[o + 2]; sums[c][3]++;
  }
  const colours = sums.map(([r, g, b, k]) => [r / k, g / k, b / k].map(v => Math.round(v)));
  const nearest = (px, py, want = -1) => {
    let best = null, bd = SNAP_RADIUS * SNAP_RADIUS;
    const x0 = Math.max(0, ((px - SNAP_RADIUS) / CELL) | 0), x1 = Math.min(gw - 1, ((px + SNAP_RADIUS) / CELL) | 0);
    const y0 = Math.max(0, ((py - SNAP_RADIUS) / CELL) | 0), y1 = Math.min(gh - 1, ((py + SNAP_RADIUS) / CELL) | 0);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const cell = grid[cy * gw + cx];
      for (let k = 0; k < cell.length; k += 3) {
        if (want >= 0 && cell[k + 2] !== want) continue;
        const dx = cell[k] - px, dy = cell[k + 1] - py, dd = dx * dx + dy * dy;
        if (dd <= bd) { bd = dd; best = cell.slice(k, k + 3); }
      }
    }
    return best;
  };

  // two-way stretches: a far part of the lap runs within TWO_PASS_RADIUS
  const twoWay = new Uint8Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const gap = Math.min(Math.abs(i - j), n - Math.abs(i - j));
    if (gap > FAR_INDEX && Math.hypot(src[i][0] - src[j][0], src[i][1] - src[j][1]) < TWO_PASS_RADIUS) { twoWay[i] = 1; break; }
  }

  // first pass: snap every point to the nearest stripe pixel of any colour
  const pos = src.map(p => p.slice()), cls = new Int8Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const hit = nearest(src[i][0] * S, src[i][1] * S);
    if (hit) { pos[i] = [hit[0] / S, hit[1] / S]; cls[i] = hit[2]; }
  }

  // two-way runs take the colour of the one-way track they join at both ends, then re-snap
  const runs = [];
  for (let i = 0; i < n; i++) {
    if (!twoWay[i] || twoWay[(i - 1 + n) % n]) continue;
    let j = i; while (twoWay[(j + 1) % n] && (j + 1) % n !== i) j = (j + 1) % n;
    runs.push([i, j]);
  }
  const colourNear = (i, step) => {
    for (let k = 1; k < n; k++) { const q = (((i + step * k) % n) + n) % n; if (!twoWay[q] && cls[q] >= 0) return cls[q]; }
    return -1;
  };
  const passes = runs.map(([a, b]) => {
    const before = colourNear(a, -1), after = colourNear(b, 1);
    if (before !== after) throw new Error(`two-way run ${a}-${b} joins different sectors (${before}/${after})`);
    for (let i = a; ; i = (i + 1) % n) {
      const hit = nearest(src[i][0] * S, src[i][1] * S, before);
      if (!hit) throw new Error(`no ${before} stripe near two-way point ${i}`);
      pos[i] = [hit[0] / S, hit[1] / S]; cls[i] = before;
      if (i === b) break;
    }
    return { from: a, to: b, sector: before };
  });
  for (let i = 0; i < n; i++) if (cls[i] < 0) throw new Error(`no stripe near centreline point ${i}`);

  // chequered start/finish: centreline pixels that are white rather than stripe or ribbon
  const white = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(src[i][0] * S), y = Math.round(src[i][1] * S), o = (y * img.width + x) * 4, d = img.data;
    if (d[o + 3] > 128 && Math.min(d[o], d[o + 1], d[o + 2]) > 200) white.push(i);
  }
  if (!white.length) throw new Error('no chequered start/finish on the map');
  const finishSrc = white[white.length >> 1];

  // smooth (circular moving average) and resample evenly by arc length
  const W = 4, sm = pos.map((_, i) => {
    let x = 0, y = 0;
    for (let k = -W; k <= W; k++) { const q = pos[(i + k + n) % n]; x += q[0]; y += q[1]; }
    return [x / (2 * W + 1), y / (2 * W + 1)];
  });
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(sm[i % n][0] - sm[i - 1][0], sm[i % n][1] - sm[i - 1][1]));
  const length = cum[n], m = Math.round(length / spacing);
  const pts = new Float32Array(m * 2), srcIndex = new Float32Array(m), sector = new Uint8Array(m);
  for (let k = 0, i = 0; k < m; k++) {
    const s = (k / m) * length;
    while (cum[i + 1] < s) i++;
    const f = (s - cum[i]) / (cum[i + 1] - cum[i]), a = sm[i], b = sm[(i + 1) % n];
    pts[2 * k] = a[0] + (b[0] - a[0]) * f; pts[2 * k + 1] = a[1] + (b[1] - a[1]) * f;
    srcIndex[k] = i + f;
    sector[k] = cls[f < 0.5 ? i : (i + 1) % n];
  }
  // then a few [1 2 1] passes on the evenly spaced line: pixel-snapping jitter would otherwise
  // show as wobbling road edges up close
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const prev = Float32Array.from(pts);
    for (let k = 0; k < m; k++) {
      const a = ((k - 1 + m) % m) * 2, b = ((k + 1) % m) * 2;
      pts[2 * k] = (prev[a] + 2 * prev[2 * k] + prev[b]) / 4;
      pts[2 * k + 1] = (prev[a + 1] + 2 * prev[2 * k + 1] + prev[b + 1]) / 4;
    }
  }
  // majority filter so each sector is one clean run
  const fixed = sector.map((_, k) => {
    const votes = [0, 0, 0];
    for (let q = -5; q <= 5; q++) votes[sector[(k + q + m) % m]]++;
    return votes.indexOf(Math.max(...votes));
  });
  const toResampled = i => { let best = 0, bd = Infinity; for (let k = 0; k < m; k++) { const d = Math.abs(srcIndex[k] - i); if (d < bd) { bd = d; best = k; } } return best; };
  return {
    pts, sector: Uint8Array.from(fixed), srcIndex, count: m, spacing: length / m, length,
    colours, finish: toResampled(finishSrc), finishSrc,
    passes: passes.map(p => ({ ...p, fromK: toResampled(p.from), toK: toResampled(p.to) })),
  };
}

// ---------------------------------------------------------------- the 3D scene
// World units are the phone screen's CSS px, origin at the screen centre, y up. The ground is
// the screen itself (393 x 852) lying flat, textured with the filmed frame, so a camera looking
// straight down reproduces the stage's 2D view of the card exactly (see handoverPose).

const SCREEN = { w: 393, h: 852 };
/** Road and lift sizes in path units (the map's 700 x 393 space). */
const ROAD = {
  width: 9, printed: 3.4, stripe: 0.4, edge: 0.45, deck: 1.6,
  float: 55, wave: 7, flyover: 9, ramp: 22,
  finish: 6, gantry: 7.5,
};
/** Race camera, in path units: height above the road and how far ahead it looks. */
const CHASE = { height: 4.5, look: 40 };
/** Where the lift's orbit ends: looking east over the castle toward the straight (world units). */
const ORBIT = { theta: 1.25, phi: 0.52, dist: 230, target: [-15, -55] };
const FOV = 40;

const clamp01 = x => Math.min(1, Math.max(0, x));
const prog = (u, a, b) => clamp01((u - a) / (b - a));
const eInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eOut = x => 1 - Math.pow(1 - x, 3);
const smooth = x => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param THREE the three.js module
 * @param o.track     buildTrack() output
 * @param o.map       { x, y, s }: the card draws path point p at CSS (x + p.x * s, y + p.y * s)
 * @param o.ground    the filmed frame (image) shown at the handover
 * @param o.handover  the stage camera at the handover: { z, fx, fy, ax, ay, K }
 * @param o.times     section-local seconds: { hand, liftEnd, diveEnd, finish }
 * @param o.race      { from: resampled index where the race starts }; the race runs toward
 *                    decreasing index, which is the circuit's race direction on this map
 */
export function createTrack3D(THREE, { track, map, ground, handover, times, race }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0306, 0);
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 6000);

  const m = track.count, ps = map.s;
  const gx = new Float32Array(m), gz = new Float32Array(m), nx = new Float32Array(m), nz = new Float32Array(m);
  for (let k = 0; k < m; k++) {
    gx[k] = map.x + track.pts[2 * k] * ps - SCREEN.w / 2;
    gz[k] = map.y + track.pts[2 * k + 1] * ps - SCREEN.h / 2;
  }
  for (let k = 0; k < m; k++) {
    const a = (k - 2 + m) % m, b = (k + 2) % m, dx = gx[b] - gx[a], dz = gz[b] - gz[a], l = Math.hypot(dx, dz);
    nx[k] = -dz / l; nz[k] = dx / l;                                     // unit normal in the ground plane
  }

  // Full-lift deck height: a gentle swell that depends on ground position (so the two passes of
  // a two-way stretch, which share their ground, share it too), plus the flyover.
  const onRace = k => { const span = (race.from - track.finish + m) % m; return (race.from - k + m) % m <= span; };
  const fly = new Float32Array(m);
  for (const p of track.passes) {
    if (onRace(p.fromK) && onRace(p.toK)) continue;                     // the race drives under it
    const len = (p.toK - p.fromK + m) % m;
    for (let q = -ROAD.ramp; q <= len + ROAD.ramp; q++) {
      const k = (p.fromK + q + m) % m;
      const inside = q < 0 ? (q + ROAD.ramp) / ROAD.ramp : q > len ? (len + ROAD.ramp - q) / ROAD.ramp : 1;
      fly[k] = Math.max(fly[k], smooth(clamp01(inside)));
    }
  }
  const swell = new Float32Array(m);
  for (let k = 0; k < m; k++) swell[k] = ROAD.wave * Math.sin(gx[k] / 38 + 0.6) * Math.cos(gz[k] / 29 - 0.4);

  const colour = c => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
  const sectorCol = track.colours.map(colour);
  const asphalt = colour([26, 27, 33]), under = colour([9, 9, 12]), edgeWhite = colour([240, 240, 240]);

  // a closed quad strip along the track; `at(k, out)` writes left xyz then right xyz
  // Road parts are drawn after the ground (renderOrder) and fade in over the first moments of
  // the lift, so the cut to 3D can't show a road where the card prints something else (the
  // chequered start/finish).
  const roadParts = [];
  function strip({ blending = THREE.NormalBlending, glow = false, fade = true, map: tex = null, order = 0 } = {}) {
    const pos = new Float32Array(m * 6), col = new Float32Array(m * 6), uv = new Float32Array(m * 4), idx = [];
    for (let k = 0; k < m; k++) {
      uv.set([0, k / 8, 1, k / 8], k * 4);
      const a = 2 * k, b = 2 * ((k + 1) % m);
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending, transparent: true, map: tex, depthWrite: !glow });
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = order; mesh.frustumCulled = false;
    scene.add(mesh);
    if (!glow && fade) roadParts.push(mat);
    return {
      mesh, mat,
      update(at, paint) {
        const o = [0, 0, 0, 0, 0, 0];
        for (let k = 0; k < m; k++) {
          at(k, o); pos.set(o, k * 6);
          const c = paint(k); col.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 6);
        }
        g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
      },
    };
  }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 4;
    const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const top = strip(), wallL = strip(), wallR = strip(), bottom = strip(), stripe = strip(), edgeL = strip(), edgeR = strip();
  const halo = strip({ blending: THREE.AdditiveBlending, glow: true, map: glowTex, order: 2 });

  // dashed lane lines: two across the road, 6 path units on and 6 off (one texture repeat per
  // 8 points), appearing as the road widens
  const dashTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    for (const u of [0.25, 0.75]) x.fillRect(Math.round(u * 64) - 1, 0, 2, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  })();
  const dashes = strip({ map: dashTex, fade: false });

  // chequered start/finish across the road
  const checkTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; x.fillRect(i * 16, j * 16, 16, 16); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const finishMat = new THREE.MeshBasicMaterial({ map: checkTex, side: THREE.DoubleSide, transparent: true });
  const finish = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), finishMat);
  roadParts.push(finishMat);
  // and a chequered banner over it on two posts, which the race drives under
  const bannerMat = new THREE.MeshBasicMaterial({ map: checkTex, side: THREE.DoubleSide, transparent: true });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bannerMat);
  banner.frustumCulled = false; scene.add(banner);
  const postMat = new THREE.MeshBasicMaterial({ color: 0xd9d9de, transparent: true });
  const posts = [0, 1].map(() => { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), postMat); p.frustumCulled = false; scene.add(p); return p; });
  finish.frustumCulled = false; scene.add(finish);

  // the ground: the filmed screen, fading out at its edges (clear of the handover view)
  const groundTex = new THREE.Texture(ground); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.needsUpdate = true;
  groundTex.minFilter = THREE.LinearMipmapLinearFilter; groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const fade = (() => {
    const c = document.createElement('canvas'); c.width = SCREEN.w; c.height = SCREEN.h;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      const wx = xx + 0.5 - SCREEN.w / 2, wz = y + 0.5 - SCREEN.h / 2;
      const ax = 1 - smooth(clamp01((Math.abs(wx) - 150) / 46));
      const az = wz < 0 ? 1 - smooth(clamp01((-wz - 310) / 116)) : 1 - smooth(clamp01((wz - 190) / 236));
      const v = Math.round(255 * ax * az), o = (y * c.width + xx) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  })();
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ map: groundTex, alphaMap: fade, transparent: true, depthWrite: false }));
  groundMesh.rotation.x = -Math.PI / 2; groundMesh.renderOrder = -1; scene.add(groundMesh);

  // the track's light on the card below: a blurred copy of the sector lines
  const glowGround = (() => {
    const s = 3, c = document.createElement('canvas'), pw = track.pts, ext = [Infinity, -Infinity, Infinity, -Infinity];
    for (let k = 0; k < m; k++) { ext[0] = Math.min(ext[0], pw[2 * k]); ext[1] = Math.max(ext[1], pw[2 * k]); ext[2] = Math.min(ext[2], pw[2 * k + 1]); ext[3] = Math.max(ext[3], pw[2 * k + 1]); }
    const pad = 40; c.width = Math.ceil((ext[1] - ext[0] + 2 * pad) * s); c.height = Math.ceil((ext[3] - ext[2] + 2 * pad) * s);
    const lines = document.createElement('canvas'); lines.width = c.width; lines.height = c.height;
    const lx = lines.getContext('2d');
    lx.lineWidth = ROAD.width * s * 1.4; lx.lineCap = 'round';
    for (let k = 0; k < m; k++) {
      const j = (k + 1) % m, cc = track.colours[track.sector[k]];
      lx.strokeStyle = `rgb(${cc[0]},${cc[1]},${cc[2]})`;
      lx.beginPath(); lx.moveTo((pw[2 * k] - ext[0] + pad) * s, (pw[2 * k + 1] - ext[2] + pad) * s); lx.lineTo((pw[2 * j] - ext[0] + pad) * s, (pw[2 * j + 1] - ext[2] + pad) * s); lx.stroke();
    }
    const x = c.getContext('2d');
    x.filter = 'blur(18px)'; x.drawImage(lines, 0, 0);                   // one blur for the whole copy
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const wW = (ext[1] - ext[0] + 2 * pad) * ps, wD = (ext[3] - ext[2] + 2 * pad) * ps;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wW, wD), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(map.x + (ext[0] - pad) * ps + wW / 2 - SCREEN.w / 2, 0.05, map.y + (ext[2] - pad) * ps + wD / 2 - SCREEN.h / 2);
    mesh.renderOrder = 1; scene.add(mesh);
    return mesh;
  })();

  // ---- lift state -> geometry
  const deckY = new Float32Array(m);
  function shape(L) {
    const w = lerp(ROAD.printed, ROAD.width, L.w) * ps / 2, d = lerp(0.05, ROAD.deck, L.w) * ps;
    const sw = lerp(ROAD.printed, ROAD.stripe, L.w) * ps / 2, ew = ROAD.edge * L.w * ps;
    for (let k = 0; k < m; k++) deckY[k] = 0.02 + L.h * (ROAD.float + swell[k]) * ps + L.f * ROAD.flyover * fly[k] * ps;
    const P = (k, off, dy, o, i) => { o[i] = gx[k] + nx[k] * off; o[i + 1] = deckY[k] + dy; o[i + 2] = gz[k] + nz[k] * off; };
    top.update((k, o) => { P(k, w, 0, o, 0); P(k, -w, 0, o, 3); }, () => asphalt);
    wallL.update((k, o) => { P(k, w, 0, o, 0); P(k, w, -d, o, 3); }, k => sectorCol[track.sector[k]].clone().multiplyScalar(0.55));
    wallR.update((k, o) => { P(k, -w, 0, o, 0); P(k, -w, -d, o, 3); }, k => sectorCol[track.sector[k]].clone().multiplyScalar(0.55));
    bottom.update((k, o) => { P(k, w, -d, o, 0); P(k, -w, -d, o, 3); }, () => under);
    stripe.update((k, o) => { P(k, sw, 0.012, o, 0); P(k, -sw, 0.012, o, 3); }, k => sectorCol[track.sector[k]]);
    edgeL.update((k, o) => { P(k, w, 0.01, o, 0); P(k, w - ew, 0.01, o, 3); }, () => edgeWhite);
    edgeR.update((k, o) => { P(k, -w, 0.01, o, 0); P(k, -w + ew, 0.01, o, 3); }, () => edgeWhite);
    dashes.update((k, o) => { P(k, w, 0.011, o, 0); P(k, -w, 0.011, o, 3); }, () => edgeWhite);
    const hw = w * 3.2;
    halo.update((k, o) => { P(k, hw, -d * 0.5, o, 0); P(k, -hw, -d * 0.5, o, 3); }, k => sectorCol[track.sector[k]].clone().multiplyScalar(0.34 * L.h));
    const f = track.finish, ang = Math.atan2(nz[f], nx[f]), tiny = 1e-4;
    finish.scale.set(2 * w, Math.max(ROAD.finish * ps * L.w, tiny), 1);
    finish.position.set(gx[f], deckY[f] + 0.016, gz[f]);
    finish.rotation.set(-Math.PI / 2, 0, -ang);
    const gh = ROAD.gantry * ps * L.w, bh = 1.8 * ps * L.w;
    banner.scale.set(2 * w + 1.2 * ps, Math.max(bh, tiny), 1);
    banner.position.set(gx[f], deckY[f] + gh, gz[f]);
    banner.rotation.set(0, Math.atan2(nz[f], -nx[f]), 0);               // facing along the road
    posts.forEach((p, i) => {
      const off = (i ? -1 : 1) * (w + 0.4 * ps), ph = Math.max(gh + bh / 2, tiny);
      p.scale.set(0.35 * ps, ph, 0.35 * ps);
      p.position.set(gx[f] + nx[f] * off, deckY[f] + ph / 2, gz[f] + nz[f] * off);
    });
    glowGround.material.opacity = 0.6 * L.h;
    scene.fog.density = 0.0026 * L.h;
    for (const mat of roadParts) mat.opacity = L.o;
    dashes.mat.opacity = bannerMat.opacity = postMat.opacity = L.o * L.w;
  }

  // ---- camera
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  /** Orbit pose: looking at `target` from azimuth `theta` (0 = screen-up ahead), elevation `phi`. */
  function orbit(target, theta, phi, dist) {
    const dir = V(Math.sin(theta) * Math.cos(phi), -Math.sin(phi), -Math.cos(theta) * Math.cos(phi));
    const right = V(Math.cos(theta), 0, Math.sin(theta));
    const back = dir.clone().negate(), up = new THREE.Vector3().crossVectors(back, right);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back));
    return { pos: target.clone().addScaledVector(dir, -dist), q };
  }
  const K = handover.K * handover.z, f = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
  const handTarget = V(handover.fx + (W / 2 - handover.ax) / K, 0, handover.fy + (H / 2 - handover.ay) / K);
  const handDist = f / K;
  let cx = 0, cz = 0; for (let k = 0; k < m; k++) { cx += gx[k]; cz += gz[k]; } cx /= m; cz /= m;

  // race line at full lift: centre of the road, `camH` above it
  shape({ h: 1, w: 1, f: 1, o: 1 });
  const full = Float32Array.from(deckY);
  const camH = CHASE.height * ps, stepW = track.spacing * ps;
  const raceLen = ((race.from - track.finish + m) % m) * stepW;
  const along = dist => {                                  // point `dist` world units into the race
    const kf = race.from - dist / stepW, k0 = Math.floor(kf), fr = kf - k0;
    const a = ((k0 % m) + m) % m, b = (a + 1) % m;
    return V(lerp(gx[a], gx[b], fr), lerp(full[a], full[b], fr) + camH, lerp(gz[a], gz[b], fr));
  };
  const lookAhead = CHASE.look * ps;
  function chase(dist) {
    const pos = along(dist), ahead = along(dist + lookAhead), behind = along(dist - lookAhead);
    const fwd = ahead.clone().sub(pos).normalize();
    // bank into the bend: the turn of the road ahead against the road behind
    const t1 = pos.clone().sub(behind).setY(0).normalize(), t2 = fwd.clone().setY(0).normalize();
    const turn = Math.asin(Math.max(-1, Math.min(1, t1.x * t2.z - t1.z * t2.x)));
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, ahead.clone().add(V(0, -camH * 0.5, 0)), V(0, 1, 0)));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -turn * 0.9));
    return { pos, q };
  }
  const tRace = times.finish - times.diveEnd, v0 = raceLen * 0.32 / tRace;
  const acc = 2 * (raceLen - v0 * tRace) / (tRace * tRace);
  const raceDist = u => { const s = Math.max(0, u - times.diveEnd); return v0 * s + 0.5 * acc * s * s; };

  const orbitTarget = V(ORBIT.target[0], ROAD.float * ps, ORBIT.target[1]);
  const orbitEnd = orbit(orbitTarget, ORBIT.theta, ORBIT.phi, ORBIT.dist);
  function cameraAt(u) {
    let pos, q, fov = FOV;
    if (u <= times.liftEnd) {
      const e = eInOut(prog(u, times.hand, times.liftEnd));
      const target = handTarget.clone().lerp(orbitTarget, e);
      ({ pos, q } = orbit(target, lerp(0, ORBIT.theta, e), lerp(Math.PI / 2, ORBIT.phi, e), lerp(handDist, ORBIT.dist, e)));
    } else if (u <= times.diveEnd) {
      const e = eInOut(prog(u, times.liftEnd, times.diveEnd)), start = chase(0);
      const fwd = along(1).sub(along(0)).normalize();
      const p0 = orbitEnd.pos, p3 = start.pos;
      const p1 = p0.clone().lerp(p3, 0.35).add(V(0, 20, 0));
      const p2 = p3.clone().addScaledVector(fwd, -v0 * (times.diveEnd - times.liftEnd) / 3).add(V(0, 2.5, 0));
      const t = e, it = 1 - t;
      pos = p0.clone().multiplyScalar(it * it * it).addScaledVector(p1, 3 * it * it * t).addScaledVector(p2, 3 * it * t * t).addScaledVector(p3, t * t * t);
      q = orbitEnd.q.clone().slerp(start.q, eInOut(prog(u, times.liftEnd, times.diveEnd - 0.08)));
      fov = lerp(FOV, 62, e);
    } else {
      ({ pos, q } = chase(raceDist(u)));
      fov = 62 + 6 * prog(u, times.diveEnd, times.finish);
    }
    camera.position.copy(pos); camera.quaternion.copy(q);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  return {
    canvas,
    /** Draw the section at `u` seconds in; returns the WebGL canvas. */
    render(u) {
      shape({
        o: prog(u, times.hand, times.hand + 0.15),
        f: eInOut(prog(u, times.hand, times.hand + 0.55)),
        h: eInOut(prog(u, times.hand + 0.05, times.liftEnd - 0.1)),
        w: eInOut(prog(u, times.hand + 0.25, times.liftEnd)),
      });
      // once the camera dives onto the road, the card below dims so the highway floats in the dark
      const dim = lerp(1, 0.22, eInOut(prog(u, times.liftEnd, times.diveEnd)));
      groundMesh.material.opacity = dim;
      glowGround.material.opacity *= dim;
      cameraAt(u);
      renderer.render(scene, camera);
      return canvas;
    },
    info: { raceLen, v0, acc, handDist, handTarget: handTarget.toArray(), centre: [cx, cz] },
  };
}
