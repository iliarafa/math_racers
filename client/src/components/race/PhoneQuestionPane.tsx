import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PhoneQuestionPaneProps {
  questionDisplay?: string;
  answerDisplay: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  /** Short flash over the numbers, e.g. "+5s". Null when quiet. */
  penaltyFlash: string | null;
  showFinalLap: boolean;
  onFinalLapDone: () => void;
  /** GP Race Day: viewport-only sizes, the question nudged down and more room above the slot. */
  raceDay?: boolean;
  /** GP Race Day: the shell flashes a solid sector colour, so the numbers turn white. */
  flashWhite?: boolean;
}

/**
 * Phone twin of the desktop `QuestionPane`: the problem and the typed answer (grey, then green
 * or red on feedback), the penalty flash over them, and the reserved FINAL LAP slot underneath.
 * Returns two siblings for the racing column; outside Race Day the sizes read the column's
 * height (`cqh`), so the column must be a size container.
 */
export function PhoneQuestionPane({
  questionDisplay,
  answerDisplay,
  feedback,
  penaltyFlash,
  showFinalLap,
  onFinalLapDone,
  raceDay = false,
  flashWhite = false,
}: PhoneQuestionPaneProps) {
  return (
    <>
      <div className={cn("relative", raceDay ? "mt-0" : "mt-6 sm:mt-8")}>
        <div
          className={cn(
            "font-bold tracking-tight leading-none text-center px-2 max-w-full",
            raceDay ? "text-[clamp(3.375rem,10.5dvh,6rem)] translate-y-10" : "text-[clamp(2.75rem,min(7.6dvh,22cqh),4.75rem)]",
            flashWhite && "text-white"
          )}
          data-testid="display-question"
        >
          {questionDisplay}
        </div>

        <div
          className={cn(
            "font-bold min-w-[80px] text-center leading-none",
            raceDay ? "mt-4 text-[clamp(4.5rem,14dvh,8rem)]" : "-mt-2 text-[clamp(2.75rem,min(7.6dvh,22cqh),4.75rem)]",
            flashWhite && "text-white",
            !flashWhite && feedback === 'idle' && "text-muted-foreground/50",
            !flashWhite && feedback === 'correct' && "text-green-600",
            !flashWhite && feedback === 'incorrect' && "text-red-600"
          )}
          data-testid="display-answer"
        >
          {answerDisplay}
        </div>

        {/* Penalty Flash Overlay */}
        <AnimatePresence>
          {penaltyFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [1, 0.2, 1, 0.2, 1], scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <span
                className="font-bold text-red-600 text-[clamp(1.75rem,4.5dvh,2.75rem)]"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                {penaltyFlash}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reserved slot so FINAL LAP never sits on the numbers */}
      <div className={cn("h-11 shrink-0 flex items-center justify-center mt-3", raceDay && "mt-6")}>
        <AnimatePresence mode="wait">
          {showFinalLap ? (
            <motion.div
              key="final-lap"
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.28, repeat: 2 }}
              onAnimationComplete={onFinalLapDone}
              className="text-white px-3 py-0.5 rounded-lg font-bold text-xs bg-red-600 uppercase tracking-widest"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              FINAL LAP
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
