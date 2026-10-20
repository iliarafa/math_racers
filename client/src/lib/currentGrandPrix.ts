import circuitAustin from "@/assets/circuit_austin.png";
import austinSetupTrack from "@/assets/austin_setup_track.png";
import flagUS from "@/assets/flag_us.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  /** Calendar year. Weekend trophies are keyed by season and round, so keep it current. */
  season: 2026,
  round: 18,
  circuitId: 'austin',
  name: 'AUSTIN',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Circuit of the Americas',
  country: 'USA',
  trackImage: circuitAustin,
  /**
   * Optional full-colour setup-card map (sector ribbon, start line, no corner labels).
   * Rendered WITHOUT invert on the Free Practice / Grand Prix setup card. When omitted the
   * card falls back to the briefing's `detailMapImage`, then to the dark silhouette.
   */
  setupTrackImage: austinSetupTrack as string | undefined,
  flagImage: flagUS,
  rainProbability: 0.20,
  simLapCount: 56,
  gradient: 'linear-gradient(90deg, #0A3161 0%, #0A3161 40%, #B31942 100%)',
  /**
   * Text colour on the paddock's Weekend Briefing banner, which sits on `gradient`.
   * Pick whatever reads on this round's gradient: dark `#1a1a1a` for light or yellow
   * gradients (Madrid), white `#ffffff` for saturated ones (Baku).
   */
  bannerTextColor: '#ffffff' as string,
  welcomeBlurb: 'This week we head to Austin, Texas — where the cars charge up a steep hill into Turn 1 and snake through fast esses at the Circuit of the Americas — for the United States Grand Prix.',
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
