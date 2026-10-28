/**
 * The 2026 season as the app counts it: one row per round, the single source for every
 * Grand Prix weekend and for the Season Map's pins.
 *
 * Pure (no asset imports, so the tests can load it): each round's flag and track art lives in
 * `grandPrixWeekends.ts`, which merges it with the row here. `CURRENT_GRAND_PRIX` is simply the
 * weekend for `CURRENT_ROUND`.
 *
 * The weekly rotation fills the next round's `weekend` (and its art) and bumps `CURRENT_ROUND`.
 * A round opens on the map once it is rotated to, not on its date, because its art and history
 * arrive with the rotation.
 */

/** Calendar year. Weekend trophies are keyed by season and round. */
export const CURRENT_SEASON = 2026;

/** This week's round. */
export const CURRENT_ROUND = 19;

export type MapRegion = 'americas' | 'europe' | 'middle-east' | 'asia-pacific';

/** Longitude and latitude edges, in degrees. */
export type GeoBounds = { west: number; east: number; south: number; north: number };

export type RegionSpec = { id: MapRegion; label: string; bounds: GeoBounds };

/** The world view: every F1 venue with a margin, Pacific at both edges. */
export const WORLD_BOUNDS: GeoBounds = { west: -130, east: 160, south: -48, north: 62 };

/** The map's zoom targets, in world-view order (west to east). */
export const MAP_REGIONS: readonly RegionSpec[] = [
  { id: 'americas', label: 'Americas', bounds: { west: -125, east: -40, south: -32, north: 52 } },
  { id: 'europe', label: 'Europe', bounds: { west: -9, east: 23, south: 38, north: 55.5 } },
  { id: 'middle-east', label: 'Middle East', bounds: { west: 42, east: 60, south: 20, north: 44 } },
  { id: 'asia-pacific', label: 'Asia-Pacific', bounds: { west: 96, east: 150, south: -42, north: 40 } },
];

/** The weekend's text settings; the art is added by `grandPrixWeekends.ts`. */
export type WeekendText = {
  rainProbability: number;
  /** The real race distance; Race Day itself reads `SIM_LAP_COUNTS`, and a test keeps the two equal. */
  simLapCount: number;
  /** CSS linear-gradient in the national flag's colours (the paddock's Weekend Briefing banner). */
  gradient: string;
  /** Text colour on that banner: `#1a1a1a` for light or yellow gradients, `#ffffff` for saturated ones. */
  bannerTextColor: string;
  /** One kid-friendly sentence, shown in the Grand Prix setup help. */
  welcomeBlurb: string;
  /**
   * Optional per-circuit override for the setup-card silhouette stage's HEIGHT classes. Kept
   * unset deliberately (see setup_cards.md): fix a thin or square circuit's asset instead.
   */
  mapStageClass?: string;
};

export type CalendarRound = {
  round: number;
  /** The `TROPHY_CODES` key; also keys `SIM_LAP_COUNTS`, `GP_HISTORY` and the leaderboards. */
  circuitId: string;
  /** UPPERCASE name on the setup card and the trophy, e.g. 'SILVERSTONE'. */
  name: string;
  /** Proper venue name that reads after "the", e.g. 'Silverstone Circuit'. */
  circuitName: string;
  country: string;
  /** The circuit's position, in degrees. */
  lat: number;
  lng: number;
  region: MapRegion;
  /** Race day (ISO date, the venue's local date); shown on a pin that hasn't opened yet. */
  raceDate?: string;
  /** Present once the round has been rotated to. */
  weekend?: WeekendText;
};

export const SEASON_CALENDAR: readonly CalendarRound[] = [
  {
    round: 1, circuitId: 'melbourne', name: 'MELBOURNE', circuitName: 'Albert Park Circuit', country: 'AUSTRALIA',
    lat: -37.8497, lng: 144.968, region: 'asia-pacific',
    weekend: {
      rainProbability: 0.20, simLapCount: 58,
      gradient: 'linear-gradient(90deg, #012169 0%, #012169 45%, #FFFFFF 70%, #E4002B 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Melbourne, where the season starts on the roads around the lake at Albert Park, for the Australian Grand Prix.',
    },
  },
  {
    round: 2, circuitId: 'china', name: 'SHANGHAI', circuitName: 'Shanghai International Circuit', country: 'CHINA',
    lat: 31.3389, lng: 121.2197, region: 'asia-pacific',
    weekend: {
      rainProbability: 0.20, simLapCount: 56,
      gradient: 'linear-gradient(90deg, #CC0000 0%, #DD0000 50%, #FFD700 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Shanghai, whose track is shaped like the Chinese character "shang", for the Chinese Grand Prix.',
    },
  },
  {
    round: 3, circuitId: 'suzuka', name: 'SUZUKA', circuitName: 'Suzuka Circuit', country: 'JAPAN',
    lat: 34.8431, lng: 136.541, region: 'asia-pacific',
    weekend: {
      rainProbability: 0.42, simLapCount: 53,
      gradient: 'linear-gradient(90deg, #FFFFFF 0%, #BC002D 50%, #BC002D 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Suzuka, the figure-of-eight track where the lap crosses over itself on a bridge, for the Japanese Grand Prix.',
    },
  },
  {
    round: 4, circuitId: 'miami', name: 'MIAMI', circuitName: 'Miami International Autodrome', country: 'USA',
    lat: 25.9581, lng: -80.2389, region: 'americas',
    weekend: {
      rainProbability: 0.15, simLapCount: 57,
      gradient: 'linear-gradient(90deg, #FF6B35 0%, #004E89 50%, #004E89 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Miami, racing around the Hard Rock Stadium in the Florida sunshine, for the Miami Grand Prix.',
    },
  },
  {
    round: 5, circuitId: 'canada', name: 'CANADA', circuitName: 'Circuit Gilles Villeneuve', country: 'CANADA',
    lat: 45.5, lng: -73.5228, region: 'americas',
    weekend: {
      rainProbability: 0.40, simLapCount: 70,
      gradient: 'linear-gradient(90deg, #D52B1E 0%, #FFFFFF 50%, #D52B1E 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Montreal, on an island in the St Lawrence River, where the last corner ends at the famous Wall of Champions, for the Canadian Grand Prix.',
    },
  },
  {
    round: 6, circuitId: 'monaco', name: 'MONACO', circuitName: 'Circuit de Monaco', country: 'MONACO',
    lat: 43.7347, lng: 7.4206, region: 'europe',
    weekend: {
      rainProbability: 0.25, simLapCount: 78,
      gradient: 'linear-gradient(90deg, #CE1126 0%, #FFFFFF 50%, #CE1126 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we take you to the Circuit de Monaco, the narrow street track that winds past the harbour and through a tunnel, for the Monaco Grand Prix.',
    },
  },
  {
    round: 7, circuitId: 'barcelona', name: 'BARCELONA', circuitName: 'Circuit de Barcelona-Catalunya', country: 'SPAIN',
    lat: 41.57, lng: 2.2611, region: 'europe',
    weekend: {
      rainProbability: 0.10, simLapCount: 66,
      gradient: 'linear-gradient(90deg, #AA151B 0%, #F1BF00 50%, #AA151B 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we take you to the Circuit de Barcelona-Catalunya, the track every team knows by heart from testing, for the Barcelona-Catalunya Grand Prix.',
    },
  },
  {
    round: 8, circuitId: 'austria', name: 'AUSTRIA', circuitName: 'Red Bull Ring', country: 'AUSTRIA',
    lat: 47.2197, lng: 14.7647, region: 'europe',
    weekend: {
      rainProbability: 0.35, simLapCount: 70,
      gradient: 'linear-gradient(90deg, #ED2939 0%, #FFFFFF 50%, #ED2939 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to the Red Bull Ring in the Styrian mountains for the Austrian Grand Prix.',
    },
  },
  {
    round: 9, circuitId: 'silverstone', name: 'SILVERSTONE', circuitName: 'Silverstone Circuit', country: 'UNITED KINGDOM',
    lat: 52.0786, lng: -1.0169, region: 'europe',
    weekend: {
      rainProbability: 0.45, simLapCount: 52,
      gradient: 'linear-gradient(90deg, #012169 0%, #FFFFFF 50%, #C8102E 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Silverstone, the fast, sweeping home of British motorsport, for the British Grand Prix.',
    },
  },
  {
    round: 10, circuitId: 'spa', name: 'SPA', circuitName: 'Circuit de Spa-Francorchamps', country: 'BELGIUM',
    lat: 50.4372, lng: 5.9714, region: 'europe',
    weekend: {
      rainProbability: 0.55, simLapCount: 44,
      gradient: 'linear-gradient(90deg, #000000 0%, #FDDA24 50%, #EF3340 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Spa-Francorchamps, the longest and most dramatic lap on the calendar, for the Belgian Grand Prix.',
    },
  },
  {
    round: 11, circuitId: 'hungary', name: 'HUNGARY', circuitName: 'Hungaroring', country: 'HUNGARY',
    lat: 47.5789, lng: 19.2486, region: 'europe',
    weekend: {
      rainProbability: 0.25, simLapCount: 70,
      gradient: 'linear-gradient(90deg, #CE2939 0%, #FFFFFF 50%, #477050 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to the Hungaroring near Budapest — a tight, twisty lap that rewards precision and patience — for the Hungarian Grand Prix.',
    },
  },
  {
    round: 12, circuitId: 'zandvoort', name: 'NETHERLANDS', circuitName: 'Zandvoort', country: 'NETHERLANDS',
    lat: 52.3888, lng: 4.5409, region: 'europe',
    weekend: {
      rainProbability: 0.40, simLapCount: 72,
      gradient: 'linear-gradient(90deg, #AE1C28 0%, #FFFFFF 50%, #21468B 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Circuit Zandvoort in the seaside dunes of the Netherlands — a short, banked rollercoaster by the North Sea — for the Dutch Grand Prix.',
    },
  },
  {
    round: 13, circuitId: 'monza', name: 'MONZA', circuitName: 'Monza', country: 'ITALY',
    lat: 45.6156, lng: 9.2811, region: 'europe',
    weekend: {
      rainProbability: 0.20, simLapCount: 53,
      gradient: 'linear-gradient(90deg, #008C45 0%, #FFFFFF 50%, #CD212A 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to the Autodromo Nazionale di Monza — the Temple of Speed, just north of Milan — for the Italian Grand Prix.',
    },
  },
  {
    round: 14, circuitId: 'madrid', name: 'MADRID', circuitName: 'Madring', country: 'SPAIN',
    lat: 40.4636, lng: -3.6166, region: 'europe',
    weekend: {
      rainProbability: 0.10, simLapCount: 57,
      gradient: 'linear-gradient(90deg, #AA151B 0%, #F1BF00 50%, #AA151B 100%)',
      bannerTextColor: '#1a1a1a',
      welcomeBlurb: 'This week we head to Madrid — a brand-new street circuit around the IFEMA exhibition centre — for the Spanish Grand Prix.',
    },
  },
  {
    round: 15, circuitId: 'baku', name: 'BAKU', circuitName: 'Baku City Circuit', country: 'AZERBAIJAN',
    lat: 40.3725, lng: 49.8533, region: 'middle-east',
    weekend: {
      rainProbability: 0.15, simLapCount: 51,
      gradient: 'linear-gradient(90deg, #00B9E4 0%, #EF3340 50%, #509E2F 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Baku — a street circuit that squeezes through the old castle walls before a two-kilometre blast along the Caspian seafront — for the Azerbaijan Grand Prix.',
    },
  },
  {
    round: 16, circuitId: 'malaysia', name: 'MALAYSIA', circuitName: 'Sepang International Circuit', country: 'MALAYSIA',
    lat: 2.7608, lng: 101.7382, region: 'asia-pacific',
    weekend: {
      rainProbability: 0.50, simLapCount: 56,
      gradient: 'linear-gradient(90deg, #010066 0%, #CC0001 50%, #FFFFFF 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Sepang, near Kuala Lumpur — back on the calendar for the first time since 2017, with two long straights side by side and tropical storms that can roll in within minutes — for the Malaysia Grand Prix.',
    },
  },
  {
    round: 17, circuitId: 'singapore', name: 'SINGAPORE', circuitName: 'Marina Bay Street Circuit', country: 'SINGAPORE',
    lat: 1.2914, lng: 103.864, region: 'asia-pacific',
    weekend: {
      rainProbability: 0.30, simLapCount: 62,
      gradient: 'linear-gradient(90deg, #ED2939 0%, #ED2939 45%, #FFFFFF 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Singapore — home of Formula 1’s first night race, where floodlights light up the streets around Marina Bay as the cars race between the skyscrapers — for the Singapore Grand Prix.',
    },
  },
  {
    round: 18, circuitId: 'austin', name: 'AUSTIN', circuitName: 'Circuit of the Americas', country: 'USA',
    lat: 30.1328, lng: -97.6411, region: 'americas',
    weekend: {
      rainProbability: 0.20, simLapCount: 56,
      gradient: 'linear-gradient(90deg, #0A3161 0%, #0A3161 40%, #B31942 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Austin, Texas — where the cars charge up a steep hill into Turn 1 and snake through fast esses at the Circuit of the Americas — for the United States Grand Prix.',
    },
  },
  {
    round: 19, circuitId: 'mexico', name: 'MEXICO CITY', circuitName: 'Autódromo Hermanos Rodríguez', country: 'MEXICO',
    lat: 19.4042, lng: -99.0907, region: 'americas',
    weekend: {
      rainProbability: 0.15, simLapCount: 71,
      gradient: 'linear-gradient(90deg, #006847 0%, #006847 40%, #CE1126 100%)',
      bannerTextColor: '#ffffff',
      welcomeBlurb: 'This week we head to Mexico City — racing more than 2,200 metres up in thin air and right through a baseball stadium full of cheering fans at the Autódromo Hermanos Rodríguez — for the Mexico City Grand Prix.',
    },
  },
  {
    round: 20, circuitId: 'brazil', name: 'SÃO PAULO', circuitName: 'Interlagos', country: 'BRAZIL',
    lat: -23.7036, lng: -46.6997, region: 'americas', raceDate: '2026-11-08',
  },
  {
    round: 21, circuitId: 'lasvegas', name: 'LAS VEGAS', circuitName: 'Las Vegas Strip Circuit', country: 'USA',
    lat: 36.1147, lng: -115.1728, region: 'americas', raceDate: '2026-11-21',
  },
  {
    round: 22, circuitId: 'qatar', name: 'QATAR', circuitName: 'Lusail International Circuit', country: 'QATAR',
    lat: 25.49, lng: 51.4542, region: 'middle-east', raceDate: '2026-11-29',
  },
  {
    round: 23, circuitId: 'abudhabi', name: 'ABU DHABI', circuitName: 'Yas Marina Circuit', country: 'UAE',
    lat: 24.4672, lng: 54.6031, region: 'middle-east', raceDate: '2026-12-06',
  },
];

export function calendarRound(round: number): CalendarRound | undefined {
  return SEASON_CALENDAR.find((r) => r.round === round);
}

/** A round can be raced once it has been rotated to: up to this week, with its weekend filled in. */
export function isRoundOpen(round: number): boolean {
  const row = calendarRound(round);
  return !!row && row.round <= CURRENT_ROUND && !!row.weekend;
}

/** The open rounds, in calendar order. */
export function openRounds(): CalendarRound[] {
  return SEASON_CALENDAR.filter((r) => isRoundOpen(r.round));
}

export function roundsInRegion(region: MapRegion): CalendarRound[] {
  return SEASON_CALENDAR.filter((r) => r.region === region);
}

export function regionSpec(region: MapRegion): RegionSpec {
  return MAP_REGIONS.find((r) => r.id === region)!;
}

/** `?region=europe` → 'europe'; anything else → null. */
export function parseMapRegion(search: string): MapRegion | null {
  const value = new URLSearchParams(search).get('region');
  return MAP_REGIONS.some((r) => r.id === value) ? (value as MapRegion) : null;
}

/** `?round=9` → 9 when that round is in the calendar; anything else → null. Openness is checked by the caller. */
export function parseWeekendRound(search: string): number | null {
  const value = new URLSearchParams(search).get('round');
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  const round = Number(value);
  return calendarRound(round) ? round : null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** '2026-11-08' → '8 NOV' (the date as written, never shifted by the viewer's time zone). */
export function formatRaceDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
