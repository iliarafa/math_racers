import type { Circuit, CircuitPaths } from '@/lib/gameLogic';
import circuitPathData from '@/lib/circuitPathData.json';
import { smoothClosedPolylineToCubic } from '@/lib/smoothCircuitPath';

import circuitSpaBlack from '@/assets/circuit_spa_black.png';
import circuitMonzaBlack from '@/assets/circuit_monza_black.png';
import circuitMonacoBlack from '@/assets/circuit_monaco_black.png';
import circuitSuzukaBlack from '@/assets/circuit_suzuka_black.png';
import circuitSilverstoneBlack from '@/assets/circuit_silverstone_black.png';

/** Generic oval used when a circuit has no map art / path data. */
export const FALLBACK_CIRCUIT_PATH =
  'M 40 80 Q 40 28 160 28 Q 280 28 280 80 Q 280 132 160 132 Q 40 132 40 80';

export type SectorColor = 'purple' | 'green' | 'yellow' | 'red';

export const SECTOR_STROKE: Record<SectorColor, string> = {
  purple: '#a855f7',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

export type CircuitMapMeta = {
  w: number;
  h: number;
  d: string;
  image: string;
};

/** Black silhouettes — same shapes as setup cards. */
const CIRCUIT_IMAGES: Record<string, string> = {
  spa: circuitSpaBlack,
  monza: circuitMonzaBlack,
  monaco: circuitMonacoBlack,
  suzuka: circuitSuzukaBlack,
  silverstone: circuitSilverstoneBlack,
};

type PathJsonEntry = {
  w: number;
  h: number;
  d: string;
  points?: number;
};

const PATH_JSON = circuitPathData as Record<string, PathJsonEntry>;

/** Dense medial polylines are already accurate — do not Catmull-Rom reshape them. */
const DENSE_PATH_MIN_POINTS = 80;

/** Resolved path `d` per circuit id. */
const PATH_D_CACHE = new Map<string, string>();

function countPolylinePoints(d: string): number {
  const pairs = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?\s+-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  return pairs?.length ?? 0;
}

function getResolvedPathD(id: string, entry: PathJsonEntry): string {
  const cached = PATH_D_CACHE.get(id);
  if (cached) return cached;

  const pointCount = entry.points ?? countPolylinePoints(entry.d);
  const resolved =
    pointCount >= DENSE_PATH_MIN_POINTS
      ? entry.d
      : smoothClosedPolylineToCubic(entry.d);

  PATH_D_CACHE.set(id, resolved);
  return resolved;
}

export function getCircuitMapMeta(
  circuit: Circuit | { id: string; paths?: CircuitPaths } | null | undefined
): CircuitMapMeta {
  const id = circuit?.id ?? '';
  const entry = PATH_JSON[id];
  const image = CIRCUIT_IMAGES[id] ?? '';

  if (entry && image) {
    return { w: entry.w, h: entry.h, d: getResolvedPathD(id, entry), image };
  }

  // Fallback: try path JSON without art, or oval
  if (entry) {
    return { w: entry.w, h: entry.h, d: getResolvedPathD(id, entry), image: '' };
  }

  return { w: 320, h: 160, d: FALLBACK_CIRCUIT_PATH, image: '' };
}

/** @deprecated Prefer getCircuitMapMeta — kept for call sites that only need `d`. */
export function getCircuitPathD(
  circuit: Circuit | { id: string; paths?: CircuitPaths } | null | undefined
): string {
  return getCircuitMapMeta(circuit).d;
}

export function getCircuitPathsForId(circuitId: string): CircuitPaths {
  const entry = PATH_JSON[circuitId];
  if (entry?.d) {
    return { s1: getResolvedPathD(circuitId, entry), s2: '', s3: '' };
  }
  return { s1: FALLBACK_CIRCUIT_PATH, s2: '', s3: '' };
}
