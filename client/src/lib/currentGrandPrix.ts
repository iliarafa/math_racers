import circuitHungary from "@/assets/circuit_hungary.png";
import flagHungary from "@/assets/flag_hungary.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 11,
  circuitId: 'hungary',
  name: 'HUNGARY',
  country: 'HUNGARY',
  trackImage: circuitHungary,
  flagImage: flagHungary,
  rainProbability: 0.25,
  simLapCount: 70,
  gradient: 'linear-gradient(90deg, #CE2939 0%, #FFFFFF 50%, #477050 100%)',
  welcomeBlurb: 'This week we head to the Hungaroring near Budapest — a tight, twisty lap that rewards precision and patience — for the Hungarian Grand Prix.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
