import { cn } from '@/lib/utils';

type SectorColor = 'purple' | 'green' | 'yellow' | 'red';

type SectorCell = {
  sectorColor?: SectorColor;
};

interface SectorProgressGridProps {
  progress: number;
  raceLength: number;
  sectorResults: SectorCell[];
  rivalProgress?: number;
  rivalSectorResults?: SectorCell[];
  showRival?: boolean;
  currentSectorRed?: boolean;
  /** Sim / Free Practice single grid vs dual bot+player rows */
  layout: 'single' | 'dual';
  /** Quick Race center-slot presentation: 4-across × 5-down grids, side by side vs the rival. */
  big?: boolean;
  /** GP Practice (3×10) and Qualifying (2×10): large squares with 24px side padding. */
  largeTenCol?: boolean;
  labelRight: string;
  labelRightClassName?: string;
  rivalLabel?: string;
  className?: string;
}

function cellClass(
  isCompleted: boolean,
  isCurrent: boolean,
  color: SectorColor | undefined,
  currentSectorRed: boolean,
  dim: boolean
): string {
  if (isCompleted && color) {
    const map = {
      purple: dim ? 'bg-purple-500/70' : 'bg-purple-500',
      green: dim ? 'bg-green-500/70' : 'bg-green-500',
      yellow: dim ? 'bg-yellow-500/70' : 'bg-yellow-500',
      red: dim ? 'bg-red-500/70' : 'bg-red-500',
    } as const;
    return map[color] ?? 'bg-muted';
  }
  if (isCurrent) {
    return currentSectorRed ? 'bg-red-500 animate-pulse' : 'bg-gray-400/50 animate-pulse';
  }
  return 'bg-muted';
}

export function SectorProgressGrid({
  progress,
  raceLength,
  sectorResults,
  rivalProgress = 0,
  rivalSectorResults = [],
  showRival = false,
  currentSectorRed = false,
  layout,
  big = false,
  largeTenCol = false,
  labelRight,
  labelRightClassName,
  rivalLabel = 'BOT',
  className,
}: SectorProgressGridProps) {
  if (big) {
    const bigGrid = (keyPrefix: string, gridProgress: number, results: SectorCell[], isPlayer: boolean) => (
      <div className="grid grid-cols-4 gap-1 w-full">
        {Array.from({ length: raceLength }).map((_, i) => (
          <div
            key={`${keyPrefix}-${i}`}
            className={cn(
              'aspect-square rounded-md transition-colors',
              cellClass(
                i < gridProgress,
                isPlayer && i === gridProgress,
                results[i]?.sectorColor,
                isPlayer ? currentSectorRed : false,
                !isPlayer
              )
            )}
          />
        ))}
      </div>
    );
    const bigLabel = (text: string) => (
      <span
        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        style={{ fontFamily: 'Oxanium, sans-serif' }}
      >
        {text}
      </span>
    );

    return (
      <div
        className={cn('flex flex-col items-center gap-1.5 w-full', className)}
        data-testid="sector-progress-grid"
      >
        <div className="flex justify-center gap-6 w-full">
          <div className="flex flex-col items-center gap-1 w-full max-w-[9.5rem]">
            {bigLabel('You')}
            {bigGrid('player', progress, sectorResults, true)}
          </div>
          {showRival && (
            <div className="flex flex-col items-center gap-1 w-full max-w-[9.5rem]">
              {bigLabel(rivalLabel)}
              {bigGrid('rival', rivalProgress, rivalSectorResults, false)}
            </div>
          )}
        </div>
        <div className="flex justify-between w-full max-w-xs text-muted-foreground mt-0.5 px-1 text-xs">
          <span>
            Lap {Math.min(progress + 1, raceLength)}/{raceLength}
          </span>
          <span className={labelRightClassName}>{labelRight}</span>
        </div>
      </div>
    );
  }

  const cols = raceLength >= 40 ? 20 : layout === 'dual' ? 20 : 10;
  const rootClass = cn(
    'flex flex-col justify-center gap-1 my-3 w-full',
    largeTenCol ? 'self-stretch px-2 max-w-none' : 'max-w-md md:max-w-xl lg:max-w-2xl mx-auto',
    className
  );
  const gridStyle = largeTenCol
    ? { gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px' }
    : {
        gridTemplateColumns: `repeat(${cols}, 18.5px)`,
        gap: '2px',
        justifyContent: 'center',
      };

  if (layout === 'single' || !showRival) {
    return (
      <div
        className={rootClass}
        data-testid="sector-progress-grid"
      >
        <div
          className={cn('grid', !largeTenCol && '-mx-2')}
          style={gridStyle}
        >
          {Array.from({ length: raceLength }).map((_, i) => (
            <div
              key={i}
              className={cn(
                largeTenCol ? 'aspect-square w-full rounded-[3px] transition-colors' : 'size-[18.5px] rounded-[2px] transition-colors',
                cellClass(i < progress, i === progress, sectorResults[i]?.sectorColor, currentSectorRed, false)
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-muted-foreground mt-0.5 px-1 text-xs">
          <span>
            Lap {Math.min(progress + 1, raceLength)}/{raceLength}
          </span>
          <span className={labelRightClassName}>{labelRight}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={rootClass}
      data-testid="sector-progress-grid"
    >
      <div className="flex flex-col gap-1.5">
        <div>
          <span className="text-[9px] text-foreground font-medium uppercase leading-none">
            {rivalLabel}
          </span>
          <div
            className="grid -mx-2 mt-0.5"
            style={{ gridTemplateColumns: 'repeat(20, 18.5px)', gap: '2px', justifyContent: 'center' }}
          >
            {Array.from({ length: raceLength }).map((_, i) => (
              <div
                key={`rival-${i}`}
                className={cn(
                  'size-[18.5px] rounded-[2px] transition-colors',
                  cellClass(
                    i < rivalProgress,
                    false,
                    rivalSectorResults[i]?.sectorColor,
                    false,
                    true
                  )
                )}
              />
            ))}
          </div>
        </div>
        <div
          className="grid -mx-2"
          style={{ gridTemplateColumns: 'repeat(20, 18.5px)', gap: '2px', justifyContent: 'center' }}
        >
          {Array.from({ length: raceLength }).map((_, i) => (
            <div
              key={`player-${i}`}
              className={cn(
                'size-[18.5px] rounded-[2px] transition-colors',
                cellClass(i < progress, i === progress, sectorResults[i]?.sectorColor, currentSectorRed, false)
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-foreground mt-0.5 px-1 text-[11px]">
        <span>
          Lap {Math.min(progress + 1, raceLength)}/{raceLength}
        </span>
        <span className={labelRightClassName}>{labelRight}</span>
      </div>
    </div>
  );
}
