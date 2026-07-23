import { motion } from 'framer-motion';

export interface SetupOption {
  id: string;
  label: string;
  /** Active text colour. Falls back to white. Ignored for thumb options. */
  color?: string;
  /** Picture options (team cars): the thumb *is* the value — no text is shown beside it. */
  thumb?: string;
  /** Per-thumb transform, e.g. a rotation for the cars. */
  thumbStyle?: React.CSSProperties;
}

export interface SetupRowSpec {
  id: string;
  label: string;
  options: SetupOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

interface SetupRowProps {
  spec: SetupRowSpec;
  /**
   * `dark` (default) suits the glass pit-wall card; `light` recolours the label, divider and
   * value fallback for light surfaces (Multiplayer's waiting-room card). Option `color`s are
   * left alone, so the level rungs keep their series colours on either surface.
   */
  variant?: 'dark' | 'light';
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: '9px',
  letterSpacing: '0.24em',
  color: 'rgba(255,255,255,0.4)',
};

/**
 * One pit-wall setup row: label left, current value right. Tap the row to advance to the
 * next option, wrapping at the end (`Dry → Wet → Random → Dry`).
 *
 * Deliberately affordance-free — no chevron, dots, or arrows. Tapping changes the value and
 * nothing else, and the row never changes height, so the card never reflows (the whole point
 * of cycling over the old expand-in-place row). A thumb-bearing option renders the picture
 * *as* its value with no text beside it — the one visual row (Lane Racer's team cars).
 *
 * A row with a single option is **locked**: it renders as a static, non-interactive readout
 * (no tap, no cursor, no click sound). This is how the TRACK row appears while the menu is
 * pinned to one circuit — see `LOCK_MENU_TO_CURRENT_GP` in `circuitMenuArt.ts`.
 */
export function SetupRow({ spec, variant = 'dark' }: SetupRowProps) {
  const rawIndex = spec.options.findIndex((o) => o.id === spec.selectedId);
  const index = rawIndex >= 0 ? rawIndex : 0;
  const selected = spec.options[index] ?? spec.options[0];
  const interactive = spec.options.length > 1;
  const labelColor = variant === 'light' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)';
  const dividerColor = variant === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const valueFallback = variant === 'light' ? '#111827' : '#ffffff';

  const advance = () => {
    const next = spec.options[(index + 1) % spec.options.length];
    if (next) spec.onSelect(next.id);
  };

  const value = selected?.thumb ? (
    <motion.img
      key={selected.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      src={selected.thumb}
      alt=""
      aria-hidden="true"
      className="h-10 md:h-11 w-16 object-contain"
      style={selected.thumbStyle}
      data-testid={`setup-value-${spec.id}`}
    />
  ) : (
    <motion.span
      key={selected?.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="font-bold text-sm md:text-base uppercase tracking-wider truncate"
      style={{ fontFamily: 'Oxanium, sans-serif', color: selected?.color ?? valueFallback }}
      data-testid={`setup-value-${spec.id}`}
    >
      {selected?.label}
    </motion.span>
  );

  const label = (
    <span className="uppercase shrink-0" style={{ ...LABEL_STYLE, color: labelColor }}>
      {spec.label}
    </span>
  );

  const rowClass = 'w-full flex items-center justify-between gap-3 py-3';

  return (
    <div className="border-b" style={{ borderColor: dividerColor }}>
      {interactive ? (
        <button
          type="button"
          onClick={advance}
          className={`${rowClass} outline-none focus:outline-none focus-visible:outline-none`}
          aria-label={`${spec.label}: ${selected?.label}`}
          data-testid={`setup-row-${spec.id}`}
        >
          {label}
          {value}
        </button>
      ) : (
        // Single option → locked readout: static, non-interactive, no cursor/tap/sound.
        <div className={rowClass} data-testid={`setup-row-${spec.id}`}>
          {label}
          {value}
        </div>
      )}
    </div>
  );
}
