import type { ReactNode } from "react";
import { Check, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { playKeypadClick } from "@/lib/raceSounds";

export interface RaceKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  /** Paused: every key gets the disabled attribute and dims. */
  disabled?: boolean;
  /** Answer feedback showing: presses are ignored and submit is off, but the keys look unchanged. */
  locked?: boolean;
  /** There is an answer to submit. */
  canSubmit: boolean;
  /** Cells above 7 8 9, e.g. Game's AERO / energy / OT power-up row. */
  topRow?: ReactNode;
}

/**
 * The phone race keypad: 7 8 9, 4 5 6, 1 2 3, then delete, 0 and submit. Digits and delete act
 * on pointer down, so a tap never waits for a click; submit acts on click. The key click plays
 * for every accepted press, whatever the sound setting. The grid must stay a direct child of
 * `RacingScreenRight`: index.css sizes the keys through `.landscape-right .grid.grid-cols-3 > *`.
 */
export function RaceKeypad({ onDigit, onDelete, onSubmit, disabled = false, locked = false, canSubmit, topRow }: RaceKeypadProps) {
  const live = !disabled && !locked;
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3 w-full max-w-md md:max-w-xl lg:max-w-2xl">
      {topRow}

      {/* Regular keypad buttons */}
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
        <button
          key={num}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (live) {
              playKeypadClick();
              onDigit(num.toString());
            }
          }}
          disabled={disabled}
          className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50 touch-manipulation select-none web-hover-darken"
          data-testid={`keypad-${num}`}
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          if (live) {
            playKeypadClick();
            onDelete();
          }
        }}
        disabled={disabled}
        className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50 touch-manipulation select-none web-hover-darken"
        data-testid="keypad-delete"
      >
        <Delete className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          if (live) {
            playKeypadClick();
            onDigit('0');
          }
        }}
        disabled={disabled}
        className="h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl bg-secondary text-secondary-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hover:bg-secondary/80 transition-colors active:scale-95 disabled:opacity-50 touch-manipulation select-none web-hover-darken"
        data-testid="keypad-0"
      >
        0
      </button>
      <button
        type="button"
        onClick={() => onSubmit()}
        disabled={!canSubmit || locked || disabled}
        className={cn(
          "h-[56px] sm:h-[72px] md:h-[84px] lg:h-[100px] rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center touch-manipulation select-none",
          canSubmit && !locked && !disabled
            ? "bg-green-600 text-white hover:bg-green-500"
            : "bg-muted text-muted-foreground"
        )}
        data-testid="keypad-submit"
      >
        <Check className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
    </div>
  );
}
