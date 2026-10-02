import type { GhostDigits } from "@/lib/answerReveal";

/**
 * Team radio answer, drawn inside an answer element in place of the typed answer: the digits typed
 * so far in the radio colour, then the rest of the revealed answer as faint ghost digits. Inline
 * spans only, so the answer element keeps its size and place.
 */
export function RadioDigits({ typed, ghost }: GhostDigits) {
  return (
    <span className="text-radio" data-testid="radio-answer">
      {typed}
      <span className="text-radio/40" data-testid="radio-ghost">{ghost}</span>
    </span>
  );
}
