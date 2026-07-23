import circuitHungary from "@/assets/circuit_hungary.png";
import flagHungary from "@/assets/flag_hungary.png";

/** Height of the setup-card silhouette stage when a circuit needs no special treatment. */
export const DEFAULT_MAP_STAGE_CLASS = 'h-32 md:h-52';

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 11,
  circuitId: 'hungary',
  name: 'HUNGARY',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Hungaroring',
  country: 'HUNGARY',
  trackImage: circuitHungary,
  flagImage: flagHungary,
  rainProbability: 0.25,
  simLapCount: 70,
  gradient: 'linear-gradient(90deg, #CE2939 0%, #FFFFFF 50%, #477050 100%)',
  welcomeBlurb: 'This week we head to the Hungaroring near Budapest — a tight, twisty lap that rewards precision and patience — for the Hungarian Grand Prix.',
  /**
   * Optional per-circuit override for the setup-card silhouette stage.
   *
   * Kept `undefined` deliberately: every menu silhouette now renders in the shared
   * DEFAULT_MAP_STAGE_CLASS (Spa's stage) so sizes stay consistent. A per-circuit boost is
   * what made Hungary look bigger than the rest — don't reintroduce one to fix a thin or
   * square circuit; fix the asset (Spa-framed thin-line art) instead.
   */
  mapStageClass: undefined as string | undefined,
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
