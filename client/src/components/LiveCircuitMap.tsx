import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Circuit } from '@/lib/gameLogic';
import { RACE_LENGTH } from '@/lib/gameLogic';
import {
  SECTOR_STROKE,
  getCircuitMapMeta,
  type SectorColor,
} from '@/lib/circuitPaths';
import { cn } from '@/lib/utils';

export type LiveCircuitSector = {
  sectorColor: SectorColor;
};

type CarPose = { x: number; y: number; angle: number };

interface LiveCircuitMapProps {
  circuit: Circuit | { id: string; name?: string; paths?: Circuit['paths'] } | null;
  progress: number;
  rivalProgress?: number;
  raceLength: number;
  sectorResults: Array<LiveCircuitSector | undefined | null>;
  rivalSectorResults?: Array<{ sectorColor: SectorColor } | undefined | null>;
  showRival?: boolean;
  currentSectorRed?: boolean;
  overtakeActive?: boolean;
  aeroActive?: boolean;
  isWet?: boolean;
  /** Larger static presentation for finish / debrief screens */
  variant?: 'hud' | 'results';
  className?: string;
  labelLeft?: ReactNode;
  labelRight?: ReactNode;
  labelRightClassName?: string;
  playerLabel?: string;
  rivalLabel?: string;
  /** When true, skip under-stage Lap/Limits row (parent renders it elsewhere). */
  hideFooter?: boolean;
}

const CAR_MOVE_MS = 340;
/** Inset from outer contour toward track center (viewBox units). */
const CENTERLINE_INSET = 5.5;

/**
 * One tour of the circuit silhouette is divided into `race length in laps`
 * sectors (capped at standard RACE_LENGTH=20). Longer sessions wrap: the car
 * starts a second/third lap instead of slicing the map into 44/78/100 pieces.
 */
export function getMapLapLength(raceLength: number): number {
  return Math.min(Math.max(1, raceLength), RACE_LENGTH);
}

/** Lap / progress label used under the map or beside the keypad level row. */
export function formatMapLapLabel(progress: number, raceLength: number): string {
  const { circuitLap, totalCircuitLaps } = getMapLapState(progress, raceLength);
  if (totalCircuitLaps > 1) {
    return `Lap ${circuitLap}/${totalCircuitLaps} · ${Math.min(progress + 1, raceLength)}/${raceLength}`;
  }
  return `Lap ${Math.min(progress + 1, raceLength)}/${raceLength}`;
}

type MapLapState = {
  /** 1-based tour of the circuit outline */
  circuitLap: number;
  totalCircuitLaps: number;
  /** Completed sectors on the current tour (0 .. mapLapLength) */
  sectorOnLap: number;
  /** Index into sectorResults for the start of this tour */
  lapStart: number;
  /** 0..1 position along the path */
  t: number;
  /** Continuous progress across tours — eases across integer boundaries for lap wrap */
  absoluteT: number;
  mapLapLength: number;
};

function getMapLapState(progress: number, raceLength: number): MapLapState {
  const mapLapLength = getMapLapLength(raceLength);
  const totalCircuitLaps = Math.max(1, Math.ceil(raceLength / mapLapLength));
  const clamped = Math.max(0, Math.min(progress, raceLength));

  if (clamped >= raceLength && raceLength > 0) {
    const rem = raceLength % mapLapLength;
    const sectorOnLap = rem === 0 ? mapLapLength : rem;
    const lapStart = raceLength - sectorOnLap;
    const t = sectorOnLap / mapLapLength;
    const circuitLap = totalCircuitLaps;
    return {
      circuitLap,
      totalCircuitLaps,
      sectorOnLap,
      lapStart,
      t,
      absoluteT: circuitLap - 1 + t,
      mapLapLength,
    };
  }

  const lapStart = Math.floor(clamped / mapLapLength) * mapLapLength;
  const sectorOnLap = clamped - lapStart;
  const t = sectorOnLap / mapLapLength;
  const circuitLap = Math.floor(clamped / mapLapLength) + 1;
  return {
    circuitLap,
    totalCircuitLaps,
    sectorOnLap,
    lapStart,
    t,
    absoluteT: circuitLap - 1 + t,
    mapLapLength,
  };
}

function easeOutCubic(u: number): number {
  return 1 - (1 - u) ** 3;
}

function unwrapAngle(prevDeg: number, nextDeg: number): number {
  let delta = nextDeg - prevDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return prevDeg + delta;
}

/** Path parameter in [0, 1]; treat exact integers > 0 as 1 (finish line) before modulo. */
function pathParam(absoluteT: number): number {
  if (absoluteT <= 0) return 0;
  const frac = absoluteT % 1;
  if (frac < 1e-6 && absoluteT > 0) return 1;
  return frac;
}

function readPoseOnTrack(
  path: SVGPathElement,
  absoluteT: number,
  inset: number,
  center: { x: number; y: number },
  prevAngle: number
): CarPose {
  const len = path.getTotalLength();
  if (len <= 0) return { x: center.x, y: center.y, angle: prevAngle };

  const u = pathParam(absoluteT);
  const dist = Math.min(len, Math.max(0, u * len));
  const p = path.getPointAtLength(dist);

  const delta = Math.max(2.5, len * 0.01);
  const p0 = path.getPointAtLength(Math.max(0, dist - delta * 0.5));
  const p1 = path.getPointAtLength(Math.min(len, dist + delta * 0.5));
  const tx = p1.x - p0.x;
  const ty = p1.y - p0.y;
  const tl = Math.hypot(tx, ty) || 1;
  const nx = -ty / tl;
  const ny = tx / tl;

  // Pick the normal that points toward the circuit center (centerline of the stroke)
  const toCx = center.x - p.x;
  const toCy = center.y - p.y;
  const sign = nx * toCx + ny * toCy >= 0 ? 1 : -1;

  const rawAngle = (Math.atan2(ty, tx) * 180) / Math.PI;
  const angle = unwrapAngle(prevAngle, rawAngle);

  return {
    x: p.x + nx * inset * sign,
    y: p.y + ny * inset * sign,
    angle,
  };
}

function usePathCar(
  pathRef: RefObject<SVGPathElement | null>,
  targetAbsoluteT: number,
  inset: number,
  center: { x: number; y: number },
  pathKey: string,
  enabled: boolean
): CarPose {
  const [pose, setPose] = useState<CarPose>({ x: center.x, y: center.y, angle: 0 });
  const displayAbs = useRef(targetAbsoluteT);
  const angleRef = useRef(0);
  const animRef = useRef<{ from: number; to: number; start: number } | null>(null);
  const rafRef = useRef(0);

  // Reset when circuit path changes
  useLayoutEffect(() => {
    displayAbs.current = targetAbsoluteT;
    animRef.current = null;
    angleRef.current = 0;
    const path = pathRef.current;
    if (!path || !enabled) return;
    const next = readPoseOnTrack(path, targetAbsoluteT, inset, center, 0);
    angleRef.current = next.angle;
    setPose(next);
  }, [pathKey, enabled]); // path geometry change only — not every target tick

  // Kick ease when target moves
  useEffect(() => {
    if (!enabled) return;
    const from = displayAbs.current;
    const to = targetAbsoluteT;
    if (Math.abs(to - from) < 1e-5) return;
    animRef.current = { from, to, start: performance.now() };

    const tick = (now: number) => {
      const path = pathRef.current;
      const anim = animRef.current;
      if (!path) {
        rafRef.current = 0;
        return;
      }

      if (anim) {
        const u = Math.min(1, (now - anim.start) / CAR_MOVE_MS);
        displayAbs.current = anim.from + (anim.to - anim.from) * easeOutCubic(u);
        if (u >= 1) {
          displayAbs.current = anim.to;
          animRef.current = null;
        }
      }

      const next = readPoseOnTrack(path, displayAbs.current, inset, center, angleRef.current);
      angleRef.current = next.angle;
      setPose(next);

      if (animRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [targetAbsoluteT, enabled, pathRef, inset, center.x, center.y]);

  return pose;
}

function CarMarker({
  pose,
  color,
  accent,
  size = 1,
  pulse,
}: {
  pose: CarPose;
  color: string;
  accent: string;
  size?: number;
  pulse?: boolean;
}) {
  const w = 11 * size;
  const h = 5.5 * size;
  return (
    <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle})`}>
      {pulse && (
        <ellipse
          cx={0}
          cy={0}
          rx={w * 1.15}
          ry={h * 1.7}
          fill={color}
          opacity={0.4}
          className="animate-pulse"
        />
      )}
      {/* Pointed nose in travel direction (+x) */}
      <polygon
        points={`${w * 0.55},0 ${-w * 0.45},${-h * 0.5} ${-w * 0.45},${h * 0.5}`}
        fill={color}
        stroke={accent}
        strokeWidth={0.85}
        strokeLinejoin="round"
      />
      <rect
        x={-w * 0.2}
        y={-h * 0.22}
        width={w * 0.35}
        height={h * 0.44}
        rx={0.5}
        fill={accent}
        opacity={0.95}
      />
    </g>
  );
}

export function LiveCircuitMap({
  circuit,
  progress,
  rivalProgress = 0,
  raceLength,
  sectorResults,
  rivalSectorResults,
  showRival = false,
  currentSectorRed = false,
  overtakeActive = false,
  aeroActive = false,
  isWet = false,
  variant = 'hud',
  className,
  labelLeft,
  labelRight,
  labelRightClassName,
  hideFooter = false,
}: LiveCircuitMapProps) {
  const meta = useMemo(() => getCircuitMapMeta(circuit), [circuit]);
  const measureRef = useRef<SVGPathElement>(null);
  const center = useMemo(() => ({ x: meta.w / 2, y: meta.h / 2 }), [meta.w, meta.h]);

  const playerLap = useMemo(() => getMapLapState(progress, raceLength), [progress, raceLength]);
  const rivalLap = useMemo(
    () => getMapLapState(rivalProgress, raceLength),
    [rivalProgress, raceLength]
  );
  const { mapLapLength } = playerLap;

  const playerPose = usePathCar(
    measureRef,
    playerLap.absoluteT,
    CENTERLINE_INSET,
    center,
    meta.d,
    true
  );
  const rivalPose = usePathCar(
    measureRef,
    rivalLap.absoluteT,
    CENTERLINE_INSET,
    center,
    meta.d,
    showRival
  );

  const lastPurpleOnLap = useMemo(() => {
    for (let i = playerLap.sectorOnLap - 1; i >= 0; i--) {
      if (sectorResults[playerLap.lapStart + i]?.sectorColor === 'purple') return i;
    }
    return -1;
  }, [playerLap.sectorOnLap, playerLap.lapStart, sectorResults]);

  const isResults = variant === 'results';
  const sectorStroke = isResults ? 10 : 8;
  /** Pad viewBox so thick strokes / car near path edges are not clipped. */
  const viewPad = 14;
  const viewBox = `${-viewPad} ${-viewPad} ${meta.w + viewPad * 2} ${meta.h + viewPad * 2}`;
  const defaultLeft = labelLeft ?? formatMapLapLabel(progress, raceLength);
  const circuitName = circuit && 'name' in circuit && circuit.name ? circuit.name : 'Circuit';

  return (
    <div
      className={cn('w-full mx-auto', isResults ? 'max-w-md' : 'max-w-md md:max-w-xl', className)}
      data-testid="live-circuit-map"
    >
      {/*
        HUD: no max-height — at phone width, max-h-40 was shorter than natural
        aspect height for Spa/Suzuka/etc and cropped the top-right. Width +
        aspect-ratio alone keeps the full silhouette. Results keep a soft cap.
      */}
      <div
        className={cn(
          'relative w-full rounded-lg overflow-visible bg-transparent',
          isResults && 'max-h-52 border border-black/10'
        )}
        style={{ aspectRatio: `${meta.w} / ${meta.h}` }}
      >
        {/* Power-up feedback stays on the car marker (pulse) — no full-bleed yellow/cyan box flares */}
        {isWet && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] rounded-lg bg-blue-500/10"
            data-testid="circuit-map-wet-tint"
          />
        )}
        {currentSectorRed && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] rounded-lg ring-2 ring-red-500/50"
            data-testid="circuit-map-sector-warning"
          />
        )}

        {/* Black circuit from branded art: luminance-mask drops the PNG’s black plate */}
        {meta.image && (
          <div
            aria-hidden
            className="absolute z-0 pointer-events-none"
            style={{
              top: `${(viewPad / (meta.h + viewPad * 2)) * 100}%`,
              left: `${(viewPad / (meta.w + viewPad * 2)) * 100}%`,
              right: `${(viewPad / (meta.w + viewPad * 2)) * 100}%`,
              bottom: `${(viewPad / (meta.h + viewPad * 2)) * 100}%`,
              backgroundColor: '#111111',
              WebkitMaskImage: `url(${meta.image})`,
              maskImage: `url(${meta.image})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              maskMode: 'luminance',
            }}
          />
        )}

        <svg
          viewBox={viewBox}
          className="absolute inset-0 z-[1] h-full w-full overflow-visible"
          role="img"
          aria-label={`${circuitName} live map`}
        >
          {!meta.image && (
            <path
              d={meta.d}
              fill="none"
              stroke="#111111"
              strokeWidth={isResults ? 12 : 10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Measure path for car / sector math */}
          <path ref={measureRef} d={meta.d} fill="none" stroke="transparent" strokeWidth={1} />

          {/* Rival sector glow — current circuit tour only */}
          {showRival &&
            rivalSectorResults &&
            Array.from({ length: rivalLap.sectorOnLap }).map((_, i) => {
              const color = rivalSectorResults[rivalLap.lapStart + i]?.sectorColor ?? 'yellow';
              return (
                <path
                  key={`rival-sector-${i}`}
                  d={meta.d}
                  fill="none"
                  pathLength={mapLapLength}
                  stroke={SECTOR_STROKE[color]}
                  strokeWidth={sectorStroke - 2}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  strokeDasharray={`1 ${mapLapLength - 1}`}
                  strokeDashoffset={-i}
                  opacity={0.4}
                />
              );
            })}

          {/* Player sector glow — current circuit tour only */}
          {Array.from({ length: playerLap.sectorOnLap }).map((_, i) => {
            const color = sectorResults[playerLap.lapStart + i]?.sectorColor ?? 'green';
            const isPurplePulse = i === lastPurpleOnLap && lastPurpleOnLap >= 0;
            return (
              <path
                key={`sector-${playerLap.circuitLap}-${i}`}
                d={meta.d}
                fill="none"
                pathLength={mapLapLength}
                stroke={SECTOR_STROKE[color]}
                strokeWidth={sectorStroke}
                strokeLinecap="butt"
                strokeLinejoin="round"
                strokeDasharray={`1 ${mapLapLength - 1}`}
                strokeDashoffset={-i}
                opacity={isPurplePulse ? 1 : 0.85}
                className={isPurplePulse ? 'animate-pulse' : undefined}
              />
            );
          })}

          {progress < raceLength && (
            <path
              d={meta.d}
              fill="none"
              pathLength={mapLapLength}
              stroke={currentSectorRed ? SECTOR_STROKE.red : 'rgba(0,0,0,0.28)'}
              strokeWidth={sectorStroke}
              strokeLinecap="butt"
              strokeDasharray={`1 ${mapLapLength - 1}`}
              strokeDashoffset={-playerLap.sectorOnLap}
              className="animate-pulse"
              opacity={0.75}
            />
          )}

          {showRival && (
            <CarMarker
              pose={rivalPose}
              color="#dc2626"
              accent="#fca5a5"
              size={isResults ? 1.15 : 0.95}
            />
          )}
          <CarMarker
            pose={playerPose}
            color="#111111"
            accent="#ff2800"
            size={isResults ? 1.3 : 1.15}
            pulse={overtakeActive || aeroActive}
          />
        </svg>
      </div>

      {!hideFooter && (
        <div className="flex justify-between text-muted-foreground mt-1 px-1 text-xs">
          <span>{defaultLeft}</span>
          {labelRight != null && <span className={labelRightClassName}>{labelRight}</span>}
        </div>
      )}
    </div>
  );
}
