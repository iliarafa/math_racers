import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

/**
 * One tour of the circuit silhouette is divided into `race length in laps`
 * sectors (capped at standard RACE_LENGTH=20). Longer sessions wrap: the car
 * starts a second/third lap instead of slicing the map into 44/78/100 pieces.
 */
export function getMapLapLength(raceLength: number): number {
  return Math.min(Math.max(1, raceLength), RACE_LENGTH);
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
    return {
      circuitLap: totalCircuitLaps,
      totalCircuitLaps,
      sectorOnLap,
      lapStart,
      t: sectorOnLap / mapLapLength,
      mapLapLength,
    };
  }

  const lapStart = Math.floor(clamped / mapLapLength) * mapLapLength;
  const sectorOnLap = clamped - lapStart;
  return {
    circuitLap: Math.floor(clamped / mapLapLength) + 1,
    totalCircuitLaps,
    sectorOnLap,
    lapStart,
    t: sectorOnLap / mapLapLength,
    mapLapLength,
  };
}

function readPose(path: SVGPathElement, t: number): CarPose {
  const len = path.getTotalLength();
  if (len <= 0) return { x: 0, y: 0, angle: 0 };
  const dist = Math.max(0, Math.min(1, t)) * len;
  const p = path.getPointAtLength(dist);
  const look = path.getPointAtLength(Math.min(len, dist + Math.max(2, len * 0.01)));
  const angle = (Math.atan2(look.y - p.y, look.x - p.x) * 180) / Math.PI;
  return { x: p.x, y: p.y, angle };
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
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={1.2}
        fill={color}
        stroke={accent}
        strokeWidth={0.9}
      />
      <rect
        x={-w * 0.12}
        y={-h * 0.28}
        width={w * 0.45}
        height={h * 0.55}
        rx={0.6}
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
  playerLabel = 'YOU',
  rivalLabel = 'RIV',
}: LiveCircuitMapProps) {
  const meta = useMemo(() => getCircuitMapMeta(circuit), [circuit]);
  const measureRef = useRef<SVGPathElement>(null);
  const [playerPose, setPlayerPose] = useState<CarPose>({ x: meta.w / 2, y: meta.h / 2, angle: 0 });
  const [rivalPose, setRivalPose] = useState<CarPose>({ x: meta.w / 2, y: meta.h / 2, angle: 0 });

  const playerLap = useMemo(() => getMapLapState(progress, raceLength), [progress, raceLength]);
  const rivalLap = useMemo(
    () => getMapLapState(rivalProgress, raceLength),
    [rivalProgress, raceLength]
  );
  const { mapLapLength } = playerLap;

  const lastPurpleOnLap = useMemo(() => {
    for (let i = playerLap.sectorOnLap - 1; i >= 0; i--) {
      if (sectorResults[playerLap.lapStart + i]?.sectorColor === 'purple') return i;
    }
    return -1;
  }, [playerLap.sectorOnLap, playerLap.lapStart, sectorResults]);

  useLayoutEffect(() => {
    const path = measureRef.current;
    if (!path) return;
    setPlayerPose(readPose(path, playerLap.t));
    if (showRival) setRivalPose(readPose(path, rivalLap.t));
  }, [meta.d, playerLap.t, rivalLap.t, showRival]);

  const isResults = variant === 'results';
  const sectorStroke = isResults ? 10 : 8;
  const viewBox = `0 0 ${meta.w} ${meta.h}`;
  const defaultLeft =
    labelLeft ??
    (playerLap.totalCircuitLaps > 1
      ? `Lap ${playerLap.circuitLap}/${playerLap.totalCircuitLaps} · ${Math.min(progress + 1, raceLength)}/${raceLength}`
      : `Lap ${Math.min(progress + 1, raceLength)}/${raceLength}`);
  const circuitName = circuit && 'name' in circuit && circuit.name ? circuit.name : 'Circuit';

  return (
    <div
      className={cn('w-full mx-auto', isResults ? 'max-w-md' : 'max-w-md md:max-w-xl', className)}
      data-testid="live-circuit-map"
    >
      <div
        className={cn(
          'relative w-full rounded-lg overflow-hidden bg-transparent',
          isResults ? 'max-h-52' : 'max-h-40 sm:max-h-44',
          isResults && 'border border-black/10'
        )}
        style={{ aspectRatio: `${meta.w} / ${meta.h}` }}
      >
        <AnimatePresence>
          {overtakeActive && (
            <motion.div
              key="overtake-flare"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="pointer-events-none absolute inset-0 z-[2] rounded-lg ring-2 ring-yellow-400/80 shadow-[inset_0_0_28px_rgba(250,204,21,0.45)]"
            />
          )}
          {aeroActive && (
            <motion.div
              key="aero-flare"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.65, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, repeat: Infinity }}
              className="pointer-events-none absolute inset-0 z-[2] rounded-lg ring-2 ring-cyan-400/80 shadow-[inset_0_0_28px_rgba(34,211,238,0.4)]"
            />
          )}
        </AnimatePresence>
        {isWet && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] rounded-lg bg-blue-500/20"
            data-testid="circuit-map-wet-tint"
          />
        )}

        {/* Black circuit from branded art: luminance-mask drops the PNG’s black plate */}
        {meta.image && (
          <div
            aria-hidden
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
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
          className="absolute inset-0 z-[1] h-full w-full"
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

          {/* Player sector glow — current circuit tour only (max RACE_LENGTH slices) */}
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
            <motion.g
              initial={false}
              animate={{ x: rivalPose.x, y: rivalPose.y, rotate: rivalPose.angle }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <CarMarker
                pose={{ x: 0, y: 0, angle: 0 }}
                color="#dc2626"
                accent="#fca5a5"
                size={isResults ? 1.2 : 1.05}
              />
            </motion.g>
          )}
          <motion.g
            initial={false}
            animate={{ x: playerPose.x, y: playerPose.y, rotate: playerPose.angle, scale: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            <CarMarker
              pose={{ x: 0, y: 0, angle: 0 }}
              color="#111111"
              accent="#ff2800"
              size={isResults ? 1.3 : 1.15}
              pulse={overtakeActive || aeroActive}
            />
          </motion.g>
        </svg>

        <div className="absolute bottom-1.5 left-2 right-2 z-[3] flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            {(
              [
                ['purple', '#a855f7'],
                ['green', '#22c55e'],
                ['yellow', '#eab308'],
                ['red', '#ef4444'],
              ] as const
            ).map(([name, hex]) => (
              <span
                key={name}
                className="w-2 h-2 rounded-[2px] ring-1 ring-black/20"
                style={{ backgroundColor: hex }}
                title={name}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            {showRival && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-1.5 rounded-sm bg-red-600" />
                {rivalLabel.slice(0, 3)}
              </span>
            )}
            <span className="flex items-center gap-1 text-foreground">
              <span className="w-2.5 h-1.5 rounded-sm bg-foreground" />
              {playerLabel.slice(0, 3)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between text-muted-foreground mt-1 px-1 text-xs">
        <span>{defaultLeft}</span>
        {labelRight != null && <span className={labelRightClassName}>{labelRight}</span>}
      </div>
    </div>
  );
}
