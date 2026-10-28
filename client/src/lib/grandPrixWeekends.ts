import { CURRENT_SEASON, calendarRound, isRoundOpen, type MapRegion } from '@/lib/seasonCalendar';

import trackMelbourne from '@/assets/track_melbourne.png';
import trackChina from '@/assets/track_china.png';
import circuitSuzukaBlack from '@/assets/circuit_suzuka_black.png';
import trackMiami from '@/assets/miami_track.png';
import trackCanada from '@/assets/track_canada.png';
import circuitMonacoBlack from '@/assets/circuit_monaco_black.png';
import circuitCatalunya from '@/assets/circuit_catalunya.png';
import circuitAustria from '@/assets/circuit_austria.png';
import circuitSilverstoneBlack from '@/assets/circuit_silverstone_black.png';
import circuitSpaBlack from '@/assets/circuit_spa_black.png';
import circuitHungary from '@/assets/circuit_hungary.png';
import circuitZandvoort from '@/assets/circuit_zandvoort.png';
import circuitMonzaBlack from '@/assets/circuit_monza_black.png';
import circuitMadrid from '@/assets/circuit_madrid.png';
import circuitBaku from '@/assets/circuit_baku.png';
import circuitMalaysia from '@/assets/circuit_malaysia.png';
import circuitSingapore from '@/assets/circuit_singapore.png';
import circuitAustin from '@/assets/circuit_austin.png';
import circuitMexico from '@/assets/circuit_mexico.png';

import melbourneSetupTrack from '@/assets/melbourne_setup_track.png';
import chinaSetupTrack from '@/assets/china_setup_track.png';
import suzukaSetupTrack from '@/assets/suzuka_setup_track.png';
import miamiSetupTrack from '@/assets/miami_setup_track.png';
import canadaSetupTrack from '@/assets/canada_setup_track.png';
import monacoSetupTrack from '@/assets/monaco_setup_track.png';
import catalunyaSetupTrack from '@/assets/catalunya_setup_track.png';
import austriaSetupTrack from '@/assets/austria_setup_track.png';
import silverstoneSetupTrack from '@/assets/silverstone_setup_track.png';
import spaSetupTrack from '@/assets/spa_setup_track.png';
import hungarySetupTrack from '@/assets/hungary_setup_track.png';
import zandvoortSetupTrack from '@/assets/zandvoort_setup_track.png';
import monzaSetupTrack from '@/assets/monza_setup_track.png';
import madridSetupTrack from '@/assets/madrid_setup_track.png';
import bakuSetupTrack from '@/assets/baku_setup_track.png';
import malaysiaSetupTrack from '@/assets/malaysia_setup_track.png';
import singaporeSetupTrack from '@/assets/singapore_setup_track.png';
import austinSetupTrack from '@/assets/austin_setup_track.png';
import mexicoSetupTrack from '@/assets/mexico_setup_track.png';

import flagAustralia from '@/assets/flag_australia.png';
import flagChina from '@/assets/flag_china.png';
import flagJapan from '@/assets/flag_japan.png';
import flagUS from '@/assets/flag_us.png';
import flagCanada from '@/assets/flag_canada.png';
import flagMonaco from '@/assets/flag_monaco.png';
import flagSpain from '@/assets/flag_spain.png';
import flagAustria from '@/assets/flag_austria.png';
import flagUK from '@/assets/flag_uk.png';
import flagBelgium from '@/assets/flag_belgium.png';
import flagHungary from '@/assets/flag_hungary.png';
import flagNetherlands from '@/assets/flag_netherlands.png';
import flagItaly from '@/assets/flag_italy.png';
import flagAzerbaijan from '@/assets/flag_azerbaijan.png';
import flagMalaysia from '@/assets/flag_malaysia.png';
import flagSingapore from '@/assets/flag_singapore.png';
import flagMexico from '@/assets/flag_mexico.png';

/**
 * A raced round's art, keyed by circuitId. Flags are imported here directly, not from
 * `CIRCUIT_MENU_ART`: circuitMenuArt imports currentGrandPrix, which is built from this file.
 */
type WeekendArt = {
  /** DARK transparent silhouette; the setup card inverts it when there is no colour map. */
  trackImage: string;
  /**
   * Optional full-colour setup-card map (sector ribbon, start line, no corner labels), shown
   * WITHOUT invert. When absent the card falls back to the briefing's `detailMapImage`, then to
   * the silhouette.
   */
  setupTrackImage?: string;
  flagImage: string;
};

const WEEKEND_ART: Record<string, WeekendArt> = {
  melbourne: { trackImage: trackMelbourne, setupTrackImage: melbourneSetupTrack, flagImage: flagAustralia },
  china: { trackImage: trackChina, setupTrackImage: chinaSetupTrack, flagImage: flagChina },
  suzuka: { trackImage: circuitSuzukaBlack, setupTrackImage: suzukaSetupTrack, flagImage: flagJapan },
  miami: { trackImage: trackMiami, setupTrackImage: miamiSetupTrack, flagImage: flagUS },
  canada: { trackImage: trackCanada, setupTrackImage: canadaSetupTrack, flagImage: flagCanada },
  monaco: { trackImage: circuitMonacoBlack, setupTrackImage: monacoSetupTrack, flagImage: flagMonaco },
  barcelona: { trackImage: circuitCatalunya, setupTrackImage: catalunyaSetupTrack, flagImage: flagSpain },
  austria: { trackImage: circuitAustria, setupTrackImage: austriaSetupTrack, flagImage: flagAustria },
  silverstone: { trackImage: circuitSilverstoneBlack, setupTrackImage: silverstoneSetupTrack, flagImage: flagUK },
  spa: { trackImage: circuitSpaBlack, setupTrackImage: spaSetupTrack, flagImage: flagBelgium },
  hungary: { trackImage: circuitHungary, setupTrackImage: hungarySetupTrack, flagImage: flagHungary },
  zandvoort: { trackImage: circuitZandvoort, setupTrackImage: zandvoortSetupTrack, flagImage: flagNetherlands },
  monza: { trackImage: circuitMonzaBlack, setupTrackImage: monzaSetupTrack, flagImage: flagItaly },
  madrid: { trackImage: circuitMadrid, setupTrackImage: madridSetupTrack, flagImage: flagSpain },
  baku: { trackImage: circuitBaku, setupTrackImage: bakuSetupTrack, flagImage: flagAzerbaijan },
  malaysia: { trackImage: circuitMalaysia, setupTrackImage: malaysiaSetupTrack, flagImage: flagMalaysia },
  singapore: { trackImage: circuitSingapore, setupTrackImage: singaporeSetupTrack, flagImage: flagSingapore },
  austin: { trackImage: circuitAustin, setupTrackImage: austinSetupTrack, flagImage: flagUS },
  mexico: { trackImage: circuitMexico, setupTrackImage: mexicoSetupTrack, flagImage: flagMexico },
};

/** Everything a Grand Prix weekend needs: the calendar row, its text settings and its art. */
export type GrandPrixWeekend = {
  season: number;
  round: number;
  circuitId: string;
  name: string;
  circuitName: string;
  country: string;
  region: MapRegion;
  trackImage: string;
  setupTrackImage: string | undefined;
  flagImage: string;
  rainProbability: number;
  simLapCount: number;
  gradient: string;
  bannerTextColor: string;
  welcomeBlurb: string;
  mapStageClass: string | undefined;
};

/** The weekend for an open round; `undefined` for a round not rotated to yet (or not in the calendar). */
export function weekendForRound(round: number): GrandPrixWeekend | undefined {
  const row = calendarRound(round);
  if (!row || !row.weekend || !isRoundOpen(round)) return undefined;
  const art = WEEKEND_ART[row.circuitId];
  if (!art) return undefined;
  return {
    season: CURRENT_SEASON,
    round: row.round,
    circuitId: row.circuitId,
    name: row.name,
    circuitName: row.circuitName,
    country: row.country,
    region: row.region,
    trackImage: art.trackImage,
    setupTrackImage: art.setupTrackImage,
    flagImage: art.flagImage,
    rainProbability: row.weekend.rainProbability,
    simLapCount: row.weekend.simLapCount,
    gradient: row.weekend.gradient,
    bannerTextColor: row.weekend.bannerTextColor,
    welcomeBlurb: row.weekend.welcomeBlurb,
    mapStageClass: row.weekend.mapStageClass,
  };
}
