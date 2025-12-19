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
      <svg 
        viewBox="0 0 300 160" 
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      >
        <path
          d={circuit.pathData}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          ref={pathRef}
          d={circuit.pathData}
          fill="none"
          stroke="#d4d4d4"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d={circuit.pathData}
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="8 8"
          strokeLinecap="round"
        />
        
        <circle
          cx={carPosition.x}
          cy={carPosition.y}
          r="8"
          fill="var(--team-color)"
          stroke="white"
          strokeWidth="3"
          style={{ 
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transition: 'cx 0.3s ease-out, cy 0.3s ease-out'
          }}
        />
      </svg>
      
      <div className="flex justify-between text-sm text-muted-foreground mt-2 px-1">
        <span>Lap {progress} / {total}</span>
        <span>{Math.round((progress / total) * 100)}%</span>
      </div>
    </div>
  );
}
