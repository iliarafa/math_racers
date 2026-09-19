import { cn } from "@/lib/utils";
import type { Badge } from "@/lib/trophies";

/** One badge in the Racer Log and Trophies badge rows; purple when earned. Locked ones keep their name, dimmed, so each is a visible goal (and "100 Laps" never looks like "100-Day Streak"). */
export function BadgeTile({ badge, earned }: { badge: Badge; earned: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-md px-3 py-2 min-w-[7.5rem]',
        earned ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/30'
      )}
      style={{ fontFamily: 'Oxanium, sans-serif' }}
      title={badge.blurb}
      data-testid={`badge-${badge.id}`}
    >
      <span className={cn('text-lg font-bold leading-none', earned ? 'text-white' : 'text-white/25')}>
        {badge.glyph}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-center leading-tight">
        {badge.label}
      </span>
    </div>
  );
}
