// What the reel's 3D sections share: the WebGL view, the filmed phone screen as the ground, and
// the camera poses that take over from the stage's flat view.
//
// World units are the phone screen's CSS px, origin at the screen centre, y up. The ground is
// the screen itself (393 x 852) lying flat, textured with a filmed frame, so a camera looking
// straight down reproduces the stage's 2D view of it exactly (handoverView): the cut to 3D can't
// be seen.

export const SCREEN = { w: 393, h: 852 };
export const W = 1080, H = 1920;
export const FOV = 40;

export const clamp01 = x => Math.min(1, Math.max(0, x));
export const prog = (u, a, b) => clamp01((u - a) / (b - a));
export const eInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eOut = x => 1 - Math.pow(1 - x, 3);
export const smooth = x => x * x * (3 - 2 * x);
export const lerp = (a, b, t) => a + (b - a) * t;

/** A 1080 x 1920 WebGL canvas with its renderer, a scene (fog off until set) and a camera. */
export function createView(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0306, 0);
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 6000);
  return { canvas, renderer, scene, camera };
}

/**
 * A filmed screen frame as the ground, fading out toward the screen's edges. `clear` is what the
 * cut to 3D shows, which must stay fully opaque (world units from the screen centre): |x| up to
 * `x`, and from `top` above the centre to `bottom` below it. The fade runs from there to the edge.
 */
export function groundMesh(THREE, renderer, image, clear) {
  const tex = new THREE.Texture(image); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const fade = (() => {
    const c = document.createElement('canvas'); c.width = SCREEN.w; c.height = SCREEN.h;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height);
    const ex = 196, ez = SCREEN.h / 2;                                   // where the fade reaches 0
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      const wx = xx + 0.5 - SCREEN.w / 2, wz = y + 0.5 - SCREEN.h / 2;
      const ax = 1 - smooth(clamp01((Math.abs(wx) - clear.x) / (ex - clear.x)));
      const az = wz < 0 ? 1 - smooth(clamp01((-wz - clear.top) / (ez - clear.top))) : 1 - smooth(clamp01((wz - clear.bottom) / (ez - clear.bottom)));
      const v = Math.round(255 * ax * az), o = (y * c.width + xx) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  })();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ map: tex, alphaMap: fade, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/**
 * The 3D camera that sees what the stage shows at the cut: straight down (screen-up at the top of
 * the frame) onto `target`, from `dist` above it. `handover` is the stage camera then:
 * { z, fx, fy, ax, ay, K } (see camAt in stage.html).
 */
export function handoverView(THREE, handover) {
  const K = handover.K * handover.z, f = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
  const target = new THREE.Vector3(handover.fx + (W / 2 - handover.ax) / K, 0, handover.fy + (H / 2 - handover.ay) / K);
  return { target, dist: f / K };
}

/** Orbit pose: looking at `target` from azimuth `theta` (0 = screen-up ahead), elevation `phi`. */
export function orbitPose(THREE, target, theta, phi, dist) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const dir = V(Math.sin(theta) * Math.cos(phi), -Math.sin(phi), -Math.cos(theta) * Math.cos(phi));
  const right = V(Math.cos(theta), 0, Math.sin(theta));
  const back = dir.clone().negate(), up = new THREE.Vector3().crossVectors(back, right);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back));
  return { pos: target.clone().addScaledVector(dir, -dist), q };
}
