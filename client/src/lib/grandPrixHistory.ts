import catalunyaDetail from "@/assets/catalunya_detail_track.png";

export type Driver = { name: string; team: string };
export type PodiumEntry = Driver & { time?: string };
export type QualiEntry = Driver & { time?: string };

export type GrandPrixHistory = {
  officialName: string;
  firstHeld: number;
  trackLength: string;
  laps: number;
  lapRecord: { driver: string; time: string; year: number };
  mostWins: { driver: string; count: number };
  summary: string;
  detailMapImage?: string;
  lastYear: {
    season: number;
    race: [PodiumEntry, PodiumEntry, PodiumEntry];
    quali: [QualiEntry, QualiEntry, QualiEntry];
  };
};

export const GP_HISTORY: Record<string, GrandPrixHistory> = {
  barcelona: {
    officialName: 'Formula 1 Aramco Gran Premio de España',
    firstHeld: 1991,
    trackLength: '4.657 km',
    laps: 66,
    lapRecord: { driver: 'Max Verstappen', time: '1:16.330', year: 2023 },
    mostWins: { driver: 'Michael Schumacher', count: 6 },
    summary:
      'The Circuit de Barcelona-Catalunya has hosted the Spanish Grand Prix since 1991 and is one of the most familiar tracks on the calendar — most teams test here every winter. Its mix of fast sweepers, long straights and a tight final sector makes it a complete test of aero balance and tyre management; overtaking is famously hard, so qualifying counts double.',
    detailMapImage: catalunyaDetail,
    lastYear: {
      season: 2025,
      race: [
        { name: 'Oscar Piastri', team: 'McLaren', time: '1:32:08.319' },
        { name: 'Lando Norris', team: 'McLaren', time: '+2.471' },
        { name: 'Charles Leclerc', team: 'Ferrari', time: '+10.455' },
      ],
      quali: [
        { name: 'Oscar Piastri', team: 'McLaren', time: '1:11.546' },
        { name: 'Lando Norris', team: 'McLaren', time: '1:11.755' },
        { name: 'Max Verstappen', team: 'Red Bull', time: '1:11.848' },
      ],
    },
  },
};

export function getGrandPrixHistory(circuitId: string): GrandPrixHistory | null {
  return GP_HISTORY[circuitId] ?? null;
}
