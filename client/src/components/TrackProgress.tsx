import { Circuit } from "@/lib/gameLogic";
import monzaTrackImage from "@assets/monza.png";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
}

// Monza circuit positions (1920x1080 image) - 20 positions following the racing line
const MONZA_POSITIONS = [
  { id: 1, x: 1640, y: 720 },   // Start/Finish line
  { id: 2, x: 1480, y: 720 },   // Approaching Turn 1
  { id: 3, x: 380, y: 770 },    // Turn 1 (First chicane)
  { id: 4, x: 280, y: 680 },    // Turn 2 (Second chicane)
  { id: 5, x: 240, y: 360 },    // Turn 3 exit
  { id: 6, x: 200, y: 280 },    // Approaching Roggia
  { id: 7, x: 160, y: 200 },    // Turn 4 (Roggia entry)
  { id: 8, x: 200, y: 120 },    // Turn 5 (Roggia exit)
  { id: 9, x: 270, y: 80 },     // Approaching Lesmo
  { id: 10, x: 160, y: 60 },    // Turn 6 (Lesmo 1)
  { id: 11, x: 210, y: 30 },    // Turn 7 (Lesmo 2) - DRS Zone 1
  { id: 12, x: 380, y: 90 },    // Long straight
  { id: 13, x: 720, y: 220 },   // Mid straight
  { id: 14, x: 820, y: 285 },   // Turn 8 (Ascari entry)
  { id: 15, x: 780, y: 360 },   // Turn 9 (Ascari middle)
  { id: 16, x: 820, y: 410 },   // Turn 10 (Ascari exit)
  { id: 17, x: 1100, y: 480 },  // Approaching Parabolica
  { id: 18, x: 1400, y: 540 },  // Turn 11 (Parabolica entry)
  { id: 19, x: 1640, y: 600 },  // Parabolica exit
  { id: 20, x: 1640, y: 660 },  // Final straight - DRS Zone 2
];

const HIGHLIGHT_RADIUS = 18;

export function TrackProgress({ circuit, progress, total, showPenalty = false }: TrackProgressProps) {
  const isDrsActive = circuit.drsZones.includes(progress);
  const currentPosition = progress;

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="track-progress">
      <div
        id="circuit-visualizer"
        className="relative mx-auto flex justify-center items-center"
      >
        <svg
          viewBox="0 0 1920 1080"
          className="w-full max-w-[500px] h-auto"
          style={{ overflow: 'visible' }}
        >
          <image
            href={monzaTrackImage}
            width="1920"
            height="1080"
            data-testid="track-image"
          />
          {MONZA_POSITIONS.map((position, index) => (
            <circle
              key={position.id}
              cx={position.x}
              cy={position.y}
              r={HIGHLIGHT_RADIUS}
              fill={currentPosition === index ? "rgba(255, 0, 0, 0.7)" : "transparent"}
              stroke={currentPosition === index ? "#ff0000" : "transparent"}
              strokeWidth="4"
              className={currentPosition === index ? "car-position-active" : ""}
              data-testid={`position-${position.id}`}
              style={{
                filter: currentPosition === index ? "drop-shadow(0 0 12px #ff0000)" : "none",
                transition: "all 0.4s ease-in-out"
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
