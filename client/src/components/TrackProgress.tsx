import { useEffect, useRef, useState } from "react";
import { Circuit } from "@/lib/gameLogic";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
}

const SECTOR_COLORS = {
  s1: "#ff2800",
  s2: "#0600ef", 
  s3: "#ffd700"
};

export function TrackProgress({ circuit, progress, total, showPenalty = false }: TrackProgressProps) {
  const s1Ref = useRef<SVGPathElement>(null);
  const s2Ref = useRef<SVGPathElement>(null);
  const s3Ref = useRef<SVGPathElement>(null);
  const [carPosition, setCarPosition] = useState({ x: 0, y: 0 });

  const isDrsActive = circuit.drsZones.includes(progress);

  useEffect(() => {
    if (circuit.trackImageUrl) return;
    if (!s1Ref.current || !s2Ref.current || !s3Ref.current) return;

    const s1Length = s1Ref.current.getTotalLength();
    const s2Length = s2Ref.current.getTotalLength();
    const s3Length = s3Ref.current.getTotalLength();
    const totalLength = s1Length + s2Length + s3Length;

    const progressRatio = total > 0 ? Math.min(progress / total, 1) : 0;
    const targetLength = progressRatio * totalLength;

    let point: DOMPoint;
    if (targetLength <= s1Length) {
      point = s1Ref.current.getPointAtLength(targetLength);
    } else if (targetLength <= s1Length + s2Length) {
      point = s2Ref.current.getPointAtLength(targetLength - s1Length);
    } else {
      const distOnS3 = Math.min(targetLength - s1Length - s2Length, s3Length);
      point = s3Ref.current.getPointAtLength(distOnS3);
    }

    setCarPosition({ x: point.x, y: point.y });
  }, [progress, total, circuit.paths.s1, circuit.paths.s2, circuit.paths.s3, circuit.trackImageUrl]);

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="track-progress">
      {circuit.trackImageUrl ? (
        <div className="relative mx-auto">
          <img 
            src={circuit.trackImageUrl} 
            alt={`${circuit.name} track map`}
            className="w-full h-auto max-h-[200px] md:max-h-[280px] object-contain"
            style={{ mixBlendMode: 'screen' }}
          />
        </div>
      ) : (
        <div 
          id="circuit-visualizer" 
          className="relative mx-auto w-[200px] h-[107px] md:w-[300px] md:h-[160px]"
        >
          <svg viewBox="0 0 300 160" className="w-full h-full" style={{ overflow: 'visible' }}>
            <path
              ref={s1Ref}
              id="track-s1"
              d={circuit.paths.s1}
              stroke={SECTOR_COLORS.s1}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={s2Ref}
              id="track-s2"
              d={circuit.paths.s2}
              stroke={SECTOR_COLORS.s2}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={s3Ref}
              id="track-s3"
              d={circuit.paths.s3}
              stroke={SECTOR_COLORS.s3}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            id="racing-car"
            style={{
              position: 'absolute',
              fontSize: '24px',
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.3s ease',
              zIndex: 10,
              left: `${carPosition.x}px`,
              top: `${carPosition.y}px`
            }}
          >
            🏎️
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center text-sm text-muted-foreground mt-2 px-1">
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
