import { Circuit } from "@/lib/gameLogic";
import monzaTrackImage from "@assets/IMG_0347_1767829723287.png";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
}

export function TrackProgress({ circuit, progress, total, showPenalty = false }: TrackProgressProps) {
  return (
    <div className="w-full max-w-lg mx-auto" data-testid="track-progress">
      <div
        id="circuit-visualizer"
        className="relative mx-auto flex justify-center items-center"
      >
        <img
          src={monzaTrackImage}
          alt="Monza Circuit"
          className="w-full max-w-[400px] h-auto"
          data-testid="track-image"
        />
      </div>

      <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 px-1">
        <span>Lap {progress} / {total}</span>
        <div id="dashboard-container" style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
          {showPenalty && (
            <div
              id="penalty-light"
              data-testid="penalty-light"
              className="penalty-box"
            >
              !
            </div>
          )}
        </div>
        <span>{Math.round((progress / total) * 100)}%</span>
      </div>
    </div>
  );
}
