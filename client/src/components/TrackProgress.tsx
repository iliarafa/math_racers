import { Circuit } from "@/lib/gameLogic";
import { Flag } from "lucide-react";

interface TrackProgressProps {
  circuit: Circuit;
  progress: number;
  total: number;
  showPenalty?: boolean;
}

export function TrackProgress({ circuit, progress, total, showPenalty = false }: TrackProgressProps) {
  const isDrsActive = circuit.drsZones.includes(progress);
  const progressPercentage = (progress / total) * 100;

  return (
    <div className="w-full max-w-lg mx-auto" data-testid="track-progress">
      {/* Circuit Name */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">{circuit.name}</h3>
        <p className="text-sm text-muted-foreground">{circuit.type}</p>
      </div>

      {/* Progress Bar Track */}
      <div className="relative">
        {/* Track background */}
        <div className="h-8 bg-neutral-800 rounded-full border-2 border-neutral-700 overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
            data-testid="progress-bar"
          >
            {/* Racing stripes effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Car indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ left: `${progressPercentage}%`, marginLeft: '-12px' }}
        >
          <div className="w-6 h-6 bg-white rounded-full border-2 border-red-600 shadow-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Finish line */}
        <div className="absolute top-1/2 -translate-y-1/2 right-0 mr-1">
          <Flag className="w-5 h-5 text-neutral-500" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between items-center text-sm text-muted-foreground mt-4 px-1">
        <span className="font-mono">{progress} / {total}</span>
        <div className="flex gap-3">
          <div
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              isDrsActive
                ? 'bg-green-600 text-white animate-pulse'
                : 'bg-neutral-800 text-neutral-500'
            }`}
            data-testid="drs-indicator"
          >
            DRS {isDrsActive ? 'ON' : ''}
          </div>
          {showPenalty && (
            <div
              className="px-3 py-1 rounded text-xs font-bold bg-red-600 text-white animate-pulse"
              data-testid="penalty-light"
            >
              PENALTY!
            </div>
          )}
        </div>
        <span className="font-mono">{Math.round(progressPercentage)}%</span>
      </div>
    </div>
  );
}
