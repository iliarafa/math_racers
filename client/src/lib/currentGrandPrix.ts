import circuitBaku from "@/assets/circuit_baku.png";
import bakuSetupTrack from "@/assets/baku_setup_track.png";
import flagAzerbaijan from "@/assets/flag_azerbaijan.png";

// ── Grand Prix Circuit Config ──────────────────────────────────────
// Change these fields each week to follow the F1 calendar.
// Also add the new track/flag asset imports above and update
// SIM_LAP_COUNTS in gameLogic.ts if the circuit is new.
export const CURRENT_GRAND_PRIX = {
  round: 15,
  circuitId: 'baku',
  name: 'BAKU',
  /** Proper circuit name (e.g. 'Hungaroring', 'Spa-Francorchamps') — shown on the GP card. */
  circuitName: 'Baku City Circuit',
  country: 'AZERBAIJAN',
  trackImage: circuitBaku,
  /**
   * Optional full-colour setup-card map (sector ribbon, start line, no corner labels).
   * Rendered WITHOUT invert on the Free Practice / Grand Prix setup card. When omitted the
   * card falls back to the briefing's `detailMapImage`, then to the dark silhouette.
   */
  setupTrackImage: bakuSetupTrack as string | undefined,
  flagImage: flagAzerbaijan,
  rainProbability: 0.15,
  simLapCount: 51,
  gradient: 'linear-gradient(90deg, #00B9E4 0%, #EF3340 50%, #509E2F 100%)',
  /**
   * Text colour on the paddock's Weekend Briefing banner, which sits on `gradient`.
   * Pick whatever reads on this round's gradient: dark `#1a1a1a` for light or yellow
   * gradients (Madrid), white `#ffffff` for saturated ones (Baku).
   */
  bannerTextColor: '#ffffff' as string,
  welcomeBlurb: 'This week we head to Baku — a street circuit that squeezes through the old castle walls before a two-kilometre blast along the Caspian seafront — for the Azerbaijan Grand Prix.',
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
