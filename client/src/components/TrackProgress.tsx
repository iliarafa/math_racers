import { useEffect, useRef, useState } from "react";
import { Circuit } from "@/lib/gameLogic";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
}

export function TrackProgress({ circuit, progress, total }: TrackProgressProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [carPosition, setCarPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!pathRef.current) return;

    const path = pathRef.current;
    const pathLength = path.getTotalLength();
    const progressRatio = Math.min(progress / total, 1);
    const point = path.getPointAtLength(pathLength * progressRatio);
    
    setCarPosition({ x: point.x, y: point.y });
  }, [progress, total, circuit.pathData]);

  return (
    <div className="w-full max-w-md mx-auto" data-testid="track-progress">
      <div 
        id="circuit-visualizer" 
        style={{ position: 'relative', width: '300px', height: '160px', margin: '0 auto' }}
      >
        <svg width="300" height="160" style={{ overflow: 'visible' }}>
          <path
            ref={pathRef}
            id="track-path"
            d={circuit.pathData}
            stroke="#555"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
          />
          <path
            id="track-centerline"
            d={circuit.pathData}
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
          />
        </svg>
        <div
          id="racing-car"
          style={{
            position: 'absolute',
            fontSize: '24px',
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.5s ease',
            left: `${carPosition.x}px`,
            top: `${carPosition.y}px`
          }}
        >
          🏎️
        </div>
      </div>
      
      <div className="flex justify-between text-sm text-muted-foreground mt-2 px-1">
        <span>Lap {progress} / {total}</span>
        <span>{Math.round((progress / total) * 100)}%</span>
      </div>
    </div>
  );
}
