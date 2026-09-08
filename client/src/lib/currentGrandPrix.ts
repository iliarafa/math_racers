import circuitMadrid from "@/assets/circuit_madrid.png";
import flagSpain from "@/assets/flag_spain.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 14,
  circuitId: 'madrid',
  name: 'MADRID',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Madring',
  country: 'SPAIN',
  trackImage: circuitMadrid,
  flagImage: flagSpain,
  rainProbability: 0.10,
  simLapCount: 57,
  gradient: 'linear-gradient(90deg, #AA151B 0%, #F1BF00 50%, #AA151B 100%)',
  welcomeBlurb: 'This week we head to Madrid — a brand-new street circuit around the IFEMA exhibition centre — for the Spanish Grand Prix.',
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
