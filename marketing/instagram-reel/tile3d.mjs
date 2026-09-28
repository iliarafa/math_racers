// The Paddock's Weekend Briefing tile in 3D, ridden like a skate ramp. It lifts off the screen
// a little as a glowing slab; the camera swoops down onto its top edge at the navy end and
// skates along it, the gradient streaming past (the flag and the words rushing by on the face,
// streaks of shine flashing under), then drops in at the white end, which fills the frame: the
// white the stage washes into Free Practice from.
//
// The tile's face and parts are the app's own rendering, filmed on transparent backgrounds by
// capture-paddock.mjs and laid where the tile has them on screen. At the cut to 3D they lie flat
// on the filmed Paddock exactly over the tile, so the cut can't be seen; as the tile lifts, the
// ground below changes to the same frame filmed without it, so no copy is left behind.
import { SCREEN, FOV, clamp01, prog, eInOut, smooth, lerp, createView, groundMesh, edgeFade, handoverView, orbitPose } from './scene3d.mjs';

const LIFT = 24;                   // how far the tile rises, CSS px
const SLAB = 9;                    // its thickness
const RADIUS = 14;                 // its corner radius (Hub.tsx)
/**
 * The ride, in CSS px (along the tile from its left end, across it from its top edge) and
 * degrees. The camera skates `height` above the face and `inset` inside the top edge, from
 * `from` to `to`, looking along the tile `pitch` down and `yaw` toward the face, banking up to
 * `bank` into it, with a wide `fov` for speed. Then it drops in to `drop`, `land` above the face,
 * turning to `dropYaw`, tipping to `dropPitch` down, with a `dropFov`.
 */
const RIDE = {
  height: 8, inset: 4, from: 22, to: 270, pitch: 14, yaw: 10, bank: 6, fov: 70,
  drop: [334, 30], land: 2, dropPitch: 75, dropYaw: 35, dropFov: 55,
};
/**
 * The shine: streaks of light across the face (CSS px along the tile from its left end), leaning
 * `lean` degrees, each a sharp line in a soft glow. They come in as the tile lifts.
 */
const SHINE = { at: [128, 204, 262], lean: 24, line: [2.5, 0.5], glow: [18, 0.2] };

/**
 * @param THREE the three.js module
 * @param o.rects     where the tile's parts are on screen, CSS px: { plate, flag, label, title }
 * @param o.layers    each part's image and the screen rect it covers: { plate: { image, rect }, ... }
 * @param o.ground    the filmed Paddock at the cut to 3D
 * @param o.bare      the same frame without the tile
 * @param o.handover  the stage camera at the cut: { z, fx, fy, ax, ay, K }
 * @param o.approach  the stage camera `dt` seconds before the cut: { z, fx, fy, ax, ay, K, dt }, so
 *                    the 3D camera carries on at the push-in's speed
 * @param o.times     section-local seconds: { hand, swoopEnd, dropStart, dropEnd }
 */
export function createTile3D(THREE, { rects, layers, ground, bare, handover, approach, times }) {
  const { canvas, renderer, scene, camera } = createView(THREE);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rad = d => (d * Math.PI) / 180;
  const centre = r => V(r.x + r.w / 2 - SCREEN.w / 2, 0, r.y + r.h / 2 - SCREEN.h / 2);
  const P = rects.plate, pc = centre(P);
  const left = P.x - SCREEN.w / 2, topEdge = P.y - SCREEN.h / 2;      // the tile's left end, top edge

  // ---- the ground: the filmed Paddock (opaque wherever the cut to 3D looks), then the same frame
  // without the tile, softly out of focus and fading out a little way round where the tile was
  const hv = handoverView(THREE, handover), Kz = handover.K * handover.z;
  const halfW = canvas.width / 2 / Kz, halfH = canvas.height / 2 / Kz;
  const clear = { x: Math.max(halfW - hv.target.x, halfW + hv.target.x) + 2, top: halfH - hv.target.z + 2, bottom: halfH + hv.target.z + 2 };
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

  // ---- the tile: its face and parts flat, each over its place on screen
  const texture = img => {
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  function flat(geometry, material, at) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(at.x, 0, at.z);
    scene.add(mesh);
    return mesh;
  }
  const decal = (map, rect, additive = false) => flat(new THREE.PlaneGeometry(rect.w, rect.h), new THREE.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }), centre(rect));
  /** A soft glow of an image (for additive blending), `grow` CSS px bigger all round. */
  function glow({ image, rect }, grow, blur) {
    const s = image.naturalWidth / rect.w / 4;                           // a quarter of the image's px per CSS px
    const c = document.createElement('canvas');
    c.width = Math.round((rect.w + 2 * grow) * s); c.height = Math.round((rect.h + 2 * grow) * s);
    const x = c.getContext('2d');
    x.filter = `blur(${blur * s}px)`;
    x.drawImage(image, grow * s, grow * s, rect.w * s, rect.h * s);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return decal(t, { x: rect.x - grow, y: rect.y - grow, w: rect.w + 2 * grow, h: rect.h + 2 * grow }, true);
  }
  /** The tile's outline, `grow` px out from it, as a path centred on 0 (for shapes and holes). */
  function outline(path, grow) {
    const w = P.w + 2 * grow, h = P.h + 2 * grow, r = Math.max(1, RADIUS + grow);
    const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
    path.moveTo(x0 + r, y0);
    path.lineTo(x1 - r, y0); path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x1, y1 - r); path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    path.lineTo(x0 + r, y1); path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x0, y0 + r); path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    return path;
  }
  const gradient = (() => {                  // the tile's colour across it, from the filmed face's middle row
    const { image, rect } = layers.plate, c = document.createElement('canvas');
    c.width = image.naturalWidth; c.height = image.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(image, 0, 0);
    const row = x.getImageData(0, c.height >> 1, c.width, 1).data, s = c.width / rect.w;
    const inset = (P.x - rect.x) * s + 3;    // clear of the face's anti-aliased ends
    const tint = new THREE.Color();
    return (px, k = 1) => {                  // px: from the tile's centre; k: brightness
      const i = Math.round(Math.min(c.width - inset, Math.max(inset, (px + P.w / 2 + P.x - rect.x) * s))) * 4;
      return tint.setRGB(row[i] / 255, row[i + 1] / 255, row[i + 2] / 255, THREE.SRGBColorSpace).multiplyScalar(k).clone();
    };
  })();
  /** Colours a geometry's vertices by the gradient under them. */
  function paint(geometry, k) {
    const p = geometry.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const c = gradient(p.getX(i), k); col.set([c.r, c.g, c.b], i * 3); }
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geometry;
  }

  // the slab: the tile's outline extruded, its sides in the gradient's colours
  const slab = flat(paint(new THREE.ExtrudeGeometry(outline(new THREE.Shape(), 0), { depth: 1, bevelEnabled: false, curveSegments: 12 }), 0.6),
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }), pc);
  const pool = glow(layers.plate, 110, 40);  // the tile's light on the Paddock below
  const halo = glow(layers.plate, 50, 18);   // and round the slab
  const face = decal(texture(layers.plate.image), layers.plate.rect);
  const parts = ['flag', 'title', 'label'].map(n => decal(texture(layers[n].image), layers[n].rect));
  // the rim: a thin bright line round the face and a wider glow in the gradient's colours, the
  // edge the camera skates along
  const ring = (grow, width) => {
    const s = outline(new THREE.Shape(), grow);
    s.holes.push(outline(new THREE.Path(), grow - width));
    return new THREE.ShapeGeometry(s, 12);
  };
  const rimGlow = flat(paint(ring(2.5, 5), 1), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), pc);
  const rim = flat(ring(0, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), pc);
  // the shine, drawn at the face's resolution and cut to its shape
  const shine = (() => {
    const { image, rect } = layers.plate, s = image.naturalWidth / rect.w;
    const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
    const x = c.getContext('2d');
    x.scale(s, s);
    for (const a of SHINE.at) {
      x.save();
      x.translate(P.x - rect.x + a, rect.h / 2); x.rotate(rad(SHINE.lean));
      for (const [w, k] of [SHINE.glow, SHINE.line]) {
        const g = x.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(-w / 2, -rect.h, w, 2 * rect.h);
      }
      x.restore();
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(image, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return decal(t, rect, true);
  })();

  // A fixed draw order (see track3d.mjs): the ground, the light on it, the halo, the slab, then
  // the face, its shine, its parts and the rim over it. Only the slab writes depth.
  [filmed, vacated, pool, halo, slab, face, shine, ...parts, rimGlow, rim].forEach((o, i) => { o.renderOrder = i; });

  // ---- camera
  /**
   * The camera looking `pitch` degrees down, heading `heading` degrees round from along the tile
   * (+x) toward its face (+z), banked `bank`. Straight down (pitch 90) the heading is the frame's up.
   */
  function orient(heading, pitch, bank = 0) {
    const h = rad(heading), p = rad(pitch);
    const fwd = V(Math.cos(p) * Math.cos(h), -Math.sin(p), Math.cos(p) * Math.sin(h));
    const up = V(Math.sin(p) * Math.cos(h), Math.cos(p), Math.sin(p) * Math.sin(h));
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(fwd, up), up, fwd.negate()));
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), rad(bank)));
  }
  const bezier = (p0, p1, p2, p3, t) => {
    const it = 1 - t;
    return p0.clone().multiplyScalar(it * it * it).addScaledVector(p1, 3 * it * it * t).addScaledVector(p2, 3 * it * t * t).addScaledVector(p3, t * t * t);
  };
  const eye = RIDE.height + LIFT, along = a => left + a, across = c => topEdge + c;
  const start = V(along(RIDE.from), eye, across(RIDE.inset)), end = V(along(RIDE.to), eye, across(RIDE.inset));
  const landing = V(along(RIDE.drop[0]), LIFT + RIDE.land, across(RIDE.drop[1]));
  // the skate accelerates evenly, from 0.6x its average speed to 1.4x
  const Ts = times.swoopEnd - times.hand, Tk = times.dropStart - times.swoopEnd, Td = times.dropEnd - times.dropStart;
  const D = RIDE.to - RIDE.from, v0 = (0.6 * D) / Tk, v1 = (1.4 * D) / Tk;   // CSS px per second
  // the stage's push-in, as a camera coming straight down: where it is at the cut, and how fast
  const hand = orbitPose(THREE, hv.target, 0, Math.PI / 2, hv.dist);
  const before = handoverView(THREE, approach), from = before.target.clone().setY(before.dist);
  const descent = hand.pos.clone().sub(from).divideScalar(approach.dt);
  const HAND = [-90, 90];                                           // heading, pitch: the stage's view
  if (orient(...HAND).angleTo(hand.q) > 1e-6) throw new Error('the 3D camera at the cut is not the stage camera');
  // The swoop carries on down at the push-in's speed, turning as it goes (the Paddock wheels
  // round under it), then tilts up to look along the tile as it levels out behind the edge and
  // meets the skate at its speed. The drop leaves at the skate's last speed, runs on toward the
  // white end before tipping over into it, and lands softly.
  const swoop = [hand.pos, hand.pos.clone().addScaledVector(descent, Ts / 3), start.clone().add(V((-v0 * Ts) / 3, 0, 0)), start];
  const dive = [end, end.clone().add(V((v1 * Td) / 3, 0, 0)), landing.clone().add(V(0, 10, 0)), landing];
  const easeOut = x => x * (1 + x - x * x);                          // 0 -> 1, speed 1 -> 0
  function poseAt(u) {
    let pos, heading, pitch, bank = 0, fov;
    if (u <= times.swoopEnd) {                                       // swoop down onto the edge
      const x = prog(u, times.hand, times.swoopEnd);
      pos = bezier(...swoop, x);
      heading = lerp(HAND[0], RIDE.yaw, smooth(prog(x, 0, 0.75)));
      pitch = lerp(HAND[1], RIDE.pitch, smooth(prog(x, 0.3, 0.95)));
      fov = lerp(FOV, RIDE.fov, smooth(prog(x, 0.45, 1)));
    } else if (u <= times.dropStart) {                               // skate the edge
      const t = prog(u, times.swoopEnd, times.dropStart);
      pos = start.clone().setX(start.x + D * (0.6 * t + 0.4 * t * t));
      heading = RIDE.yaw; pitch = RIDE.pitch; bank = RIDE.bank * smooth(t); fov = RIDE.fov;
    } else {                                                         // drop in at the white end
      const x = prog(u, times.dropStart, times.dropEnd), tip = smooth(prog(x, 0.2, 1));
      pos = bezier(...dive, easeOut(x));
      heading = lerp(RIDE.yaw, RIDE.dropYaw, tip); pitch = lerp(RIDE.pitch, RIDE.dropPitch, tip);
      bank = RIDE.bank * (1 - tip); fov = lerp(RIDE.fov, RIDE.dropFov, tip);
    }
    return { pos, q: orient(heading, pitch, bank), fov };
  }
  function pose(cam, u) {
    const { pos, q, fov } = poseAt(u);
    cam.position.copy(pos); cam.quaternion.copy(q);
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }
  /** Where on the canvas the camera is heading at `u`: the zoom blur streams out from there. */
  const probe = camera.clone();
  function heading(u) {
    const dir = poseAt(u + 0.01).pos.sub(poseAt(u - 0.01).pos);
    pose(probe, u);
    const ahead = probe.position.clone().addScaledVector(dir.normalize(), 1000);
    if (dir.lengthSq() === 0 || ahead.clone().applyMatrix4(probe.matrixWorldInverse).z >= 0) return [canvas.width / 2, canvas.height / 2];
    const p = ahead.project(probe);
    return [clamp01((p.x + 1) / 2) * canvas.width, clamp01((1 - p.y) / 2) * canvas.height];
  }

  return {
    canvas,
    /** Draw the section at `u` seconds in; returns the WebGL canvas. */
    render(u) {
      const o = prog(u, times.hand, times.hand + 0.12);             // the parts fade in over the filmed tile
      const lift = eInOut(prog(u, times.hand + 0.04, times.hand + 0.5)), top = LIFT * lift, thick = Math.max(SLAB * lift, 1e-3);
      const dim = lerp(1, 0.35, eInOut(prog(u, times.hand + 0.2, times.swoopEnd)));
      filmed.material.opacity = dim * (1 - eInOut(prog(u, times.hand + 0.1, times.hand + 0.45)));
      vacated.material.opacity = dim * eInOut(prog(u, times.hand + 0.05, times.hand + 0.35));
      // the slab only once the face over it is opaque: its darker top must never show through
      slab.scale.z = thick; slab.position.y = top - thick; slab.material.opacity = prog(u, times.hand + 0.12, times.hand + 0.2);
      face.position.y = top + 0.2; face.material.opacity = o;
      parts.forEach((p, i) => { p.position.y = top + 0.3 + 0.1 * i; p.material.opacity = o; });
      rimGlow.position.y = rim.position.y = top + 0.7;
      rimGlow.material.opacity = 0.5 * lift; rim.material.opacity = 0.85 * lift;
      halo.position.y = top - thick / 2; halo.material.opacity = 0.6 * lift;
      pool.position.y = 0.3; pool.material.opacity = 0.45 * lift;
      shine.position.y = top + 0.25; shine.material.opacity = lift;
      scene.fog.density = 0.0008 * lift;
      pose(camera, u);
      renderer.render(scene, camera);
      return canvas;
    },
    /** The zoom blur for the stage: building through the skate, gone as the camera lands. */
    blur: u => 0.75 * smooth(prog(u, times.swoopEnd - 0.15, times.swoopEnd + 0.35)) * (1 - smooth(prog(u, times.dropStart + 0.15, times.dropEnd))),
    /** Its centre, canvas px: where the camera is heading. */
    blurAt: heading,
    info: { handDist: hv.dist, clear, v0, v1, descent: descent.toArray() },
  };
}
