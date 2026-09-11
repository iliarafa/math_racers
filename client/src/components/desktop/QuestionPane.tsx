import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RaceStatusSlot, type RaceStatusSlotProps } from "./RaceStatusSlot";

export interface QuestionPaneProps {
  questionDisplay: string;
  answerDisplay: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  /** Short flash over the numbers, e.g. "+5s" or a multiplayer penalty line. Null when quiet. */
  penaltyFlash: string | null;
  status: RaceStatusSlotProps;
  /** Rendered between the question and the answer (the sector grid). */
  between?: ReactNode;
  /** GP Race Day: the shell flashes a solid sector colour, so all type turns white. */
  flashWhite?: boolean;
}

/**
 * Centre of the desktop race: the problem and the typed answer at a size you can read from
 * across the room, with the status slot underneath.
 */
export function QuestionPane({ questionDisplay, answerDisplay, feedback, penaltyFlash, status, between, flashWhite = false }: QuestionPaneProps) {
  return (
    <div className="flex flex-col items-center w-full" data-testid="question-pane">
      <div className="relative w-full flex flex-col items-center">
        <div
          className={cn(
            "font-bold tracking-tight leading-none text-center px-2 max-w-full",
            "text-[clamp(5rem,20dvh,14rem)]",
            flashWhite && "text-white",
          )}
          data-testid="desktop-question"
        >
          {questionDisplay}
        </div>
        {between && <div className="w-[min(60vw,560px)] py-2">{between}</div>}
        <div
          className={cn(
            "font-bold min-w-[160px] text-center leading-none",
            between ? "mt-0" : "mt-2",
            "text-[clamp(5.5rem,22dvh,15rem)]",
            flashWhite && "text-white",
            !flashWhite && feedback === 'idle' && "text-muted-foreground/50",
            !flashWhite && feedback === 'correct' && "text-green-600",
            !flashWhite && feedback === 'incorrect' && "text-red-600",
          )}
          data-testid="display-answer"
        >
          {answerDisplay}
        </div>

        <AnimatePresence>
          {penaltyFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [1, 0.2, 1, 0.2, 1], scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
              <span className="font-bold text-red-600 text-[clamp(3rem,9dvh,6rem)]" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                {penaltyFlash}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RaceStatusSlot {...status} className="mt-4" />
    </div>
  );
}
