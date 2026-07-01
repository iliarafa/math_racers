import circuitSilverstoneBlack from "@/assets/circuit_silverstone_black.png";
import flagUK from "@/assets/flag_uk.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 9,
  circuitId: 'silverstone',
  name: 'SILVERSTONE',
  country: 'UNITED KINGDOM',
  trackImage: circuitSilverstoneBlack,
  flagImage: flagUK,
  rainProbability: 0.45,
  simLapCount: 52,
  gradient: 'linear-gradient(90deg, #012169 0%, #FFFFFF 50%, #C8102E 100%)',
  welcomeBlurb: 'This week we head to Silverstone, the fast, sweeping home of British motorsport, for the British Grand Prix.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
