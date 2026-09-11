import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EchoKey } from "@/lib/keyStrip";

export interface PowerUpControl {
  available: boolean;
  active: boolean;
  disabled: boolean;
  onActivate: () => void;
}

export interface PowerUpControlsProps {
  /** Race has power-ups at all (Grand Prix, Multiplayer). False renders nothing. */
  enabled: boolean;
  aero: PowerUpControl;
  overtake: PowerUpControl & { energy: number };
  /** Physical key echo; flashes the `-` / `+` shortcut chips. */
  pressedKey: EchoKey | null;
  pressSeq?: number;
}

function ShortcutChip({ label, lit, seq }: { label: string; lit: boolean; seq: number }) {
  return (
    <kbd
      key={lit ? seq : 'idle'}
      className={cn(
        "absolute top-1.5 right-2 min-w-[1.5rem] h-6 px-1.5 rounded border text-xs font-bold flex items-center justify-center font-sans",
        lit ? "key-flash bg-white text-black border-white" : "bg-black/20 text-white/90 border-white/30",
      )}
    >
      {label}
    </kbd>
  );
}

/**
 * ACTIVE AERO / energy bar / OVERTAKE for the desktop HUD pane. Same guards and colours as the
 * phone keypad row in Game.tsx and Multiplayer.tsx, with the keyboard shortcuts printed on the
 * buttons. Handler names differ between the two pages, so callers map them into `onActivate`.
 */
export function PowerUpControls({ enabled, aero, overtake, pressedKey, pressSeq = 0 }: PowerUpControlsProps) {
  if (!enabled) return null;
  return (
    <div className="grid grid-cols-3 gap-3 w-full" style={{ fontFamily: 'Oxanium, sans-serif' }} data-testid="power-up-controls">
      <button
        type="button"
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!aero.disabled) aero.onActivate();
        }}
        disabled={aero.disabled}
        className={cn(
          "relative h-[72px] rounded-xl font-bold text-xl transition-all active:scale-95 select-none",
          aero.active
            ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
            : aero.available && !aero.disabled
              ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-yellow-400 animate-pulse"
              : "bg-secondary text-secondary-foreground cursor-not-allowed",
        )}
        data-testid="button-aero"
      >
        {aero.active ? 'ON' : 'AERO'}
        <ShortcutChip label="−" lit={pressedKey === 'aero'} seq={pressSeq} />
      </button>

      <div className="h-[72px] rounded-xl bg-secondary overflow-hidden relative">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-xl transition-all", overtake.active ? "bg-green-400" : "bg-green-500")}
          animate={{ width: `${overtake.energy}%`, opacity: overtake.active ? [1, 0.7, 1] : 1 }}
          transition={{
            width: { duration: 0.1 },
            opacity: overtake.active ? { repeat: Infinity, duration: 0.5 } : { duration: 0 },
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black z-10">
          {overtake.energy}%
        </span>
      </div>

      <button
        type="button"
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!overtake.disabled) overtake.onActivate();
        }}
        disabled={overtake.disabled}
        className={cn(
          "relative h-[72px] rounded-xl font-bold text-xl transition-all active:scale-95 select-none",
          overtake.active
            ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
            : overtake.available && !overtake.disabled
              ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              : "bg-secondary text-secondary-foreground cursor-not-allowed",
        )}
        data-testid="button-overtake"
      >
        {overtake.active ? 'ON' : 'OT'}
        <ShortcutChip label="+" lit={pressedKey === 'overtake'} seq={pressSeq} />
      </button>
    </div>
  );
}
