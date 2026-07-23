import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CURRENT_GRAND_PRIX, DEFAULT_MAP_STAGE_CLASS } from '@/lib/currentGrandPrix';
import {
  DIFFICULTY_DRUM_OPTIONS,
  difficultyDrumColor,
  type RaceMapView,
} from '@/lib/gameLogic';
import { SetupDrumRow } from './SetupDrumRow';
import { WEATHER_DRUM_OPTIONS, weatherDrumIndex } from './weatherOptions';
import type { Weather } from '@/lib/gameLogic';

const VIEW_OPTIONS: { id: RaceMapView; label: string }[] = [
  { id: 'track', label: 'Track' },
  { id: 'sectors', label: 'Sectors' },
];

const VIEW_ACTIVE_COLOR = '#22c55e';

interface RaceSetupCardProps {
  /** Distinguishes the Free Practice and Grand Prix cards for animation identity. */
  motionKey: string;
  testId: string;
  /** Resolved circuit silhouette (the thin `black` line art). */
  mapImageSrc?: string;
  /** Present only where a level choice is offered — Grand Prix locks after Practice. */
  level?: { index: number; onIndexChange: (next: number) => void };
  view: RaceMapView;
  onViewChange: (view: RaceMapView) => void;
  weather: Weather;
  onWeatherChange: (weather: Weather) => void;
  drumHeight: number;
}

/**
 * The Free Practice / Grand Prix setup card.
 *
 * Both cards were byte-identical apart from the level control, so they share one
 * component: presence of `level` is what distinguishes them. The card owns all three
 * drums deliberately — no children slot — so the two surfaces cannot drift in ordering
 * or spacing the way the duplicated JSX did.
 */
export function RaceSetupCard({
  motionKey,
  testId,
  mapImageSrc,
  level,
  view,
  onViewChange,
  weather,
  onWeatherChange,
  drumHeight,
}: RaceSetupCardProps) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-[350px] md:w-[500px] rounded-[20px] p-6 flex flex-col transition-colors duration-300 select-none backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        data-testid={testId}
      >
        {/* Header - Circuit & Flag */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <h2
            className="text-2xl font-bold uppercase tracking-wider text-white"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            {CURRENT_GRAND_PRIX.name}
          </h2>
          <img
            src={CURRENT_GRAND_PRIX.flagImage}
            alt={`${CURRENT_GRAND_PRIX.country} flag`}
            className="h-5 w-7 object-cover rounded-sm relative -top-0.5"
          />
        </div>

        {/* Track Map — padded contain stage (no max-w clamp that crops square maps).
            Stage height comes from the GP config so per-circuit art is one field. */}
        <div className="flex-1 flex items-center justify-center py-3 md:py-6 overflow-visible px-2">
          <div
            className={cn(
              'w-full overflow-visible p-2',
              CURRENT_GRAND_PRIX.mapStageClass ?? DEFAULT_MAP_STAGE_CLASS,
            )}
          >
            <img
              src={mapImageSrc}
              alt={`${CURRENT_GRAND_PRIX.name} circuit`}
              className="h-full w-full object-contain"
              style={{ filter: 'invert(1)' }}
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          {level && (
            <SetupDrumRow
              title="Level"
              length={DIFFICULTY_DRUM_OPTIONS.length}
              currentIndex={level.index}
              itemHeight={drumHeight}
              onIndexChange={level.onIndexChange}
              testIdPrefix="fp-level"
              ariaLabelPrev="Previous level"
              ariaLabelNext="Next level"
              renderItem={(idx) => {
                const opt = DIFFICULTY_DRUM_OPTIONS[idx];
                return (
                  <span
                    className="font-bold text-base uppercase tracking-wider text-center leading-tight"
                    style={{ fontFamily: 'Oxanium, sans-serif', color: difficultyDrumColor(opt) }}
                    data-testid={`setup-level-${opt.id}`}
                  >
                    {opt.label}
                  </span>
                );
              }}
            />
          )}

          <SetupDrumRow
            title="View"
            length={VIEW_OPTIONS.length}
            currentIndex={view === 'sectors' ? 1 : 0}
            itemHeight={drumHeight}
            onIndexChange={(n) => onViewChange(VIEW_OPTIONS[n].id)}
            testIdPrefix="setup-view"
            ariaLabelPrev="Previous view"
            ariaLabelNext="Next view"
            renderItem={(idx) => {
              const opt = VIEW_OPTIONS[idx];
              return (
                <span
                  className="font-bold text-base uppercase tracking-wider text-center leading-tight"
                  style={{ fontFamily: 'Oxanium, sans-serif', color: VIEW_ACTIVE_COLOR }}
                  data-testid={`setup-view-${opt.id}`}
                >
                  {opt.label}
                </span>
              );
            }}
          />

          <SetupDrumRow
            title="Weather"
            length={WEATHER_DRUM_OPTIONS.length}
            currentIndex={weatherDrumIndex(weather)}
            itemHeight={drumHeight}
            onIndexChange={(n) => onWeatherChange(WEATHER_DRUM_OPTIONS[n].id)}
            testIdPrefix="setup-weather"
            ariaLabelPrev="Previous weather"
            ariaLabelNext="Next weather"
            renderItem={(idx) => {
              const opt = WEATHER_DRUM_OPTIONS[idx];
              return (
                <span
                  className="font-bold text-base uppercase tracking-wider text-center leading-tight"
                  style={{ fontFamily: 'Oxanium, sans-serif', color: opt.color }}
                  data-testid={`setup-weather-${opt.id}`}
                >
                  {opt.label}
                </span>
              );
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
