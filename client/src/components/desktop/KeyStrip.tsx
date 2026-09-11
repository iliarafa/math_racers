import { cn } from "@/lib/utils";
import { KEY_STRIP_KEYS, keyLabel, type EchoKey, type KeyStripKey } from "@/lib/keyStrip";

export interface KeyStripProps {
  onKey: (key: KeyStripKey) => void;
  /** Physical key currently echoed (from `useKeyEcho`); the matching key flashes. */
  pressedKey: EchoKey | null;
  /** Press counter from `useKeyEcho`; a change remounts the lit key so the flash restarts. */
  pressSeq?: number;
  /** Paused or grading: every key inert. */
  disabled?: boolean;
  /** Nothing typed yet: Enter inert. */
  submitDisabled?: boolean;
  className?: string;
}

/**
 * Compact one-row legend of the keys that matter in a race: 1-9, 0, Backspace, Enter.
 * Keyboard-first: the row is mainly a hint and an echo of what was pressed, but each key is
 * clickable for a child with only a mouse. Buttons never take focus (`tabIndex={-1}`, pointerdown
 * with preventDefault) so a click can never leave a button focused for the window Enter handler
 * to double-fire on.
 */
export function KeyStrip({ onKey, pressedKey, pressSeq = 0, disabled = false, submitDisabled = false, className }: KeyStripProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 w-full", className)}
      style={{ fontFamily: 'Oxanium, sans-serif' }}
      data-testid="key-strip"
    >
      {KEY_STRIP_KEYS.map((key) => {
        const isEnter = key === 'Enter';
        const isBackspace = key === 'Backspace';
        const inert = disabled || (isEnter && submitDisabled);
        const lit = pressedKey === key;
        return (
          <button
            key={lit ? `${key}-${pressSeq}` : key}
            type="button"
            tabIndex={-1}
            aria-label={isEnter ? 'Enter' : isBackspace ? 'Backspace' : key}
            disabled={inert}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!inert) onKey(key);
            }}
            className={cn(
              "h-14 min-w-0 rounded-lg font-bold select-none flex items-center justify-center text-2xl",
              isBackspace || isEnter ? "flex-[1.4] max-w-[5rem]" : "flex-1 max-w-[3.75rem]",
              isEnter
                ? inert
                  ? "bg-muted text-muted-foreground"
                  : "bg-green-600 text-white web-hover-brighten"
                : isBackspace
                  ? "bg-muted text-muted-foreground web-hover-darken"
                  : "bg-secondary text-secondary-foreground web-hover-darken",
              disabled && !isEnter && "opacity-50",
              // Physical key echo: `key-flash` (index.css) brightens the key to white with a glow, then fades it back.
              lit && "key-flash",
            )}
            data-testid={`key-strip-${key.toLowerCase()}`}
          >
            {keyLabel(key)}
          </button>
        );
      })}
    </div>
  );
}
