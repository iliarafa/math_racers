import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GhostDigits } from "@/lib/answerReveal";
import { RadioDigits } from "@/components/race/RadioDigits";
import { RaceStatusSlot, type RaceStatusSlotProps } from "./RaceStatusSlot";

export interface QuestionPaneProps {
  questionDisplay: string;
  answerDisplay: string;
  feedback: 'idle' | 'correct' | 'incorrect';
  /** Team radio: the revealed answer, drawn in the answer element in place of answerDisplay. */
  radio?: GhostDigits | null;
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
 * Fills the centre slot. The grid and the status slot keep their height; the question and the
 * answer share what is left (20:22), each up to its full size, and fill their share (`100cqh`),
 * so on a short window the numbers shrink instead of spilling over the HUD rows.
 */
export function QuestionPane({ questionDisplay, answerDisplay, feedback, radio = null, penaltyFlash, status, between, flashWhite = false }: QuestionPaneProps) {
  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center" data-testid="question-pane">
      <div className="flex-[20] min-h-12 max-h-[clamp(5rem,20dvh,14rem)] w-full flex items-end justify-center [container-type:size]">
        <div
          className={cn(
            // One line: 18cqw fits the longest question. leading-none stays after the font size,
            // because cn() drops a line-height that comes before one.
            "font-bold tracking-tight text-center px-2 whitespace-nowrap",
            "text-[min(clamp(5rem,20dvh,14rem),100cqh,18cqw)] leading-none",
            flashWhite && "text-white",
          )}
          data-testid="desktop-question"
        >
          {questionDisplay}
        </div>
      </div>
      {between && <div className="w-[min(60vw,560px)] py-2 shrink-0">{between}</div>}
      <div className={cn("flex-[22] min-h-12 max-h-[clamp(5.5rem,22dvh,15rem)] w-full [container-type:size]", !between && "mt-2")}>
        <div
          className={cn(
            "font-bold min-w-[160px] text-center",
            "text-[min(clamp(5.5rem,22dvh,15rem),100cqh)] leading-none",
            flashWhite && "text-white",
            !flashWhite && feedback === 'idle' && !radio && "text-muted-foreground/50",
            !flashWhite && feedback === 'correct' && "text-green-600",
            !flashWhite && feedback === 'incorrect' && "text-red-600",
          )}
          data-testid="display-answer"
        >
          {radio ? <RadioDigits {...radio} /> : answerDisplay}
        </div>
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

      <RaceStatusSlot {...status} className="mt-4" />
    </div>
  );
}
