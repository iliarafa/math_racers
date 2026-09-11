import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import trackLimitsFlag from "@/assets/track-limits-flag.png";

export interface RaceStatusSlotProps {
  showPenalty: boolean;
  showBlackWhiteFlag: boolean;
  showFinalLap: boolean;
  onFinalLapDone: () => void;
  showCorrect: boolean;
  className?: string;
}

/**
 * Reserved slot under the answer so TRACK LIMITS, FINAL LAP and Correct never sit on the
 * numbers. Desktop copy of the slot in Game.tsx / Multiplayer.tsx, a little taller.
 */
export function RaceStatusSlot({ showPenalty, showBlackWhiteFlag, showFinalLap, onFinalLapDone, showCorrect, className }: RaceStatusSlotProps) {
  return (
    <div className={cn("h-14 shrink-0 flex items-center justify-center", className)} data-testid="race-status-slot">
      <AnimatePresence mode="wait">
        {showPenalty ? (
          <motion.div
            key="track-limits"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 pointer-events-none"
          >
            {showBlackWhiteFlag && (
              <img src={trackLimitsFlag} alt="Black and White Flag" className="h-10 w-14 object-cover rounded" />
            )}
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.3, repeat: 3 }}
              className="text-white px-4 py-1 rounded-lg font-bold text-base bg-red-600"
            >
              TRACK LIMITS
            </motion.div>
          </motion.div>
        ) : showFinalLap ? (
          <motion.div
            key="final-lap"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.28, repeat: 2 }}
            onAnimationComplete={onFinalLapDone}
            className="text-white px-4 py-1 rounded-lg font-bold text-base bg-red-600 uppercase tracking-widest"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            FINAL LAP
          </motion.div>
        ) : showCorrect ? (
          <motion.div
            key="correct"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-green-600 font-medium flex items-center gap-1.5 text-lg"
          >
            <Check className="w-5 h-5" /> Correct
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
