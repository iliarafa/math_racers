import circuitMonzaBlack from "@/assets/circuit_monza_black.png";
import flagItaly from "@/assets/flag_italy.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 13,
  circuitId: 'monza',
  name: 'MONZA',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Monza',
  country: 'ITALY',
  trackImage: circuitMonzaBlack,
  flagImage: flagItaly,
  rainProbability: 0.20,
  simLapCount: 53,
  gradient: 'linear-gradient(90deg, #008C45 0%, #FFFFFF 50%, #CD212A 100%)',
  welcomeBlurb: 'This week we head to the Autodromo Nazionale di Monza — the Temple of Speed, just north of Milan — for the Italian Grand Prix.',
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
