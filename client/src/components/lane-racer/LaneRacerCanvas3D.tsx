import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Difficulty } from '@/lib/gameLogic';
import type { TeamId } from '@/lib/carSvgs';
import {
  LaneRacerController3D,
  type LaneRacerEngineCallbacks,
  type LaneRacerEngineRef,
} from '@/lib/laneRacerController3d';
import { LaneRacerSceneKeyed } from './LaneRacerScene';

interface LaneRacerCanvas3DProps {
  callbacks: LaneRacerEngineCallbacks;
  totalQuestions: number;
  teamId: TeamId;
  difficulty: Difficulty;
}

function SceneRoot({
  controller,
  teamId,
  structureVersion,
}: {
  controller: LaneRacerController3D;
  teamId: TeamId;
  structureVersion: number;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    controller.tick(delta);
    const shake = controller.renderState.shakeMagnitude;
    if (shake > 0) {
      camera.position.set(
        (Math.random() - 0.5) * shake,
        3.8 + (Math.random() - 0.5) * shake,
        10 + (Math.random() - 0.5) * shake * 0.5,
      );
    } else {
      camera.position.set(0, 3.8, 10);
    }
    camera.lookAt(0, 0.2, -6);
  });

  return <LaneRacerSceneKeyed controller={controller} teamId={teamId} structureVersion={structureVersion} />;
}

function HudOverlay({ controller }: { controller: LaneRacerController3D }) {
  const flashRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;
    const update = () => {
      const rs = controller.renderState;
      if (speedRef.current) {
        speedRef.current.textContent = String(rs.speedKmh);
      }
      if (flashRef.current) {
        if (rs.flashColor && rs.flashAlpha > 0) {
          flashRef.current.style.opacity = String(rs.flashAlpha);
          flashRef.current.style.background =
            rs.flashColor === 'green'
              ? `rgba(34,255,120,${rs.flashAlpha * 0.35})`
              : `rgba(225,6,0,${rs.flashAlpha * 0.35})`;
          flashRef.current.style.display = 'block';
        } else {
          flashRef.current.style.display = 'none';
        }
      }
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [controller]);

  return (
    <>
      <div ref={flashRef} className="absolute inset-0 pointer-events-none" style={{ display: 'none' }} />
      <div
        className="absolute right-3 text-right pointer-events-none"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="text-[10px] text-white/60 uppercase tracking-widest" style={{ fontFamily: 'Oxanium, sans-serif' }}>
          km/h
        </div>
        <div ref={speedRef} className="text-2xl font-bold text-white" style={{ fontFamily: 'Oxanium, sans-serif' }}>
          120
        </div>
      </div>
    </>
  );
}

export const LaneRacerCanvas3D = forwardRef<LaneRacerEngineRef, LaneRacerCanvas3DProps>(
  function LaneRacerCanvas3D({ callbacks, totalQuestions, teamId, difficulty }, ref) {
    const controller = useMemo(
      () => new LaneRacerController3D(callbacks, totalQuestions, difficulty),
      [callbacks, totalQuestions, difficulty],
    );
    const controllerRef = useRef(controller);
    controllerRef.current = controller;
    const [structureVersion, setStructureVersion] = useState(0);

    useEffect(() => {
      controller.setStructureChangeListener(() => setStructureVersion(v => v + 1));
      controller.start();
      return () => {
        controller.destroy();
        controller.setStructureChangeListener(null);
      };
    }, [controller]);

    useImperativeHandle(ref, () => ({
      moveLeft: () => controllerRef.current.moveLeft(),
      moveRight: () => controllerRef.current.moveRight(),
      spawnTokens: (correct, wrong) => controllerRef.current.spawnTokens(correct, wrong),
      needsTokens: () => controllerRef.current.needsTokens(),
      isFinished: () => controllerRef.current.isFinished(),
      pause: () => controllerRef.current.pause(),
      resume: () => controllerRef.current.resume(),
      destroy: () => controllerRef.current.destroy(),
      setSafeBottomInset: (px) => controllerRef.current.setSafeBottomInset(px),
    }), []);

    return (
      <div className="relative w-full h-full bg-[#2a5230]">
        <Canvas
          className="w-full h-full block"
          gl={{ antialias: true, alpha: false }}
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
          camera={{ position: [0, 3.8, 10], fov: 50, near: 0.1, far: 250 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#2a5230');
          }}
        >
          <SceneRoot controller={controller} teamId={teamId} structureVersion={structureVersion} />
        </Canvas>
        <HudOverlay controller={controller} />
      </div>
    );
  },
);
