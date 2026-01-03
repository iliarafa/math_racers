import { useEffect, useRef, useState } from "react";
import { Circuit } from "@/lib/gameLogic";
import carImage from "@assets/generated_images/top_down_view_of_a_red_f1_race_car_vector_illustration.png";

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
  const [carRotation, setCarRotation] = useState(0);

  const isDrsActive = circuit.drsZones.includes(progress);

  const VIEWBOX_WIDTH = 300;
  const VIEWBOX_HEIGHT = 160;

  useEffect(() => {
    if (!s1Ref.current || !s2Ref.current || !s3Ref.current) return;

    const s1Length = s1Ref.current.getTotalLength();
    const s2Length = s2Ref.current.getTotalLength();
    const s3Length = s3Ref.current.getTotalLength();
    const totalLength = s1Length + s2Length + s3Length;

    const progressRatio = total > 0 ? Math.min(progress / total, 1) : 0;
    const targetLength = progressRatio * totalLength;

    let point: DOMPoint;
    let nextPoint: DOMPoint;
    const lookAhead = 5;

    const getPointAt = (length: number) => {
      if (length <= s1Length) {
        return s1Ref.current!.getPointAtLength(length);
      } else if (length <= s1Length + s2Length) {
        return s2Ref.current!.getPointAtLength(length - s1Length);
      } else {
        const distOnS3 = Math.min(length - s1Length - s2Length, s3Length);
        return s3Ref.current!.getPointAtLength(distOnS3);
      }
    };

    point = getPointAt(targetLength);
    nextPoint = getPointAt(Math.min(targetLength + lookAhead, totalLength));

    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    const xPercent = (point.x / VIEWBOX_WIDTH) * 100;
    const yPercent = (point.y / VIEWBOX_HEIGHT) * 100;

    setCarPosition({ x: xPercent, y: yPercent });
    setCarRotation(angle);
  }, [progress, total, circuit.paths.s1, circuit.paths.s2, circuit.paths.s3]);

  return (
    <div className="w-full max-w-2xl mx-auto" data-testid="track-progress">
      <div 
        id="circuit-visualizer" 
        className="relative mx-auto w-[300px] h-[160px] md:w-[450px] md:h-[240px] bg-neutral-900 rounded-xl overflow-hidden"
        style={{
          boxShadow: isDrsActive 
            ? '0 0 30px rgba(0, 255, 100, 0.4), inset 0 0 60px rgba(0, 255, 100, 0.1)' 
            : '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <svg viewBox="0 0 300 160" className="w-full h-full" style={{ overflow: 'visible' }}>
          <defs>
            <filter id="trackGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="drsGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <path
            d={circuit.paths.s1}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={circuit.paths.s2}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={circuit.paths.s3}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            ref={s1Ref}
            id="track-s1"
            d={circuit.paths.s1}
            stroke={SECTOR_COLORS.s1}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trackGlow)"
          />
          <path
            ref={s2Ref}
            id="track-s2"
            d={circuit.paths.s2}
            stroke={SECTOR_COLORS.s2}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trackGlow)"
          />
          <path
            ref={s3Ref}
            id="track-s3"
            d={circuit.paths.s3}
            stroke={SECTOR_COLORS.s3}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trackGlow)"
          />
        </svg>

        {isDrsActive && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(0, 255, 100, 0.1) 0%, transparent 70%)',
              animation: 'pulse 0.5s ease-in-out infinite alternate'
            }}
          />
        )}

        <div
          className="speed-trail"
          style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: isDrsActive 
              ? 'radial-gradient(circle, rgba(0, 255, 100, 0.6) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255, 40, 0, 0.4) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            left: `${carPosition.x}%`,
            top: `${carPosition.y}%`,
            opacity: 0.8,
            filter: 'blur(4px)',
            transition: 'left 0.15s ease-out, top 0.15s ease-out',
            zIndex: 5
          }}
        />

        <div
          id="racing-car"
          style={{
            position: 'absolute',
            width: '28px',
            height: '28px',
            transform: `translate(-50%, -50%) rotate(${carRotation}deg)`,
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), top 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease-out',
            zIndex: 10,
            left: `${carPosition.x}%`,
            top: `${carPosition.y}%`,
            filter: isDrsActive ? 'drop-shadow(0 0 8px rgba(0, 255, 100, 0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}
        >
          <img 
            src={carImage} 
            alt="Racing car" 
            className="w-full h-full object-contain"
            style={{ 
              filter: 'brightness(1.1) contrast(1.1)'
            }}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-muted-foreground mt-3 px-2">
        <span className="font-mono">LAP {progress} / {total}</span>
        <div id="dashboard-container" className="flex gap-3 items-center">
          <div
            id="drs-indicator"
            data-testid="drs-indicator"
            className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all duration-300 ${
              isDrsActive 
                ? 'bg-green-500 text-black shadow-lg shadow-green-500/50 scale-110' 
                : 'bg-neutral-700 text-neutral-400'
            }`}
          >
            {isDrsActive ? 'DRS ON' : 'DRS'}
          </div>
          {showPenalty && (
            <div
              id="penalty-light"
              data-testid="penalty-light"
              className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold animate-pulse"
            >
              !
            </div>
          )}
        </div>
        <span className="font-mono">{Math.round((progress / total) * 100)}%</span>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
