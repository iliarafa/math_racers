type Pt = { x: number; y: number };

/** Parse an SVG path that is M/L/Z (polyline) into ordered points. */
export function parsePolylinePoints(d: string): Pt[] | null {
  if (!d || /[CQcASahHvVTtSs]/.test(d)) return null;

  const tokens = d.match(/[MLZmlz]|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi);
  if (!tokens || tokens.length < 3) return null;

  const pts: Pt[] = [];
  let i = 0;
  let cmd = '';

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[MLZmlz]$/.test(t)) {
      cmd = t.toUpperCase();
      i++;
      if (cmd === 'Z') break;
      continue;
    }

    if (cmd !== 'M' && cmd !== 'L') return null;

    const x = Number(t);
    const y = Number(tokens[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    pts.push({ x, y });
    i += 2;

    // After first M pair, subsequent pairs are implicit L
    if (cmd === 'M') cmd = 'L';
  }

  if (pts.length < 3) return null;

  // Drop duplicate closing point if present
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
    pts.pop();
  }

  return pts.length >= 3 ? pts : null;
}

function fmt(n: number): string {
  const r = Math.round(n * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
}

/**
 * Convert a closed M/L/Z polyline into a Catmull-Rom cubic Bezier path
 * so strokes follow curves instead of long chords.
 * Returns the original `d` if the path is not a simple closed polyline.
 */
export function smoothClosedPolylineToCubic(d: string): string {
  const pts = parsePolylinePoints(d);
  if (!pts) return d;

  const n = pts.length;
  const parts: string[] = [`M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`];

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    // Uniform Catmull-Rom → cubic Bezier (tension 1)
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    parts.push(
      `C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`
    );
  }

  parts.push('Z');
  return parts.join(' ');
}
