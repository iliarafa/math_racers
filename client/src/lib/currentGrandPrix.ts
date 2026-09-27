import circuitMalaysia from "@/assets/circuit_malaysia.png";
import malaysiaSetupTrack from "@/assets/malaysia_setup_track.png";
import flagMalaysia from "@/assets/flag_malaysia.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  /** Calendar year. Weekend trophies are keyed by season and round, so keep it current. */
  season: 2026,
  round: 16,
  circuitId: 'malaysia',
  name: 'MALAYSIA',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Sepang International Circuit',
  country: 'MALAYSIA',
  trackImage: circuitMalaysia,
  /**
   * Optional full-colour setup-card map (sector ribbon, start line, no corner labels).
   * Rendered WITHOUT invert on the Free Practice / Grand Prix setup card. When omitted the
   * card falls back to the briefing's `detailMapImage`, then to the dark silhouette.
   */
  setupTrackImage: malaysiaSetupTrack as string | undefined,
  flagImage: flagMalaysia,
  rainProbability: 0.50,
  simLapCount: 56,
  gradient: 'linear-gradient(90deg, #010066 0%, #CC0001 50%, #FFFFFF 100%)',
  /**
   * Text colour on the paddock's Weekend Briefing banner, which sits on `gradient`.
   * Pick whatever reads on this round's gradient: dark `#1a1a1a` for light or yellow
   * gradients (Madrid), white `#ffffff` for saturated ones (Baku).
   */
  bannerTextColor: '#ffffff' as string,
  welcomeBlurb: 'This week we head to Sepang, near Kuala Lumpur — back on the calendar for the first time since 2017, with two long straights side by side and tropical storms that can roll in within minutes — for the Malaysia Grand Prix.',
  /**
   * Optional per-circuit override for the setup-card silhouette stage's HEIGHT classes
   * (replaces RaceSetupCard's `h-36 md:h-52` default; see setup_cards.md).
   *
   * Kept `undefined` deliberately: the card centers every silhouette in one symmetric
   * stage, so sizes stay consistent across circuits. A per-circuit boost is what made
   * Hungary look bigger than the rest — don't reintroduce one to fix a thin or square
   * circuit; fix the asset (Spa-framed thin-line art) instead.
   */
  mapStageClass: undefined as string | undefined,
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
