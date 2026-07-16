import { LiveCircuitMap } from '@/components/LiveCircuitMap';
import { getCircuitMapMeta } from '@/lib/circuitPaths';
import { CIRCUITS, RACE_LENGTH } from '@/lib/gameLogic';

const SAMPLE_SECTORS = Array.from({ length: 8 }, (_, i) => ({
  sectorColor: (['purple', 'green', 'yellow', 'green'] as const)[i % 4],
}));

/** Temporary QA page — phone-width preview of every circuit map. */
export default function DevCircuitMaps() {
  return (
    <div className="min-h-screen bg-white text-black p-4 space-y-8 overflow-y-auto" style={{ fontFamily: 'Oxanium, sans-serif' }}>
      <h1 className="text-lg font-bold">Circuit map QA (390px)</h1>
      <p className="text-xs text-muted-foreground">
        Red outline = stage bounds. Check for edge crop / layout overflow on each track.
      </p>
      <div className="w-[390px] mx-auto space-y-10 border border-dashed border-black/20 p-3">
        {CIRCUITS.map((circuit) => {
          const meta = getCircuitMapMeta(circuit);
          const hasArt = Boolean(meta.image);
          return (
            <section key={circuit.id} className="space-y-2" data-testid={`qa-map-${circuit.id}`}>
              <div className="text-sm font-bold uppercase tracking-wide">
                {circuit.name}{' '}
                <span className="text-muted-foreground font-normal">
                  ({circuit.id}
                  {!hasArt ? ' · fallback oval' : ''})
                </span>
              </div>
              <div className="outline outline-1 outline-red-400/40">
                <LiveCircuitMap
                  circuit={circuit}
                  progress={7}
                  rivalProgress={5}
                  raceLength={RACE_LENGTH}
                  sectorResults={SAMPLE_SECTORS}
                  rivalSectorResults={SAMPLE_SECTORS.slice(0, 5)}
                  showRival={hasArt}
                  hideFooter={false}
                  labelRight="Limits: 0"
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
