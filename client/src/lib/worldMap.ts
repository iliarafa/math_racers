import type { GeoBounds } from './seasonCalendar';

/**
 * Geometry for the Season Map. Web Mercator into a square world MAP_SIZE units wide, the same
 * projection `client/src/assets/world_map.svg` was drawn with (see its header comment), so a
 * pin projected here lands on the coastline drawn there. Pure.
 */

/** The world's width (and Mercator height) in map units. */
export const MAP_SIZE = 1000;

/**
 * The latitude band `world_map.svg` covers (Antarctica and the far Arctic are cut). Its viewBox
 * is `0 project(_, LAND_NORTH).y MAP_SIZE (project(_, LAND_SOUTH).y - that)`.
 */
export const LAND_NORTH = 84;
export const LAND_SOUTH = -60;

export type MapPoint = { x: number; y: number };
export type ViewBox = { x: number; y: number; w: number; h: number };

export function project(lng: number, lat: number): MapPoint {
  const phi = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * MAP_SIZE,
    y: MAP_SIZE / 2 - (MAP_SIZE / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + phi / 2)),
  };
}

/** The box a lon/lat rectangle projects to. */
export function boundsBox(bounds: GeoBounds): ViewBox {
  const nw = project(bounds.west, bounds.north);
  const se = project(bounds.east, bounds.south);
  return { x: nw.x, y: nw.y, w: se.x - nw.x, h: se.y - nw.y };
}

/** The rectangle `world_map.svg` is drawn in, for placing it as an <image>. */
export function landBox(): ViewBox {
  return boundsBox({ west: -180, east: 180, north: LAND_NORTH, south: LAND_SOUTH });
}

/**
 * The smallest viewBox that holds `box` (plus `pad` of its size on every side) and has the
 * container's `aspect` (width / height), centred on `box`. The land fills the container with no
 * letterbox, so a region always fits the window's shape.
 */
export function fitViewBox(box: ViewBox, aspect: number, pad = 0.06): ViewBox {
  const w0 = box.w * (1 + pad * 2);
  const h0 = box.h * (1 + pad * 2);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : w0 / h0;
  const w = Math.max(w0, h0 * safeAspect);
  const h = w / safeAspect;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * `fitViewBox` for a container whose top and bottom strips are covered by overlays (title,
 * status line): the region fits the uncovered middle, and the view grows to fill the strips.
 */
export function fitViewBoxInset(
  box: ViewBox,
  width: number,
  height: number,
  inset: { top: number; bottom: number },
  pad = 0.06,
): ViewBox {
  const innerH = height - inset.top - inset.bottom;
  if (!(width > 0) || !(innerH > 0)) return fitViewBox(box, width / height, pad);
  const inner = fitViewBox(box, width / innerH, pad);
  const unitsPerPx = inner.h / innerH;
  return {
    x: inner.x,
    y: inner.y - inset.top * unitsPerPx,
    w: inner.w,
    h: inner.h + (inset.top + inset.bottom) * unitsPerPx,
  };
}

export function viewBoxString(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
}

/** Where a map point sits in the container, as percentages of its width and height. */
export function toPercent(point: MapPoint, vb: ViewBox): { left: number; top: number } {
  return {
    left: ((point.x - vb.x) / vb.w) * 100,
    top: ((point.y - vb.y) / vb.h) * 100,
  };
}

/**
 * Pushes markers apart until no two centres are closer than `minDist` (screen pixels), keeping
 * each as near its true spot as it can. Deterministic: two markers on the same spot split along
 * a fixed diagonal. The caller draws a leader line back to the true spot when a marker moved.
 */
export function spreadPins(points: readonly MapPoint[], minDist: number, iterations = 60): MapPoint[] {
  const out = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < iterations; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        let dx = out[j].x - out[i].x;
        let dy = out[j].y - out[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) continue;
        if (dist < 1e-6) {
          dx = Math.SQRT1_2;
          dy = Math.SQRT1_2;
          dist = 1;
        }
        const push = (minDist - dist) / 2 + 0.01;
        const ux = dx / dist;
        const uy = dy / dist;
        out[i].x -= ux * push;
        out[i].y -= uy * push;
        out[j].x += ux * push;
        out[j].y += uy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
