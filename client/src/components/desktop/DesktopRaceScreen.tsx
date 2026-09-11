import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DesktopRaceScreenProps {
  /** Badge, clock, difficulty label. */
  topLeft?: ReactNode;
  /** Pause button (Race Day uses the RETIRE overlay instead). */
  topRight?: ReactNode;
  /** The question and answer, readable from across the room. */
  center: ReactNode;
  /** Sector grid. */
  bottomLeft?: ReactNode;
  /** Key strip. */
  bottomCenter?: ReactNode;
  /** Power-ups and status pills. */
  bottomRight?: ReactNode;
  /** Overlays (`absolute inset-0` modals and flashes). Rendered first, positioned against this root. */
  children?: ReactNode;
  /** Push the top row down so absolute LAP / RETIRE labels (Race Day) sit above it. */
  topInset?: boolean;
  /** GP Race Day flash: the shell behind is a solid colour. */
  flashWhite?: boolean;
}

/**
 * Cinematic racing shell for desktop and laptop browsers. The numbers own the middle of the
 * screen; the HUD lives in the four corners and the key strip runs centred along the bottom.
 * Replaces the phone `.racing-screen` stack, so none of the phone-column CSS applies here.
 */
export function DesktopRaceScreen({
  topLeft,
  topRight,
  center,
  bottomLeft,
  bottomCenter,
  bottomRight,
  children,
  topInset = false,
  flashWhite = false,
}: DesktopRaceScreenProps) {
  return (
    <div
      className={cn("relative flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-transparent", flashWhite && "text-white")}
      style={{ fontFamily: 'Oxanium, sans-serif' }}
      data-testid="desktop-race-screen"
    >
      {children}

      <div className={cn("flex justify-between items-start px-6 shrink-0 min-h-12", topInset ? "pt-14" : "pt-4")}>
        <div className="flex flex-col items-start" data-testid="hud-top-left">{topLeft}</div>
        <div className="flex items-start" data-testid="hud-top-right">{topRight}</div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">{center}</div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-6 px-6 pb-4 shrink-0">
        <div className="min-w-0 flex justify-start" data-testid="hud-bottom-left">{bottomLeft}</div>
        <div className="w-[clamp(340px,42vw,720px)]">{bottomCenter}</div>
        <div className="min-w-0 flex justify-end" data-testid="hud-bottom-right">{bottomRight}</div>
      </div>
    </div>
  );
}
