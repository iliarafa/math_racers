import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { TIER_COLORS } from "@/components/RewardStrip";
import { useGameState } from "@/lib/gameLogic";
import { playCarouselClick } from "@/lib/uiSound";
import { TROPHY_CODES, seasonSlots, type Trophy } from "@/lib/trophies";
import {
  CURRENT_ROUND,
  CURRENT_SEASON,
  MAP_REGIONS,
  SEASON_CALENDAR,
  WORLD_BOUNDS,
  formatRaceDate,
  isRoundOpen,
  parseMapRegion,
  regionSpec,
  roundsInRegion,
  type CalendarRound,
  type MapRegion,
} from "@/lib/seasonCalendar";
import { boundsBox, fitViewBoxInset, project, spreadPins, viewBoxString, type MapPoint, type ViewBox } from "@/lib/worldMap";
import { cn } from "@/lib/utils";
import worldMapUrl from "@/assets/world_map.svg";

const OXANIUM = { fontFamily: 'Oxanium, sans-serif' } as const;
const F1_RED = '#e10600';

/** Screen strips the title and the status line cover; regions fit between them. */
const INSET = { top: 84, bottom: 64 };
/** Pin footprint (centre to centre, px) that `spreadPins` keeps apart. */
const PIN_SPACING = 64;
/**
 * Region bubbles: the circle is full size on desktop and shrinks to `min` on a phone-width map,
 * `spreadPins` keeps them `size + gap` apart, and the `labelBox`-wide button stays `edge` px
 * inside the map so a long label (ASIA-PACIFIC) is never cut off at the side.
 */
const BUBBLE = { max: 72, min: 52, perWidth: 0.13, gap: 28, labelBox: 120, edge: 8 };
const GLIDE = { duration: 0.7, ease: [0.4, 0, 0.2, 1] as const };

type LandPaths = { land: string; borders: string };

let landRequest: Promise<LandPaths> | null = null;

/** The outline is a plain asset (kept out of the JS bundle); its two paths are drawn inline so strokes stay hairline at any zoom. */
function loadLand(): Promise<LandPaths> {
  landRequest ??= fetch(worldMapUrl)
    .then((res) => res.text())
    .then((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      return {
        land: doc.getElementById('land')?.getAttribute('d') ?? '',
        borders: doc.getElementById('borders')?.getAttribute('d') ?? '',
      };
    })
    .catch((err) => {
      landRequest = null;
      throw err;
    });
  return landRequest;
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function titleCase(name: string): string {
  return name.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toPx(point: MapPoint, vb: ViewBox, size: { w: number; h: number }): MapPoint {
  return { x: ((point.x - vb.x) / vb.w) * size.w, y: ((point.y - vb.y) / vb.h) * size.h };
}

function centreOf(rows: readonly CalendarRound[]): MapPoint {
  const pts = rows.map((r) => project(r.lng, r.lat));
  return {
    x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
    y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
  };
}

type PinState = 'current' | 'raced' | 'open' | 'upcoming';

function pinState(row: CalendarRound, trophy: Trophy | undefined): PinState {
  if (!isRoundOpen(row.round)) return 'upcoming';
  if (row.round === CURRENT_ROUND) return 'current';
  return trophy ? 'raced' : 'open';
}

function describe(row: CalendarRound, trophy: Trophy | undefined): string {
  const head = `Round ${row.round} · ${titleCase(row.name)}`;
  if (!isRoundOpen(row.round)) return `${head} · opens race week${row.raceDate ? ` · ${formatRaceDate(row.raceDate)}` : ''}`;
  const medal = trophy ? `${trophy.tier} trophy` : row.round === CURRENT_ROUND ? 'this week' : 'not raced yet';
  return `${head} · ${row.circuitName} · ${medal}`;
}

/**
 * The Season Map: the 2026 calendar on a world map. The world view shows a bubble per region;
 * clicking one glides into it, where each round is a pin. An open pin starts that round's Grand
 * Prix weekend (`/game/grand-prix?round=N`); a pin not rotated to yet just says when it opens.
 * The region lives in the URL (`?region=`), so the weekend's exits land back where the kid was.
 */
export default function SeasonMap() {
  const { state } = useGameState();
  const [, setLocation] = useLocation();
  const region = parseMapRegion(useSearch());
  const reduceMotion = useReducedMotion();

  const stageRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(stageRef);

  const [paths, setPaths] = useState<LandPaths | null>(null);
  useEffect(() => {
    let alive = true;
    loadLand().then((p) => { if (alive) setPaths(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // The glide runs only when the region changes; a resize snaps.
  const [settledRegion, setSettledRegion] = useState<MapRegion | null>(region);
  const zooming = region !== settledRegion;

  const [hovered, setHovered] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const click = () => { if (state.soundEnabled) playCarouselClick(); };
  const goRegion = (next: MapRegion | null) => {
    setHovered(null);
    setNotice(null);
    setLocation(next ? `/map?region=${next}` : '/map', { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && region) goRegion(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const slots = seasonSlots(state.trophies, CURRENT_SEASON);
  const trophyFor = (round: number) => slots[round - 1]?.trophy;
  const openCount = SEASON_CALENDAR.filter((r) => isRoundOpen(r.round)).length;
  const racedCount = SEASON_CALENDAR.filter((r) => isRoundOpen(r.round) && trophyFor(r.round)).length;

  const vb = useMemo(() => {
    const box = boundsBox(region ? regionSpec(region).bounds : WORLD_BOUNDS);
    const w = size.w || 16;
    const h = size.h || 9;
    return fitViewBoxInset(box, w, h, INSET, region ? 0.06 : 0.01);
  }, [region, size.w, size.h]);
  const vbKey = viewBoxString(vb);

  const pins = useMemo(() => {
    if (!region || !size.w) return [];
    const rows = roundsInRegion(region);
    const truePx = rows.map((r) => toPx(project(r.lng, r.lat), vb, size));
    const placed = spreadPins(truePx, PIN_SPACING);
    return rows.map((row, i) => ({ row, at: truePx[i], pin: placed[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, vbKey, size.w, size.h]);

  const bubbleSize = Math.round(Math.min(BUBBLE.max, Math.max(BUBBLE.min, size.w * BUBBLE.perWidth)));
  const compactBubbles = bubbleSize < BUBBLE.max;

  const bubbles = useMemo(() => {
    if (region || !size.w) return [];
    const centres = MAP_REGIONS.map((spec) => toPx(centreOf(roundsInRegion(spec.id)), vb, size));
    const placed = spreadPins(centres, bubbleSize + BUBBLE.gap);
    const maxLeft = size.w - BUBBLE.labelBox - BUBBLE.edge;
    return MAP_REGIONS.map((spec, i) => ({
      spec,
      left: Math.max(BUBBLE.edge, Math.min(maxLeft, placed[i].x - BUBBLE.labelBox / 2)),
      top: placed[i].y - bubbleSize / 2,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, vbKey, size.w, size.h]);

  const venueDots = useMemo(() => {
    if (region || !size.w) return [];
    return SEASON_CALENDAR.map((row) => ({ row, at: toPx(project(row.lng, row.lat), vb, size) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, vbKey, size.w, size.h]);

  const regionRows = region ? roundsInRegion(region) : [];
  const regionOpen = regionRows.filter((r) => isRoundOpen(r.round));
  const regionRaced = regionOpen.filter((r) => trophyFor(r.round));

  const status = notice
    ?? hovered
    ?? (region
      ? `${regionRaced.length} of ${regionOpen.length} weekends raced here · pick a round to start its weekend`
      : `${racedCount} of ${openCount} weekends raced · pick a region`);

  return (
    <GameLayout hideGarageButton lockViewport darkBackground wideContent backHref="/hub">
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        // Break out of <main>'s width cap so the map always fills the window.
        style={{ width: 'var(--stage-w)', marginLeft: 'calc(50% - var(--stage-w) / 2)' }}
        data-testid="season-map"
      >
        <motion.svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          initial={false}
          animate={{ viewBox: vbKey }}
          transition={zooming && !reduceMotion ? GLIDE : { duration: 0 }}
          onAnimationComplete={() => setSettledRegion(region)}
          aria-hidden="true"
        >
          {paths && (
            <>
              <path d={paths.land} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.30)" strokeWidth={0.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={paths.borders} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={0.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </motion.svg>

        {/* World view: a faint dot per venue under the region bubbles. */}
        {!region && !zooming && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {venueDots.map(({ row, at }) => {
              const s = pinState(row, trophyFor(row.round));
              return (
                <span
                  key={row.round}
                  className="absolute rounded-full"
                  style={{
                    left: at.x - 3,
                    top: at.y - 3,
                    width: 6,
                    height: 6,
                    backgroundColor: s === 'current' ? F1_RED : s === 'upcoming' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                  }}
                />
              );
            })}
          </div>
        )}

        {!region && !zooming && bubbles.map(({ spec, left, top }, i) => {
          const rows = roundsInRegion(spec.id);
          const hasCurrent = rows.some((r) => r.round === CURRENT_ROUND);
          const raced = rows.filter((r) => isRoundOpen(r.round) && trophyFor(r.round)).length;
          const label = `${spec.label} · ${rows.length} rounds · ${raced} raced`;
          return (
            <motion.button
              key={spec.id}
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: reduceMotion ? 0 : i * 0.05 }}
              className={cn(
                "absolute flex flex-col items-center outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-white web-hover-brighten",
                compactBubbles ? 'gap-1' : 'gap-1.5',
              )}
              style={{ left, top, width: BUBBLE.labelBox, ...OXANIUM }}
              onClick={() => { click(); goRegion(spec.id); }}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(label)}
              onBlur={() => setHovered(null)}
              aria-label={`Zoom into ${label}`}
              data-testid={`map-region-${spec.id}`}
            >
              <span
                className={cn("relative flex items-center justify-center rounded-full font-bold text-white", compactBubbles ? 'text-lg' : 'text-2xl')}
                style={{
                  width: bubbleSize,
                  height: bubbleSize,
                  backgroundColor: 'rgba(23,23,23,0.85)',
                  border: `2px solid ${hasCurrent ? F1_RED : 'rgba(255,255,255,0.8)'}`,
                  boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
                }}
              >
                {hasCurrent && !reduceMotion && (
                  <span className="absolute inset-[-2px] rounded-full animate-ping" style={{ border: `2px solid ${F1_RED}`, opacity: 0.6 }} />
                )}
                {rows.length}
              </span>
              <span
                className={cn("font-bold uppercase text-white", compactBubbles ? 'text-[10px] tracking-wider' : 'text-xs tracking-widest')}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {spec.label}
              </span>
            </motion.button>
          );
        })}

        {/* Region view: leader lines from a nudged pin back to its true spot. */}
        {region && !zooming && size.w > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {pins.filter(({ at, pin }) => Math.hypot(pin.x - at.x, pin.y - at.y) > 3).map(({ row, at, pin }) => (
              <g key={row.round}>
                <line x1={at.x} y1={at.y} x2={pin.x} y2={pin.y} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
                <circle cx={at.x} cy={at.y} r={3} fill="rgba(255,255,255,0.85)" />
              </g>
            ))}
          </svg>
        )}

        {region && !zooming && pins.map(({ row, pin }, i) => {
          const trophy = trophyFor(row.round);
          const s = pinState(row, trophy);
          const tier = trophy ? TIER_COLORS[trophy.tier] : undefined;
          const label = describe(row, trophy);
          const circle: CSSProperties =
            s === 'current'
              ? { backgroundColor: F1_RED, border: `2px solid ${tier ?? '#ffffff'}`, color: '#ffffff' }
              : s === 'raced'
                ? { backgroundColor: `${tier}33`, border: `3px solid ${tier}`, color: '#ffffff' }
                : s === 'open'
                  ? { backgroundColor: 'rgba(23,23,23,0.85)', border: '2px solid rgba(255,255,255,0.85)', color: '#ffffff' }
                  : { backgroundColor: 'rgba(23,23,23,0.6)', border: '2px dashed rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.45)' };
          return (
            <motion.button
              key={row.round}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: reduceMotion ? 0 : i * 0.03 }}
              className={cn(
                "absolute flex flex-col items-center gap-1 outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-white",
                s === 'upcoming' ? 'cursor-default' : 'web-hover-brighten',
              )}
              style={{ left: pin.x - 30, top: pin.y - 20, width: 60, ...OXANIUM }}
              onClick={() => {
                click();
                if (s === 'upcoming') {
                  setNotice(`${titleCase(row.name)} opens race week${row.raceDate ? ` · ${formatRaceDate(row.raceDate)}` : ''}`);
                  return;
                }
                setLocation(`/game/grand-prix?round=${row.round}`);
              }}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(label)}
              onBlur={() => setHovered(null)}
              aria-label={s === 'upcoming' ? label : `Start ${label}`}
              data-testid={`map-pin-${row.round}`}
              data-state={s}
            >
              <span
                className="relative flex items-center justify-center rounded-full text-sm font-bold"
                style={{ width: 40, height: 40, boxShadow: '0 3px 12px rgba(0,0,0,0.5)', ...circle }}
              >
                {s === 'current' && !reduceMotion && (
                  <span className="absolute inset-[-2px] rounded-full animate-ping" style={{ border: `2px solid ${F1_RED}`, opacity: 0.55 }} />
                )}
                <span className="relative">{row.round}</span>
              </span>
              <span
                className={cn("text-[10px] font-bold uppercase tracking-widest leading-none", s === 'upcoming' ? 'text-white/45' : 'text-white')}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
              >
                {s === 'upcoming' && row.raceDate ? formatRaceDate(row.raceDate) : TROPHY_CODES[row.circuitId] ?? row.name.slice(0, 3)}
              </span>
            </motion.button>
          );
        })}

        {/* Title, and the way back out of a region. */}
        <div className="absolute left-4 top-3 md:left-8 md:top-5 z-10 flex flex-col items-start gap-2" style={OXANIUM}>
          {region ? (
            <>
              <button
                type="button"
                onClick={() => { click(); goRegion(null); }}
                className="flex items-center gap-1 pl-1.5 pr-3 h-8 rounded-full bg-white/10 text-xs font-bold uppercase tracking-widest text-white/80 web-hover-glass"
                data-testid="map-world"
              >
                <ChevronLeft className="w-4 h-4" /> World
              </button>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-white uppercase leading-none">
                {regionSpec(region).label}
              </h1>
            </>
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-white leading-none">
              {CURRENT_SEASON} SEASON
            </h1>
          )}
        </div>

        {/* Key to the pins (desktop has the room). */}
        <div className="hidden md:flex absolute right-8 top-5 z-10 items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50" style={OXANIUM} aria-hidden="true">
          {(['gold', 'silver', 'bronze'] as const).map((tier) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ border: `2px solid ${TIER_COLORS[tier]}` }} />
              {tier}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: F1_RED }} />
            This week
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-white/35" />
            Coming up
          </span>
        </div>

        {/* Status line: what the pointer is on, or the season so far. */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center px-4 text-center text-xs md:text-sm uppercase tracking-widest text-white/70"
          style={{ ...OXANIUM, height: INSET.bottom }}
          role="status"
          data-testid="map-status"
        >
          {status}
        </div>
      </div>
    </GameLayout>
  );
}
