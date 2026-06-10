import circuitCatalunya from "@/assets/circuit_catalunya.png";
import flagSpain from "@/assets/flag_spain.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 7,
  circuitId: 'barcelona',
  name: 'BARCELONA',
  country: 'SPAIN',
  trackImage: circuitCatalunya,
  flagImage: flagSpain,
  rainProbability: 0.10,
  simLapCount: 66,
  gradient: 'linear-gradient(90deg, #AA151B 0%, #F1BF00 50%, #AA151B 100%)',
  welcomeBlurb: 'This week we take you to the Circuit de Barcelona-Catalunya.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
