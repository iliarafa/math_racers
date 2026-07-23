import { CIRCUITS } from '@/lib/gameLogic';
import { CURRENT_GRAND_PRIX } from '@/lib/currentGrandPrix';

import circuitSpaBlack from '@/assets/circuit_spa_black.png';
import circuitMonacoBlack from '@/assets/circuit_monaco_black.png';
import circuitMonzaBlack from '@/assets/circuit_monza_black.png';
import circuitSuzukaBlack from '@/assets/circuit_suzuka_black.png';
import circuitSilverstoneBlack from '@/assets/circuit_silverstone_black.png';
import circuitHungaryBlack from '@/assets/circuit_hungary_black.png';

import flagBelgium from '@/assets/flag_belgium.png';
import flagMonaco from '@/assets/flag_monaco.png';
import flagItaly from '@/assets/flag_italy.png';
import flagJapan from '@/assets/flag_japan.png';
import flagUK from '@/assets/flag_uk.png';
import flagHungary from '@/assets/flag_hungary.png';

export interface CircuitMenuArt {
  /** Thin-line `_black` silhouette, rendered inverted on the dark setup card. */
  image: string;
  flag: string;
}

/**
 * The circuits selectable in the setup menus, and their art — the single source of truth
 * that replaced three divergent per-page maps.
 *
 * This map is BOTH the silhouette/flag source AND the selection gate: a circuit is
 * pickable in Lane Racer / Multiplayer iff it appears here. Only circuits with proper
 * Spa-style thin-line `_black` art (~360px canvas, matching stroke weight) belong.
 *
 * Miami, Canada, Barcelona and Austria were removed because their menu images were heavy
 * raster imports (up to 6175px) that invert to a much thicker, brighter stroke than Spa —
 * an asset problem CSS can't fix. To restore any of them, add real thin-line art here; no
 * other file needs to change.
 */
export const CIRCUIT_MENU_ART: Record<string, CircuitMenuArt> = {
  spa: { image: circuitSpaBlack, flag: flagBelgium },
  monaco: { image: circuitMonacoBlack, flag: flagMonaco },
  monza: { image: circuitMonzaBlack, flag: flagItaly },
  suzuka: { image: circuitSuzukaBlack, flag: flagJapan },
  silverstone: { image: circuitSilverstoneBlack, flag: flagUK },
  hungary: { image: circuitHungaryBlack, flag: flagHungary },
};

/**
 * 1.3.11: the track picker is **locked to the current GP circuit** because the other circuits'
 * menu art is still inconsistent in stroke/size (an asset problem). 1.3.12 ships fresh,
 * consistent `_black` PNGs for every circuit — set this to `false` (and add the remaining
 * circuits to `CIRCUIT_MENU_ART`) to re-open the full picker in both Lane Racer and Multiplayer.
 */
export const LOCK_MENU_TO_CURRENT_GP = true;

/**
 * Circuits pickable in the setup menus, in `CIRCUITS` order. While locked, this collapses to
 * just the current GP circuit, so Lane Racer / Multiplayer show a single, non-interactive TRACK
 * row (see `SetupRow`'s single-option branch).
 */
export const MENU_CIRCUITS = CIRCUITS.filter((c) => {
  if (!(c.id in CIRCUIT_MENU_ART)) return false;
  if (LOCK_MENU_TO_CURRENT_GP) return c.id === CURRENT_GRAND_PRIX.circuitId;
  return true;
});
