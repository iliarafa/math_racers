import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The phone racing screen's frame. `index.css` keys on these class names
 * (`.racing-screen`, `.landscape-left`, `.landscape-right`): a phone-width column on
 * wider screens, and on iPad in landscape a split into two panes (question, answer and
 * grid on the left, keypad on the right). The keypad grid must stay a direct child of
 * `RacingScreenRight`, whose rule sizes its keys.
 */

/** The whole racing screen; overlays go first, then `RacingScreenLeft` and `RacingScreenRight`. */
export function RacingScreen({ children }: { children?: ReactNode }) {
  return (
    <div className="racing-screen flex-1 flex flex-col w-full overflow-hidden relative min-h-0 bg-transparent">
      {children}
    </div>
  );
}

/** Badge row and the question column; the left pane in iPad landscape. */
export function RacingScreenLeft({ children }: { children?: ReactNode }) {
  return <div className="landscape-left flex-1 flex flex-col min-h-0">{children}</div>;
}

/** The centred column inside `RacingScreenLeft` that holds the clock, question and answer. */
export function RacingScreenColumn({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("relative flex-1 flex flex-col items-center min-h-0 px-4", className)}>{children}</div>;
}

/** Everything above and including the keypad; the right pane in iPad landscape. */
export function RacingScreenRight({ children }: { children?: ReactNode }) {
  return (
    <div className="landscape-right flex flex-col justify-end lg:justify-center items-center px-4 min-h-0 pb-11 shrink-0">
      {children}
    </div>
  );
}
