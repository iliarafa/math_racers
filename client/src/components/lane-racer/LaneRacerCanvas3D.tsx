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
import { isNativePlatform } from '@/lib/purchases';
import { FOG_COLOR } from './atmosphere';
import { LaneRacerSceneKeyed } from './LaneRacerScene';

interface LaneRacerCanvas3DProps {
  callbacks: LaneRacerEngineCallbacks;
  totalQuestions: number;
  teamId: TeamId;
  difficulty: Difficulty;
  /** When true, game loop holds (used to prime WebGL under starting lights). */
  paused?: boolean;
}

/** Soft lateral chase is native (Capacitor) only — browser/web keeps a fixed center cam. */
const NATIVE_SOFT_FOLLOW = isNativePlatform();

function SceneRoot({
  controller,
  teamId,
  structureVersion,
  softFollow,
}: {
  controller: LaneRacerController3D;
  teamId: TeamId;
  structureVersion: number;
  softFollow: boolean;
}) {
  const { camera } = useThree();
  /** Skip first frame: Canvas mounts mid-race with default lookAt + a spiked delta. */
  const primedRef = useRef(false);
  /** Soft lateral chase so side lanes stay framed on portrait without widening FOV. */
  const camXRef = useRef(0);
  const softFollowRef = useRef(softFollow);
  softFollowRef.current = softFollow;

  useFrame((_, delta) => {
    const carX = controller.renderState.carX;
    const followEnabled = softFollowRef.current;

    if (!primedRef.current) {
      primedRef.current = true;
      const startX = followEnabled ? carX : 0;
      camXRef.current = startX;
      camera.position.set(startX, 3.6, 8.2);
      camera.lookAt(startX, 0.45, 0.2);
      return;
    }

    controller.tick(delta);

    let cx: number;
    if (followEnabled) {
      // Framerate-independent ease — keeps the car framed; slight lag feels chase-like
      const follow = 1 - Math.exp(-10 * Math.min(delta, 0.05));
      camXRef.current += (carX - camXRef.current) * follow;
      cx = camXRef.current;
    } else {
      camXRef.current = 0;
      cx = 0;
    }

    const shake = controller.renderState.shakeMagnitude;
    // Slightly elevated rear chase — matches the F1 rear-view reference framing
    if (shake > 0) {
      camera.position.set(
        cx + (Math.random() - 0.5) * shake,
        3.6 + (Math.random() - 0.5) * shake,
        8.2 + (Math.random() - 0.5) * shake * 0.5,
      );
    } else {
      camera.position.set(cx, 3.6, 8.2);
    }
    camera.lookAt(cx, 0.45, 0.2);
  });

  return <LaneRacerSceneKeyed controller={controller} teamId={teamId} structureVersion={structureVersion} />;
}

function HudOverlay({ controller }: { controller: LaneRacerController3D }) {
  const flashRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
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
          const a = rs.flashAlpha;
          // Match 2D: soft radial green near the car, not a solid full-screen wash
          flashRef.current.style.opacity = '1';
          flashRef.current.style.background =
            rs.flashColor === 'green'
              ? `radial-gradient(ellipse at 50% 80%, rgba(34,255,120,${a * 0.5}) 0%, rgba(34,255,120,0) 70%)`
              : `rgba(225,6,0,${a * 0.35})`;
          flashRef.current.style.display = 'block';
        } else {
          flashRef.current.style.display = 'none';
        }
      }
      if (popupRef.current) {
        if (rs.popupAlpha > 0 && rs.popupLabel) {
          const t = rs.popupAlpha;
          const rise = (1 - t) * 20;
          popupRef.current.textContent = rs.popupLabel;
          popupRef.current.style.opacity = String(Math.min(1, t * 2));
          popupRef.current.style.transform = `translate(-50%, calc(-50% - ${rise}px))`;
          popupRef.current.style.display = 'block';
        } else {
          popupRef.current.style.display = 'none';
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
        ref={popupRef}
        className="absolute left-1/2 top-[34%] pointer-events-none whitespace-nowrap"
        style={{
          display: 'none',
          fontFamily: 'Oxanium, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(1.5rem, 9vw, 2.75rem)',
          color: '#ffffff',
          textShadow: '0 2px 12px rgba(0,0,0,0.55)',
          letterSpacing: '0.04em',
        }}
      />
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
  function LaneRacerCanvas3D({ callbacks, totalQuestions, teamId, difficulty, paused = false }, ref) {
    const softFollow = NATIVE_SOFT_FOLLOW;
    // Do not remount when Adaptive pace steps mid-race — apply via setPaceDifficulty.
    const controller = useMemo(
      () => new LaneRacerController3D(callbacks, totalQuestions, difficulty),
      [callbacks, totalQuestions],
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

    // Sync pace from parent for Locked start / rival HUD updates.
    // Mid-Adaptive steps are also applied in spawnQuestion via setPaceDifficulty;
    // calling twice is harmless (snaps to series base) and must not remount.
    useEffect(() => {
      controller.setPaceDifficulty(difficulty);
    }, [difficulty, controller]);

    useEffect(() => {
      if (paused) controller.pause();
      else controller.resume();
    }, [paused, controller]);

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
      setPaceDifficulty: (d) => controllerRef.current.setPaceDifficulty(d),
    }), []);

    return (
      <div className="relative w-full h-full" style={{ backgroundColor: FOG_COLOR }}>
        <Canvas
          className="w-full h-full block"
          gl={{ antialias: true, alpha: false }}
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
          camera={{ position: [0, 3.6, 8.2], fov: 48, near: 0.1, far: 600 }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(FOG_COLOR);
            camera.position.set(0, 3.6, 8.2);
            camera.lookAt(0, 0.45, 0.2);
          }}
        >
          <SceneRoot
            controller={controller}
            teamId={teamId}
            structureVersion={structureVersion}
            softFollow={softFollow}
          />
        </Canvas>
        <HudOverlay controller={controller} />
      </div>
    );
  },
);
