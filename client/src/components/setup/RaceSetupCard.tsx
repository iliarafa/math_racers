import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_MAP_STAGE_CLASS } from '@/lib/currentGrandPrix';
import { playCarouselClick } from '@/lib/uiSound';
import { SetupRow, type SetupRowSpec } from './SetupRow';

export type { SetupOption, SetupRowSpec } from './SetupRow';

const TONE_COLORS = {
  green: '#16a34a',
  amber: '#f59e0b',
  red: '#dc2626',
} as const;

export interface RaceSetupCardProps {
  /** Distinguishes surfaces for animation identity. */
  motionKey: string;
  testId: string;
  header: {
    /** Small tracked line above the title, e.g. `ROUND 11`. */
    eyebrow?: string;
    title: string;
    flagSrc?: string;
    /** Phase tabs or any other header control. Progression state, not a setting. */
    phase?: React.ReactNode;
  };
  /** Circuit silhouette for the hero band. Omit to drop the band entirely. */
  mapImageSrc?: string;
  /** Tailwind height classes for the hero band; per-circuit art needs different room. */
  mapStageClass?: string;
  /** Black line art needs inverting on a dark card. */
  invertMap?: boolean;
  rows: SetupRowSpec[];
  /** Values that are shown but not chosen, e.g. LAPS 100. */
  readouts?: { label: string; value: string }[];
  start: { label: string; tone: keyof typeof TONE_COLORS; onStart: () => void; disabled?: boolean };
  onBack?: () => void;
  /** Mode rules, reachable from the "?" — not shown before every race. */
  helpText?: string;
  soundEnabled?: boolean;
  /** Extra content below the rows, e.g. Multiplayer's room code. */
  children?: React.ReactNode;
}

/**
 * The shared pre-race setup card for Free Practice, Grand Prix, Lane Racer and Multiplayer.
 *
 * Setup reads as a race engineer's readout: a hero band of circuit art, then one row per
 * setting with its current value right-aligned. Rows are passed as data rather than
 * hardcoded, which is what lets four modes with different setting counts share one layout
 * with no variant prop and no branching — a mode simply contributes more or fewer rows.
 *
 * The card owns which row is open so only one can be at a time.
 */
export function RaceSetupCard({
  motionKey,
  testId,
  header,
  mapImageSrc,
  mapStageClass,
  invertMap = true,
  rows,
  readouts,
  start,
  onBack,
  helpText,
  soundEnabled = true,
  children,
}: RaceSetupCardProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const click = () => {
    if (soundEnabled) playCarouselClick();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-[350px] md:w-[500px] rounded-[20px] px-5 py-4 md:px-6 md:py-5 flex flex-col select-none backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        data-testid={testId}
      >
        {/* Header — eyebrow, circuit, flag, and the "?" that owns the mode rules */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {header.eyebrow && (
              <div
                className="uppercase"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '0.3em',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {header.eyebrow}
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <h2
                className="text-xl md:text-2xl font-bold uppercase tracking-wider text-white leading-tight"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                {header.title}
              </h2>
              {header.flagSrc && (
                <img
                  src={header.flagSrc}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-6 object-cover rounded-sm"
                />
              )}
            </div>
          </div>
          {helpText && (
            <button
              type="button"
              onClick={() => {
                click();
                setHelpOpen(true);
              }}
              className="shrink-0 w-7 h-7 flex items-center justify-center text-white/45 hover:text-white transition-colors outline-none focus:outline-none"
              style={{
                fontFamily: 'Oxanium, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
              }}
              aria-label="How this mode works"
              data-testid="setup-help"
            >
              ?
            </button>
          )}
        </div>

        {header.phase && <div className="mt-3">{header.phase}</div>}

        {mapImageSrc && (
          <div className="flex items-center justify-center py-2 md:py-4 overflow-visible px-2">
            <div className={cn('w-full overflow-visible p-1', mapStageClass ?? DEFAULT_MAP_STAGE_CLASS)}>
              <img
                src={mapImageSrc}
                alt={`${header.title} circuit`}
                className="h-full w-full object-contain"
                style={invertMap ? { filter: 'invert(1)' } : undefined}
              />
            </div>
          </div>
        )}

        <div className={mapImageSrc ? 'mt-0' : 'mt-4'}>
          {rows.map((spec) => (
            <SetupRow
              key={spec.id}
              /* The card owns the click so every row sounds identical and callers can't forget. */
              spec={{ ...spec, onSelect: (id) => { click(); spec.onSelect(id); } }}
            />
          ))}

          {readouts?.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 py-3 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              data-testid={`setup-readout-${r.label.toLowerCase()}`}
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: 'Oxanium, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '0.24em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {r.label}
              </span>
              <span
                className="font-bold text-sm md:text-base uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif', color: 'rgba(255,255,255,0.5)' }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {children}

        <motion.button
          whileHover={!start.disabled ? { scale: 1.02 } : undefined}
          whileTap={!start.disabled ? { scale: 0.98 } : undefined}
          onClick={() => {
            if (start.disabled) return;
            click();
            start.onStart();
          }}
          className={cn(
            'mt-4 w-full py-3.5 rounded-xl font-bold text-base md:text-lg uppercase tracking-wider text-white',
            start.disabled && 'opacity-40 cursor-not-allowed',
          )}
          style={{
            fontFamily: 'Oxanium, sans-serif',
            backgroundColor: start.disabled ? '#999999' : TONE_COLORS[start.tone],
            animation: start.disabled ? 'none' : `pulse-${start.tone} 2s infinite`,
          }}
          data-testid="button-start-race"
        >
          {start.label}
        </motion.button>

        {onBack && (
          <button
            type="button"
            onClick={() => {
              click();
              onBack();
            }}
            className="mt-3 transition-colors text-xs uppercase tracking-wider text-white/45 hover:text-white"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
            data-testid="button-back-menu"
          >
            Back
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {helpOpen && helpText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setHelpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-[20px] p-6 backdrop-blur-xl"
              style={{
                backgroundColor: 'rgba(30,30,32,0.96)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid="setup-help-sheet"
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-base font-bold uppercase tracking-wider text-white"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  {header.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p
                className="text-white/70"
                style={{ fontFamily: 'Oxanium, sans-serif', fontSize: '0.8rem', lineHeight: 1.6 }}
              >
                {helpText}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          50% { box-shadow: 0 0 20px 10px rgba(22, 163, 74, 0.3); }
        }
        @keyframes pulse-amber {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          50% { box-shadow: 0 0 20px 10px rgba(245, 158, 11, 0.3); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          50% { box-shadow: 0 0 20px 10px rgba(220, 38, 38, 0.3); }
        }
      `}</style>
    </div>
  );
}
