import type { Circuit, CircuitPaths } from '@/lib/gameLogic';
import circuitPathData from '@/lib/circuitPathData.json';
import { smoothClosedPolylineToCubic } from '@/lib/smoothCircuitPath';

import circuitSpaBlack from '@/assets/circuit_spa_black.png';
import circuitMonzaBlack from '@/assets/circuit_monza_black.png';
import circuitMonacoBlack from '@/assets/circuit_monaco_black.png';
import circuitSuzukaBlack from '@/assets/circuit_suzuka_black.png';
import circuitSilverstoneBlack from '@/assets/circuit_silverstone_black.png';
import circuitHungary from '@/assets/circuit_hungary.png';

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
  /** Black ribbon width in path units (matches PNG stroke); sector paint uses this. */
  ribbon?: number;
};

/** Black silhouettes — same shapes as setup cards. */
const CIRCUIT_IMAGES: Record<string, string> = {
  spa: circuitSpaBlack,
  monza: circuitMonzaBlack,
  monaco: circuitMonacoBlack,
  suzuka: circuitSuzukaBlack,
  silverstone: circuitSilverstoneBlack,
  hungary: circuitHungary,
};

type PathJsonEntry = {
  w: number;
  h: number;
  d: string;
  points?: number;
  ribbon?: number;
};

const PATH_JSON = circuitPathData as Record<string, PathJsonEntry>;

/** Resolved path `d` per circuit id. */
const PATH_D_CACHE = new Map<string, string>();

function getResolvedPathD(id: string, entry: PathJsonEntry): string {
  const cached = PATH_D_CACHE.get(id);
  if (cached) return cached;

  // Catmull-Rom on dense medial samples stays faithful (unlike sparse ~50pt paths)
  // and removes L-segment staircasing in the overlay / sector strokes.
  const resolved = smoothClosedPolylineToCubic(entry.d);

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
    return {
      w: entry.w,
      h: entry.h,
      d: getResolvedPathD(id, entry),
      image,
      ribbon: entry.ribbon,
    };
  }

  // Fallback: try path JSON without art, or oval
  if (entry) {
    return {
      w: entry.w,
      h: entry.h,
      d: getResolvedPathD(id, entry),
      image: '',
      ribbon: entry.ribbon,
    };
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
