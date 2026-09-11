import { cn } from "@/lib/utils";
import type { EchoKey } from "@/lib/keyStrip";

function Chip({ label, lit, seq }: { label: string; lit: boolean; seq: number }) {
  return (
    <kbd
      key={lit ? seq : 'idle'}
      className={cn(
        "px-3 h-9 rounded-md border text-sm font-bold flex items-center justify-center font-sans",
        lit ? "key-flash bg-white text-black border-white" : "bg-black/50 text-white/85 border-white/40",
      )}
    >
      {label}
    </kbd>
  );
}

/**
 * Desktop-only steering legend over the Lane Racer canvas: arrows or A / D. Lights the side
 * whose key was just pressed. Does not intercept pointer events.
 */
export function LaneKeyHints({ pressedKey, pressSeq = 0 }: { pressedKey: EchoKey | null; pressSeq?: number }) {
  return (
    <div
      className="pointer-events-none absolute bottom-5 inset-x-0 flex justify-center gap-10"
      style={{ fontFamily: 'Oxanium, sans-serif' }}
      data-testid="lane-key-hints"
    >
      <div className="flex items-center gap-2">
        <Chip label="←" lit={pressedKey === 'left'} seq={pressSeq} />
        <Chip label="A" lit={pressedKey === 'left'} seq={pressSeq} />
      </div>
      <div className="flex items-center gap-2">
        <Chip label="D" lit={pressedKey === 'right'} seq={pressSeq} />
        <Chip label="→" lit={pressedKey === 'right'} seq={pressSeq} />
      </div>
    </div>
  );
}
