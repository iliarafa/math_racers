import circuitSingapore from "@/assets/circuit_singapore.png";
import singaporeSetupTrack from "@/assets/singapore_setup_track.png";
import flagSingapore from "@/assets/flag_singapore.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  /** Calendar year. Weekend trophies are keyed by season and round, so keep it current. */
  season: 2026,
  round: 17,
  circuitId: 'singapore',
  name: 'SINGAPORE',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Marina Bay Street Circuit',
  country: 'SINGAPORE',
  trackImage: circuitSingapore,
  /**
   * Optional full-colour setup-card map (sector ribbon, start line, no corner labels).
   * Rendered WITHOUT invert on the Free Practice / Grand Prix setup card. When omitted the
   * card falls back to the briefing's `detailMapImage`, then to the dark silhouette.
   */
  setupTrackImage: singaporeSetupTrack as string | undefined,
  flagImage: flagSingapore,
  rainProbability: 0.30,
  simLapCount: 62,
  gradient: 'linear-gradient(90deg, #ED2939 0%, #ED2939 45%, #FFFFFF 100%)',
  /**
   * Text colour on the paddock's Weekend Briefing banner, which sits on `gradient`.
   * Pick whatever reads on this round's gradient: dark `#1a1a1a` for light or yellow
   * gradients (Madrid), white `#ffffff` for saturated ones (Baku).
   */
  bannerTextColor: '#ffffff' as string,
  welcomeBlurb: 'This week we head to Singapore — home of Formula 1’s first night race, where floodlights light up the streets around Marina Bay as the cars race between the skyscrapers — for the Singapore Grand Prix.',
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
