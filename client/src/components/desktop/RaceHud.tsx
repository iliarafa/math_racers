import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/** Top-left corner: mode badge, the clock, and an optional difficulty line. */
export function HudClock({
  badge,
  clock,
  clockClassName,
  subline,
  align = 'start',
}: {
  badge?: ReactNode;
  clock: string;
  clockClassName?: string;
  subline?: ReactNode;
  align?: 'start' | 'end';
}) {
  return (
    <div className={cn("flex flex-col gap-1", align === 'end' ? "items-end" : "items-start")} data-testid="hud-clock">
      {badge && <div className="flex items-center gap-2 text-sm font-medium">{badge}</div>}
      <div className={cn("flex items-center gap-2 font-mono font-medium text-primary text-[clamp(1.5rem,3.4dvh,2.5rem)]", clockClassName)}>
        <Timer className="w-6 h-6" />
        {clock}
      </div>
      {subline && <div className="text-xs uppercase tracking-wider font-bold">{subline}</div>}
    </div>
  );
}

/** Top-right corner pause control. */
export function HudPauseButton({ onPause }: { onPause: () => void }) {
  return (
    <button
      type="button"
      onClick={onPause}
      className="p-2 rounded-lg transition-colors web-hover-darken"
      aria-label="Pause"
      data-testid="button-pause"
    >
      <Pause className="w-7 h-7" />
    </button>
  );
}

/** Transient BOOST / AERO pills. Reserves its height so the corner never jumps. */
export function HudMessages({ boost, aero, botFrozen = false }: { boost: string | null; aero: string | null; botFrozen?: boolean }) {
  return (
    <div className="flex justify-end items-center h-8 gap-2" data-testid="hud-messages">
      <AnimatePresence>
        {boost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn("text-sm font-bold px-3 py-1 rounded-full", botFrozen ? "bg-green-500 text-white" : "bg-yellow-500 text-black")}
          >
            {boost}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {aero && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "text-sm font-bold px-3 py-1 rounded-full",
              aero.includes('BOOST') ? "bg-blue-500 text-white" :
              aero.includes('FAIL') ? "bg-red-500 text-white" :
              aero.includes('ACTIVE') ? "bg-blue-400 text-white" :
              "bg-cyan-500 text-black",
            )}
          >
            {aero}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
