import { CURRENT_ROUND } from '@/lib/seasonCalendar';
import { weekendForRound, type GrandPrixWeekend } from '@/lib/grandPrixWeekends';

// ── Grand Prix Circuit Config ──────────────────────────────────────
// This week's round: Free Practice, Race Now, the Hub's Grand Prix card, the Weekend Briefing
// and Regulations Art. 7 all follow it. It is the calendar entry for CURRENT_ROUND, so the
// weekly rotation fills that round's row in seasonCalendar.ts (and its art in
// grandPrixWeekends.ts) and bumps CURRENT_ROUND; nothing here changes. The Season Map
// (/map) can start any open round's weekend instead.
export const CURRENT_GRAND_PRIX: GrandPrixWeekend = (() => {
  const weekend = weekendForRound(CURRENT_ROUND);
  if (!weekend) throw new Error(`Round ${CURRENT_ROUND} has no weekend settings or art yet`);
  return weekend;
})();

export type CurrentGrandPrix = GrandPrixWeekend;
