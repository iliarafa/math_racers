import circuitSpaBlack from "@/assets/circuit_spa_black.png";
import flagBelgium from "@/assets/flag_belgium.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 10,
  circuitId: 'spa',
  name: 'SPA',
  country: 'BELGIUM',
  trackImage: circuitSpaBlack,
  flagImage: flagBelgium,
  rainProbability: 0.55,
  simLapCount: 44,
  gradient: 'linear-gradient(90deg, #000000 0%, #FDDA24 50%, #EF3340 100%)',
  welcomeBlurb: 'This week we head to Spa-Francorchamps, the longest and most dramatic lap on the calendar, for the Belgian Grand Prix.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
