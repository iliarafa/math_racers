// The Paddock's Weekend Briefing tile, lifted off the screen and taken apart in 3D: the gradient
// plate rises as a slab, and the flag, WEEKEND BRIEFING and the round's name float up above it
// in layers (an exploded view of the tile), gathering over the plate's middle and growing as they
// rise, while the camera swings round to show the depth.
//
// Each part is the app's own rendering of it, filmed on a transparent background by
// capture-paddock.mjs and laid where the tile has it on screen. At the cut to 3D the parts lie
// flat on the filmed Paddock, exactly over the tile, so the cut can't be seen; as they lift, the
// ground below changes to the same frame filmed without the tile, so no copy is left behind.
import { SCREEN, W, H, FOV, clamp01, prog, eInOut, smooth, lerp, createView, groundMesh, edgeFade, handoverView, orbitPose } from './scene3d.mjs';

/**
 * Heights at full lift, CSS px above the screen: the plate's top face, then each layer. The words
 * keep the tile's order (WEEKEND BRIEFING over the name), so rising they never cross.
 */
const LIFT = { plate: 60, flag: 230, title: 380, label: 520 };
/** How much each layer grows by the time it has risen. */
const GROW = { flag: 2.4, label: 1.7, title: 1.7 };
/**
 * The plate starts rising, and STAGGER later the other parts together: rising on one curve their
 * heights stay in proportion, so none passes through another. Each takes RISE seconds.
 */
const RISE = 0.8, STAGGER = 0.08;
const SLAB = 9;                    // the plate's thickness
const RADIUS = 14;                 // the tile's corner radius (Hub.tsx)
/**
 * Where the camera ends the lift: elevation, azimuth, margin round the tile, how far above the
 * stack's middle it aims (so the stack sits lower in frame, clear of the caption), then its drift.
 */
const VIEW = { phi: 0.95, theta: 0.15, margin: 30, lower: 110, drift: { theta: 0.1, dist: 0.95 } };

/**
 * @param THREE the three.js module
 * @param o.rects     where the tile's parts are on screen, CSS px: { plate, flag, label, title }
 * @param o.layers    each part's image and the screen rect it covers: { plate: { image, rect }, ... }
 * @param o.ground    the filmed Paddock at the cut to 3D
 * @param o.bare      the same frame without the tile
 * @param o.handover  the stage camera at the cut: { z, fx, fy, ax, ay, K }
 * @param o.times     section-local seconds: { hand, liftEnd, end }
 */
export function createTile3D(THREE, { rects, layers, ground, bare, handover, times }) {
  const { canvas, renderer, scene, camera } = createView(THREE);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const centre = r => V(r.x + r.w / 2 - SCREEN.w / 2, 0, r.y + r.h / 2 - SCREEN.h / 2);
  const P = rects.plate, pc = centre(P);

  // ---- the ground: the filmed Paddock (opaque wherever the cut to 3D looks), then the same frame
  // without the tile, softly out of focus and fading out a little way round where the tile was
  const hv = handoverView(THREE, handover), Kz = handover.K * handover.z;
  const clear = { x: Math.max(W / 2 / Kz - hv.target.x, W / 2 / Kz + hv.target.x) + 2, top: H / 2 / Kz - hv.target.z + 2, bottom: H / 2 / Kz + hv.target.z + 2 };
  if (clear.x >= 196 || clear.top >= SCREEN.h / 2 || clear.bottom >= SCREEN.h / 2) throw new Error('the cut to the tile in 3D shows past the screen');
  const filmed = groundMesh(THREE, renderer, ground, edgeFade(clear));
  const soft = document.createElement('canvas');
  soft.width = bare.naturalWidth; soft.height = bare.naturalHeight;
  const sx = soft.getContext('2d'); sx.filter = `blur(${Math.round(soft.width / SCREEN.w * 8)}px)`; sx.drawImage(bare, 0, 0);
  const vacated = groundMesh(THREE, renderer, soft, (wx, wz) => {
    const dx = Math.max(0, Math.abs(wx - pc.x) - P.w / 2), dz = Math.max(0, Math.abs(wz - pc.z) - P.h / 2);
    return 255 * (1 - smooth(clamp01((Math.hypot(dx, dz) - 6) / 80)));
  });
  scene.add(filmed, vacated);

  // ---- the parts, flat, each over its place on screen
  const texture = img => {
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  function flat(map, rect, additive = false) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.w, rect.h), new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    mesh.rotation.x = -Math.PI / 2;
    const c = centre(rect); mesh.position.set(c.x, 0, c.z);
    scene.add(mesh);
    return mesh;
  }
  /** A soft glow of an image (for additive blending), `grow` CSS px bigger all round. */
  function glow({ image, rect }, grow, blur) {
    const s = (image.naturalWidth || image.width) / rect.w / 4;   // a quarter of the image's px per CSS px
    const c = document.createElement('canvas');
    c.width = Math.round((rect.w + 2 * grow) * s); c.height = Math.round((rect.h + 2 * grow) * s);
    const x = c.getContext('2d');
    x.filter = `blur(${blur * s}px)`;
    x.drawImage(image, grow * s, grow * s, rect.w * s, rect.h * s);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return flat(t, { x: rect.x - grow, y: rect.y - grow, w: rect.w + 2 * grow, h: rect.h + 2 * grow }, true);
  }

  // the plate: a rounded slab with the tile's gradient round its sides, the tile's face on top
  const shape = new THREE.Shape(), x0 = -P.w / 2, x1 = P.w / 2, y0 = -P.h / 2, y1 = P.h / 2, r = RADIUS;
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0); shape.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x1, y1 - r); shape.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x0 + r, y1); shape.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x0, y0 + r); shape.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 12 });
  const gradient = (() => {                  // the plate's colour across it, from the filmed face's middle row
    const { image, rect } = layers.plate, c = document.createElement('canvas');
    c.width = image.naturalWidth; c.height = image.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(image, 0, 0);
    const row = x.getImageData(0, c.height >> 1, c.width, 1).data, s = c.width / rect.w;
    const inset = (P.x - rect.x) * s + 3;    // clear of the face's anti-aliased ends
    return px => {
      const i = Math.round(Math.min(c.width - inset, Math.max(inset, (px - x0 + P.x - rect.x) * s))) * 4;
      return [row[i], row[i + 1], row[i + 2]];
    };
  })();
  const pos = slabGeo.attributes.position, col = new Float32Array(pos.count * 3), tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const [r8, g8, b8] = gradient(pos.getX(i));
    tint.setRGB(r8 / 255, g8 / 255, b8 / 255, THREE.SRGBColorSpace).multiplyScalar(0.6);
    col.set([tint.r, tint.g, tint.b], i * 3);
  }
  slabGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }));
  slab.rotation.x = -Math.PI / 2; slab.position.set(pc.x, 0, pc.z);
  scene.add(slab);

  const pool = glow(layers.plate, 110, 40);  // the tile's light on the Paddock below
  const halo = glow(layers.plate, 50, 18);   // and round the slab
  const plate = flat(texture(layers.plate.image), layers.plate.rect);
  /** A part's image cut down to what is drawn in it (the words sit at the left of wide boxes). */
  function trim({ image, rect }) {
    const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(image, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, s = c.width / rect.w, m = Math.round(2 * s);
    let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      if (d[(y * c.width + xx) * 4 + 3] > 8) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width - 1, x1 + m); y1 = Math.min(c.height - 1, y1 + m);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, -x0, -y0);
    return { image: out, rect: { x: rect.x + x0 / s, y: rect.y + y0 / s, w: out.width / s, h: out.height / s } };
  }
  const parts = ['flag', 'title', 'label'].map(name => {
    const cut = trim(layers[name]), mesh = flat(texture(cut.image), cut.rect);
    return { name, mesh, glow: glow(cut, 8, 5), from: centre(cut.rect) };
  });

  // A fixed draw order (see track3d.mjs): the ground, the light on it, the halo, the slab, then
  // each layer from the bottom up, its glow under it. Nothing but the slab writes depth, and the
  // camera stays above every layer, so bottom-up is back to front.
  [filmed, vacated, pool, halo, slab, plate, ...parts.flatMap(p => [p.glow, p.mesh])].forEach((o, i) => { o.renderOrder = i; });

  // ---- camera: from the stage's view straight down, round to look across the stack
  const stackMid = V(pc.x, (LIFT.plate + LIFT.label) / 2 + VIEW.lower, pc.z);
  const halfWidth = Math.atan(Math.tan((FOV / 2) * Math.PI / 180) * W / H);   // horizontal half-angle
  const viewDist = (P.w / 2 + VIEW.margin) / Math.tan(halfWidth);
  function cameraAt(u) {
    const e = eInOut(prog(u, times.hand, times.liftEnd)), d = smooth(prog(u, times.liftEnd, times.end));
    const { pos: at, q } = orbitPose(THREE, hv.target.clone().lerp(stackMid, e),
      lerp(0, VIEW.theta, e) + VIEW.drift.theta * d, lerp(Math.PI / 2, VIEW.phi, e),
      lerp(hv.dist, viewDist, e) * lerp(1, VIEW.drift.dist, d));
    camera.position.copy(at); camera.quaternion.copy(q);
  }

  return {
    canvas,
    /** Draw the section at `u` seconds in; returns the WebGL canvas. */
    render(u) {
      const o = prog(u, times.hand, times.hand + 0.12);       // the parts fade in over the filmed tile
      const rise = i => eInOut(prog(u, times.hand + 0.04 + i * STAGGER, times.hand + 0.04 + i * STAGGER + RISE));
      const dim = lerp(1, 0.35, eInOut(prog(u, times.hand + 0.2, times.liftEnd)));
      filmed.material.opacity = dim * (1 - eInOut(prog(u, times.hand + 0.1, times.hand + 0.45)));
      vacated.material.opacity = dim * eInOut(prog(u, times.hand + 0.05, times.hand + 0.35));
      const lift = rise(0), top = LIFT.plate * lift, thick = Math.max(SLAB * lift, 1e-3);
      // the slab only once the face over it is opaque: its darker top must never show through
      slab.scale.z = thick; slab.position.y = top - thick; slab.material.opacity = prog(u, times.hand + 0.12, times.hand + 0.2);
      plate.position.y = top + 0.2; plate.material.opacity = o;
      halo.position.y = top - thick / 2; halo.material.opacity = 0.6 * lift;
      pool.position.y = 0.3; pool.material.opacity = 0.45 * lift;
      parts.forEach((p, i) => {
        // up first, then (once the gaps between them have opened) in over the plate's middle,
        // growing as they go
        const k = rise(1), c = smooth(clamp01((k - 0.5) / 0.5));
        const h = Math.max(top + 0.3 + 0.1 * i, LIFT[p.name] * k), g = lerp(1, GROW[p.name], c);
        const x = lerp(p.from.x, pc.x, c), z = lerp(p.from.z, pc.z, c);
        p.mesh.position.set(x, h, z); p.mesh.scale.set(g, g, 1); p.mesh.material.opacity = o;
        p.glow.position.set(x, h - 0.05, z); p.glow.scale.set(g, g, 1); p.glow.material.opacity = 0.35 * k;
      });
      scene.fog.density = 0.0004 * lift;
      cameraAt(u);
      renderer.render(scene, camera);
      return canvas;
    },
    info: { handDist: hv.dist, viewDist, clear },
  };
}
