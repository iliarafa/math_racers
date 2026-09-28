import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RaceStatusSlotProps {
  showFinalLap: boolean;
  onFinalLapDone: () => void;
  className?: string;
}

/**
 * Reserved slot under the answer so FINAL LAP never sits on the numbers.
 * Desktop copy of the slot in Game.tsx / Multiplayer.tsx, a little taller.
 */
export function RaceStatusSlot({ showFinalLap, onFinalLapDone, className }: RaceStatusSlotProps) {
  return (
    <div className={cn("h-14 shrink-0 flex items-center justify-center", className)} data-testid="race-status-slot">
      <AnimatePresence mode="wait">
        {showFinalLap ? (
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
        ) : null}
      </AnimatePresence>
    </div>
  );
}
