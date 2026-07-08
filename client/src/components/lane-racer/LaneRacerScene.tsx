import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { TeamId } from '@/lib/carSvgs';
import { TEAMS } from '@/lib/carSvgs';
import {
  LaneRacerController3D,
  laneXForIndex,
} from '@/lib/laneRacerController3d';

const ROAD_WIDTH = 7.2;
/** Long enough that the far tip meets the skyline (past the grass plane edge). */
const ROAD_LENGTH = 420;
const DASH_PERIOD = 3;
const KERB_W = 0.38;
const GROUND_SIZE = 800;
const SKY_RADIUS = 500;
const GRASS_GREEN = '#2a5230';
/** Zenith / upper sky (deeper). */
const SKY_ZENITH = '#5BA3D0';
/** Near-horizon sky — desaturated blue-green so the join with grass softens. */
const SKY_HORIZON = '#9bb8c4';
/** Linear fog tint — mid mix of grass + horizon sky. */
const FOG_COLOR = '#4a6a5c';
const FOG_NEAR = 32;
const FOG_FAR = 220;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function teamColor(teamId: TeamId): string {
  return TEAMS.find(t => t.id === teamId)?.color ?? '#00d2be';
}

/** Brighten a hex color for accent stripes (clamped). */
function accentColor(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function tokenScale(z: number): number {
  const t = THREE.MathUtils.clamp((z + 48) / 49, 0, 1);
  return THREE.MathUtils.lerp(0.78, 1.0, t);
}

const tokenTextureCache = new Map<number, THREE.CanvasTexture>();

function getAnswerTokenTexture(value: number): THREE.CanvasTexture {
  const cached = tokenTextureCache.get(value);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 112px Oxanium, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  tokenTextureCache.set(value, texture);
  return texture;
}

function AnswerTokenFace({ value }: { value: number }) {
  const texture = useRef(getAnswerTokenTexture(value)).current;
  return (
    <Billboard>
      <mesh renderOrder={10}>
        <planeGeometry args={[1.5, 0.95]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </Billboard>
  );
}

function makeKerbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const stripeH = 8;
  for (let i = 0; i < canvas.height / stripeH; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e10600' : '#ffffff';
    ctx.fillRect(0, i * stripeH, canvas.width, stripeH);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LENGTH / 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** One dash + gap tile, repeated along the full road (2 meshes instead of hundreds). */
function makeLaneDashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  // Match prior dash: ~1.6 of 3.0 period ≈ 53% painted
  const dashH = Math.round(canvas.height * (1.6 / DASH_PERIOD));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, dashH);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LENGTH / DASH_PERIOD);
  // Mipmaps soften far dashes and kill horizon moiré/flicker from NearestFilter
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical gradient for the inside of the sky sphere (v: bottom→top). */
function makeSkyGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  // Canvas y=0 is top of texture → maps toward sphere north (zenith) with default UVs.
  g.addColorStop(0, SKY_ZENITH);
  g.addColorStop(0.55, SKY_HORIZON);
  g.addColorStop(1, '#6a8a78'); // soft ground-side fill if UVs show below horizon
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makeGrassTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = GRASS_GREEN;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const lift = Math.floor(Math.random() * 28) - 10;
    const r = Math.max(0, Math.min(255, 0x2a + lift));
    const g = Math.max(0, Math.min(255, 0x52 + lift));
    const b = Math.max(0, Math.min(255, 0x30 + lift));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1 + (Math.random() > 0.7 ? 1 : 0), 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function Sky() {
  const skyTex = useMemo(() => makeSkyGradientTexture(), []);
  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 24, 12]} />
      <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

function Ground() {
  const grassTex = useMemo(() => makeGrassTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} renderOrder={0}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      {/* Fog ON — distant grass softens into haze */}
      <meshBasicMaterial map={grassTex} toneMapped={false} />
    </mesh>
  );
}

function Road({ controller }: { controller: LaneRacerController3D }) {
  const kerbTex = useMemo(() => makeKerbTexture(), []);
  const dashTex = useMemo(() => makeLaneDashTexture(), []);
  const scrollGroupRef = useRef<THREE.Group>(null);

  const asphaltTex = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5c5c5c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const b = 78 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${b},${b},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, ROAD_LENGTH / 8);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const roadCenterZ = -ROAD_LENGTH / 2 + 20;

  useFrame(() => {
    if (!scrollGroupRef.current) return;
    // Same world-space scroll as answer tokens — one delta, all geometry moves together
    scrollGroupRef.current.position.z = mod(controller.renderState.worldScrollZ, DASH_PERIOD);
  });

  return (
    <group ref={scrollGroupRef} renderOrder={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, roadCenterZ]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial map={asphaltTex} color="#c8c8c8" roughness={0.95} metalness={0} fog={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 + 0.06, 0.02, roadCenterZ]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ffffff" fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.06, 0.02, roadCenterZ]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ffffff" fog={false} />
      </mesh>

      {/* Lane dividers — full-length textured strips so dashes reach the horizon */}
      {[-ROAD_WIDTH / 6, ROAD_WIDTH / 6].map((x, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, roadCenterZ]}>
          <planeGeometry args={[0.14, ROAD_LENGTH]} />
          <meshBasicMaterial
            map={dashTex}
            transparent
            opacity={0.85}
            toneMapped={false}
            fog={false}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}

      {/* Kerbs — single textured strip per side (flat paint, scrolls with road) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 - KERB_W / 2, 0.022, roadCenterZ]}>
        <planeGeometry args={[KERB_W, ROAD_LENGTH]} />
        <meshBasicMaterial map={kerbTex} toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 + KERB_W / 2, 0.022, roadCenterZ]}>
        <planeGeometry args={[KERB_W, ROAD_LENGTH]} />
        <meshBasicMaterial map={kerbTex} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

function PlayerCar({ teamId }: { teamId: TeamId }) {
  const color = teamColor(teamId);
  const accent = accentColor(color, 0.45);
  // Reference rear view: tires pure black; wing/diffuser carbon; body team color
  const graphite = '#2a2a2a';
  const carbon = '#3d3d3d';
  const rim = '#5a5a5a';
  const tire = '#0a0a0a';
  const bodyMat = { metalness: 0.45, roughness: 0.35 } as const;
  const darkMat = { metalness: 0.35, roughness: 0.45 } as const;

  return (
    <group>
      {/* Front half (less critical from chase cam) */}
      <mesh position={[0, 0.045, -0.2]}>
        <boxGeometry args={[0.45, 0.03, 1.0]} />
        <meshStandardMaterial color={carbon} metalness={0.25} roughness={0.75} fog={false} />
      </mesh>
      <mesh position={[0, 0.26, 0.0]}>
        <boxGeometry args={[0.42, 0.24, 0.9]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.28, -0.55]}>
        <boxGeometry args={[0.32, 0.18, 0.4]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.2, -0.9]}>
        <boxGeometry args={[0.22, 0.12, 0.35]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.16, -1.15]}>
        <boxGeometry args={[0.12, 0.08, 0.2]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      {/* Front wing — darker + slight pitch so it doesn't read as sitting on the rear wing */}
      <mesh position={[0, 0.1, -1.32]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.3, 0.035, 0.18]} />
        <meshBasicMaterial color="#141414" toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[-0.62, 0.16, -1.3]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.18, 0.2]} />
        <meshBasicMaterial color="#141414" toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.62, 0.16, -1.3]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.18, 0.2]} />
        <meshBasicMaterial color="#141414" toneMapped={false} fog={false} />
      </mesh>
      {([-0.58, 0.58] as const).map((sx) => (
        <group key={`fw-${sx}`} position={[sx, 0.17, -0.55]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.26, 12]} />
            <meshStandardMaterial color={tire} metalness={0.05} roughness={0.95} fog={false} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.28, 10]} />
            <meshStandardMaterial color={rim} metalness={0.5} roughness={0.4} fog={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.28, 0.18, -0.55]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.4, 0.02, 0.025]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.28, 0.18, -0.55]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.4, 0.02, 0.025]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>

      <mesh position={[-0.42, 0.2, 0.05]}>
        <boxGeometry args={[0.32, 0.2, 0.65]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0.42, 0.2, 0.05]}>
        <boxGeometry args={[0.32, 0.2, 0.65]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>

      <mesh position={[0, 0.4, -0.05]}>
        <boxGeometry args={[0.32, 0.12, 0.4]} />
        <meshStandardMaterial color={graphite} {...darkMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.55, -0.05]}>
        <boxGeometry args={[0.36, 0.04, 0.36]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.48, -0.18]}>
        <boxGeometry args={[0.05, 0.16, 0.05]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>

      {/* REAR END — matched to chase-cam F1 reference */}
      <mesh position={[0, 0.36, 0.4]}>
        <boxGeometry args={[0.28, 0.28, 0.55]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.32, 0.7]}>
        <boxGeometry args={[0.2, 0.2, 0.25]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0, 0.58, 0.25]}>
        <boxGeometry args={[0.16, 0.2, 0.2]} />
        <meshBasicMaterial color={color} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.7, 0.25]}>
        <boxGeometry args={[0.1, 0.06, 0.12]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>

      <mesh position={[-0.28, 0.28, 0.55]}>
        <boxGeometry args={[0.28, 0.28, 0.35]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[0.28, 0.28, 0.55]}>
        <boxGeometry args={[0.28, 0.28, 0.35]} />
        <meshStandardMaterial color={color} {...bodyMat} fog={false} />
      </mesh>
      <mesh position={[-0.28, 0.32, 0.72]}>
        <boxGeometry args={[0.2, 0.14, 0.04]} />
        <meshBasicMaterial color={accent} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.28, 0.32, 0.72]}>
        <boxGeometry args={[0.2, 0.14, 0.04]} />
        <meshBasicMaterial color={accent} toneMapped={false} fog={false} />
      </mesh>

      <mesh position={[0, 0.22, 0.85]}>
        <boxGeometry args={[0.35, 0.28, 0.28]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.28, 1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.08, 10]} />
        <meshBasicMaterial color="#111111" toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.28, 1.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 10]} />
        <meshBasicMaterial color="#222222" toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.42, 0.98]}>
        <boxGeometry args={[0.06, 0.04, 0.04]} />
        <meshBasicMaterial color="#f0f0f0" toneMapped={false} fog={false} />
      </mesh>

      {/* Diffuser — raised clear of the road (~axle height), thin vanes */}
      <mesh position={[0, 0.14, 0.9]}>
        <boxGeometry args={[0.8, 0.03, 0.22]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      {[-0.28, -0.14, 0, 0.14, 0.28].map((x) => (
        <mesh key={`diff-${x}`} position={[x, 0.18, 0.92]}>
          <boxGeometry args={[0.025, 0.08, 0.2]} />
          <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
        </mesh>
      ))}

      {/*
        Rear wing — every thickness ≤ ~0.04 (≈3–4").
        Top plane sits just above short pylons (small air gap), not sky-high.
        Endplates are thin sheets (X thickness), not thick blocks.
      */}
      {/* Short base pylons */}
      <mesh position={[-0.12, 0.42, 0.88]}>
        <boxGeometry args={[0.03, 0.2, 0.035]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.12, 0.42, 0.88]}>
        <boxGeometry args={[0.03, 0.2, 0.035]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      {/* Thin swan-necks — bridge small gap to floating wing */}
      <mesh position={[-0.12, 0.58, 0.9]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.022, 0.14, 0.022]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.12, 0.58, 0.9]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.022, 0.14, 0.022]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      {/* Endplates — thin in X (≤0.04), modest height, slight toe for face read */}
      <mesh position={[-0.5, 0.72, 0.96]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.035, 0.28, 0.16]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.5, 0.72, 0.96]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.035, 0.28, 0.16]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      {/* Main plane — thin, lower, separate from pylons */}
      <mesh position={[0, 0.82, 0.98]}>
        <boxGeometry args={[0.95, 0.028, 0.09]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      {/* DRS flap — separate thin element just above */}
      <mesh position={[0, 0.88, 0.95]}>
        <boxGeometry args={[0.85, 0.022, 0.06]} />
        <meshBasicMaterial color="#1a1a1a" toneMapped={false} fog={false} />
      </mesh>

      <mesh position={[-0.35, 0.28, 0.55]} rotation={[0, 0.2, -0.25]}>
        <boxGeometry args={[0.45, 0.025, 0.03]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.35, 0.28, 0.55]} rotation={[0, -0.2, 0.25]}>
        <boxGeometry args={[0.45, 0.025, 0.03]} />
        <meshBasicMaterial color={carbon} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[-0.35, 0.18, 0.62]} rotation={[0, 0.15, -0.2]}>
        <boxGeometry args={[0.42, 0.02, 0.025]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0.35, 0.18, 0.62]} rotation={[0, -0.15, 0.2]}>
        <boxGeometry args={[0.42, 0.02, 0.025]} />
        <meshBasicMaterial color={graphite} toneMapped={false} fog={false} />
      </mesh>

      {/* REAR TIRES — hero of the reference: wide, tall, pure black */}
      {([-0.68, 0.68] as const).map((sx) => (
        <group key={`rw-${sx}`} position={[sx, 0.22, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.26, 0.26, 0.38, 14]} />
            <meshStandardMaterial color={tire} metalness={0.05} roughness={0.95} fog={false} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.4, 12]} />
            <meshStandardMaterial color={rim} metalness={0.45} roughness={0.45} fog={false} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.42, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AnimatedTokens({ controller }: { controller: LaneRacerController3D }) {
  const groupsRef = useRef<Map<number, THREE.Group>>(new Map());

  useFrame(() => {
    const rs = controller.renderState;
    const activeIds = new Set(rs.tokens.map(t => t.id));

    for (const [id, group] of Array.from(groupsRef.current.entries())) {
      if (!activeIds.has(id)) {
        group.visible = false;
      }
    }

    for (const token of rs.tokens) {
      const group = groupsRef.current.get(token.id);
      if (!group) continue;
      const scale = tokenScale(token.z);
      group.visible = true;
      group.position.set(laneXForIndex(token.lane), 0.65 * scale + 0.35, token.z);
      group.scale.setScalar(scale);
    }
  });

  return (
    <>
      {controller.renderState.tokens.map(token => (
        <group
          key={token.id}
          ref={(el) => {
            if (el) groupsRef.current.set(token.id, el);
            else groupsRef.current.delete(token.id);
          }}
        >
          <AnswerTokenFace value={token.value} />
        </group>
      ))}
    </>
  );
}

function AnimatedPlayerCar({ controller, teamId }: { controller: LaneRacerController3D; teamId: TeamId }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const rs = controller.renderState;
    if (!groupRef.current) return;
    groupRef.current.position.set(laneXForIndex(rs.carLaneVisual), 0, 1.2);
    groupRef.current.scale.setScalar(rs.carPunchScale);
  });

  return (
    <group ref={groupRef}>
      <PlayerCar teamId={teamId} />
    </group>
  );
}

function Particles({ controller }: { controller: LaneRacerController3D }) {
  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    const particles = controller.renderState.particles;
    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.position.set(p.x, p.y, p.z);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life / p.maxLife);
      mesh.visible = mat.opacity > 0;
    });
  });

  return (
    <>
      {controller.renderState.particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={[p.x, p.y, p.z]}
        >
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshBasicMaterial color={p.color} transparent opacity={1} fog={false} />
        </mesh>
      ))}
    </>
  );
}

interface LaneRacerSceneProps {
  controller: LaneRacerController3D;
  teamId: TeamId;
}

export function LaneRacerScene({ controller, teamId }: LaneRacerSceneProps) {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[4, 16, 8]} intensity={1.15} castShadow={false} />
      <directionalLight position={[-6, 8, 4]} intensity={0.35} castShadow={false} />

      <Sky />
      <Ground />
      <Road controller={controller} />

      <AnimatedTokens controller={controller} />
      <AnimatedPlayerCar controller={controller} teamId={teamId} />
      <Particles controller={controller} />
    </>
  );
}

export function LaneRacerSceneKeyed({
  controller,
  teamId,
  structureVersion,
}: LaneRacerSceneProps & { structureVersion: number }) {
  void structureVersion;
  return <LaneRacerScene controller={controller} teamId={teamId} />;
}
