import circuitAustria from "@/assets/circuit_austria.png";
import flagAustria from "@/assets/flag_austria.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 8,
  circuitId: 'austria',
  name: 'AUSTRIA',
  country: 'AUSTRIA',
  trackImage: circuitAustria,
  flagImage: flagAustria,
  rainProbability: 0.35,
  simLapCount: 70,
  gradient: 'linear-gradient(90deg, #ED2939 0%, #FFFFFF 50%, #ED2939 100%)',
  welcomeBlurb: 'This week we head to the Red Bull Ring in the Styrian mountains for the Austrian Grand Prix.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
