import { Circuit } from "@/lib/gameLogic";
import monzaTrackImage from "@assets/IMG_0347_1767829723287.png";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
}

const TURN_POSITIONS = [
  { id: 1, x: 443, y: 578 },
  { id: 2, x: 443, y: 442 },
  { id: 3, x: 253, y: 442 },
  { id: 4, x: 163, y: 328 },
  { id: 5, x: 100, y: 275 },
  { id: 6, x: 110, y: 160 },
  { id: 7, x: 248, y: 82 },
  { id: 8, x: 512, y: 328 },
  { id: 9, x: 560, y: 255 },
  { id: 10, x: 565, y: 392 },
  { id: 11, x: 945, y: 295 },
];

const HIGHLIGHT_RADIUS = 23;

export function TrackProgress({ circuit, progress, total, showPenalty = false }: TrackProgressProps) {
  const isDrsActive = circuit.drsZones.includes(progress);
  const currentTurn = progress + 1;

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="track-progress">
      <div
        id="circuit-visualizer"
        className="relative mx-auto flex justify-center items-center"
      >
        <svg
          viewBox="0 0 1080 720"
          className="w-full max-w-[400px] h-auto"
          style={{ overflow: 'visible' }}
        >
          <image
            href={monzaTrackImage}
            width="1080"
            height="720"
            data-testid="track-image"
          />
          {TURN_POSITIONS.map((turn) => (
            <circle
              key={turn.id}
              cx={turn.x}
              cy={turn.y}
              r={HIGHLIGHT_RADIUS}
              fill={currentTurn === turn.id ? "rgba(0, 255, 0, 0.5)" : "transparent"}
              stroke={currentTurn === turn.id ? "#00ff00" : "transparent"}
              strokeWidth="3"
              className={currentTurn === turn.id ? "turn-highlight-active" : ""}
              data-testid={`turn-highlight-${turn.id}`}
              style={{
                filter: currentTurn === turn.id ? "drop-shadow(0 0 8px #00ff00)" : "none",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 px-1">
        <span>Lap {progress} / {total}</span>
        <div id="dashboard-container" style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
          <div
            id="drs-indicator"
            data-testid="drs-indicator"
            className={`drs-box ${isDrsActive ? 'drs-active' : ''}`}
          >
            {isDrsActive ? 'DRS ON' : 'DRS'}
          </div>
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
