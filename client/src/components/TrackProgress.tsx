import type { ReactNode } from 'react';
import type { Circuit } from '@/lib/gameLogic';
import { LiveCircuitMap, type LiveCircuitSector } from '@/components/LiveCircuitMap';

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
  rivalProgress?: number;
  showRival?: boolean;
  sectorResults?: LiveCircuitSector[];
  rivalSectorResults?: Array<{ sectorColor: LiveCircuitSector['sectorColor'] }>;
  currentSectorRed?: boolean;
  overtakeActive?: boolean;
  aeroActive?: boolean;
  isWet?: boolean;
  labelRight?: ReactNode;
  labelRightClassName?: string;
  variant?: 'hud' | 'results';
  playerLabel?: string;
  rivalLabel?: string;
}

/** Compatibility wrapper — race HUD uses LiveCircuitMap under the hood. */
export function TrackProgress({
  circuit,
  progress,
  total,
  showPenalty = false,
  rivalProgress = 0,
  showRival = false,
  sectorResults = [],
  rivalSectorResults,
  currentSectorRed = false,
  overtakeActive = false,
  aeroActive = false,
  isWet = false,
  labelRight,
  labelRightClassName,
  variant = 'hud',
  playerLabel,
  rivalLabel,
}: TrackProgressProps) {
  return (
    <LiveCircuitMap
      circuit={circuit}
      progress={progress}
      rivalProgress={rivalProgress}
      raceLength={total}
      sectorResults={sectorResults}
      rivalSectorResults={rivalSectorResults}
      showRival={showRival}
      currentSectorRed={currentSectorRed || showPenalty}
      overtakeActive={overtakeActive}
      aeroActive={aeroActive}
      isWet={isWet}
      variant={variant}
      labelRight={labelRight}
      labelRightClassName={labelRightClassName}
      playerLabel={playerLabel}
      rivalLabel={rivalLabel}
    />
  );
}
