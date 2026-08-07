import circuitZandvoort from "@/assets/circuit_zandvoort.png";
import flagNetherlands from "@/assets/flag_netherlands.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 12,
  circuitId: 'zandvoort',
  name: 'NETHERLANDS',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Zandvoort',
  country: 'NETHERLANDS',
  trackImage: circuitZandvoort,
  flagImage: flagNetherlands,
  rainProbability: 0.40,
  simLapCount: 72,
  gradient: 'linear-gradient(90deg, #AE1C28 0%, #FFFFFF 50%, #21468B 100%)',
  welcomeBlurb: 'This week we head to Circuit Zandvoort in the seaside dunes of the Netherlands — a short, banked rollercoaster by the North Sea — for the Dutch Grand Prix.',
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
