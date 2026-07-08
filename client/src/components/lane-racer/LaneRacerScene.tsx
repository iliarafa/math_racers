import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { TeamId } from '@/lib/carSvgs';
import { TEAMS } from '@/lib/carSvgs';
import {
  LaneRacerController3D,
  laneXForIndex,
} from '@/lib/laneRacerController3d';

const ROAD_WIDTH = 7.2;
const ROAD_LENGTH = 180;
const KERB_W = 0.38;
const GROUND_SIZE = 600;
const SKY_BLUE = '#87CEEB';
const GRASS_GREEN = '#2a5230';

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function teamColor(teamId: TeamId): string {
  return TEAMS.find(t => t.id === teamId)?.color ?? '#00d2be';
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
        <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
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

function Sky() {
  return (
    <mesh frustumCulled={false}>
      <sphereGeometry args={[220, 24, 12]} />
      <meshBasicMaterial color={SKY_BLUE} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} renderOrder={0}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshBasicMaterial color={GRASS_GREEN} fog={false} />
    </mesh>
  );
}

function Road({ controller }: { controller: LaneRacerController3D }) {
  const kerbTex = useMemo(() => makeKerbTexture(), []);
  const scrollGroupRef = useRef<THREE.Group>(null);

  const asphaltTex = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const b = 50 + Math.floor(Math.random() * 35);
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
  const DASH_PERIOD = 3;

  useFrame(() => {
    if (!scrollGroupRef.current) return;
    // Same world-space scroll as answer tokens — one delta, all geometry moves together
    scrollGroupRef.current.position.z = mod(controller.renderState.worldScrollZ, DASH_PERIOD);
  });

  return (
    <group ref={scrollGroupRef} renderOrder={1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, roadCenterZ]}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial map={asphaltTex} color="#ffffff" roughness={0.95} metalness={0} fog={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 + 0.06, 0.02, roadCenterZ]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ffffff" fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.06, 0.02, roadCenterZ]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#ffffff" fog={false} />
      </mesh>

      {[-ROAD_WIDTH / 6, ROAD_WIDTH / 6].map((x, idx) => (
        <group key={idx} position={[x, 0, roadCenterZ]}>
          {Array.from({ length: Math.ceil(ROAD_LENGTH / 3) }, (_, i) => (
            <mesh
              key={i}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.025, -ROAD_LENGTH / 2 + i * 3 + 1.5]}
            >
              <planeGeometry args={[0.1, 1.6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.55} fog={false} />
            </mesh>
          ))}
        </group>
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

  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.9, 0.35, 1.8]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} fog={false} />
      </mesh>
      <mesh position={[0, 0.55, -0.1]}>
        <boxGeometry args={[0.5, 0.15, 0.6]} />
        <meshStandardMaterial color="#111111" fog={false} />
      </mesh>
      <mesh position={[0, 0.15, -1.05]}>
        <boxGeometry args={[1.4, 0.08, 0.25]} />
        <meshStandardMaterial color="#222222" fog={false} />
      </mesh>
      <mesh position={[0, 0.75, 0.85]}>
        <boxGeometry args={[1.1, 0.06, 0.2]} />
        <meshStandardMaterial color="#222222" fog={false} />
      </mesh>
      {([-0.55, 0.55] as const).map(sx => (
        <group key={sx}>
          <mesh position={[sx, 0.18, -0.55]}>
            <boxGeometry args={[0.22, 0.36, 0.5]} />
            <meshStandardMaterial color="#111111" fog={false} />
          </mesh>
          <mesh position={[sx, 0.18, 0.55]}>
            <boxGeometry args={[0.24, 0.4, 0.55]} />
            <meshStandardMaterial color="#111111" fog={false} />
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
  const rs = controller.renderState;

  return (
    <>
      <color attach="background" args={[GRASS_GREEN]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 14, 10]} intensity={0.9} castShadow={false} />

      <Sky />
      <Ground />
      <Road controller={controller} />

      <AnimatedTokens controller={controller} />
      <AnimatedPlayerCar controller={controller} teamId={teamId} />
      <Particles controller={controller} />

      {rs.popupAlpha > 0 && (
        <Text
          position={[0, 3.5, -8]}
          fontSize={1.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fillOpacity={Math.min(1, rs.popupAlpha * 2)}
        >
          {rs.popupLabel}
        </Text>
      )}
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
