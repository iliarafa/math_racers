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
    race: PodiumEntry[];
    quali: QualiEntry[];
  };
};

export const GP_HISTORY: Record<string, GrandPrixHistory> = {
  barcelona: {
    officialName: 'GRAN PREMIO DE BARCELONA-CATALUNYA 2026',
    firstHeld: 1991,
    trackLength: '4.657 km',
    laps: 66,
    lapRecord: { driver: 'Max Verstappen', time: '1:16.330', year: 2023 },
    mostWins: { driver: 'Schumacher & Hamilton', count: 6 },
    summary:
      'The Circuit de Barcelona-Catalunya has hosted the Spanish Grand Prix since 1991 and is one of the most familiar tracks on the calendar — most teams test here every winter. Located in Montmeló, just north of Barcelona, it mixes high-speed sweepers, long straights and a now faster, more flowing final sector (following the removal of the chicane ahead of the 2023 season). The result is a complete test of aero balance and tyre management; overtaking is famously hard, so qualifying counts double.',
    detailMapImage: catalunyaDetail,
    lastYear: {
      season: 2025,
      race: [
        { name: 'Oscar Piastri', team: 'McLaren', time: '1:32:57.375' },
        { name: 'Lando Norris', team: 'McLaren', time: '+2.471' },
        { name: 'Charles Leclerc', team: 'Ferrari', time: '+10.455' },
        { name: 'George Russell', team: 'Mercedes', time: '+11.359' },
        { name: 'Nico Hulkenberg', team: 'Kick Sauber', time: '+13.648' },
        { name: 'Lewis Hamilton', team: 'Ferrari', time: '+15.508' },
        { name: 'Isack Hadjar', team: 'Racing Bulls', time: '+16.022' },
        { name: 'Pierre Gasly', team: 'Alpine', time: '+17.882' },
        { name: 'Fernando Alonso', team: 'Aston Martin', time: '+21.564' },
        { name: 'Max Verstappen', team: 'Red Bull', time: '+21.826' },
        { name: 'Liam Lawson', team: 'Racing Bulls', time: '+25.532' },
        { name: 'Gabriel Bortoleto', team: 'Kick Sauber', time: '+25.996' },
        { name: 'Yuki Tsunoda', team: 'Red Bull', time: '+28.822' },
        { name: 'Carlos Sainz', team: 'Williams', time: '+29.309' },
        { name: 'Franco Colapinto', team: 'Alpine', time: '+31.381' },
        { name: 'Esteban Ocon', team: 'Haas', time: '+32.197' },
        { name: 'Oliver Bearman', team: 'Haas', time: '+37.065' },
        { name: 'Kimi Antonelli', team: 'Mercedes', time: 'DNF' },
        { name: 'Alexander Albon', team: 'Williams', time: 'DNF' },
        { name: 'Lance Stroll', team: 'Aston Martin', time: 'DNS' },
      ],
      quali: [
        { name: 'Oscar Piastri', team: 'McLaren', time: '1:11.546' },
        { name: 'Lando Norris', team: 'McLaren', time: '1:11.755' },
        { name: 'Max Verstappen', team: 'Red Bull', time: '1:11.848' },
        { name: 'George Russell', team: 'Mercedes', time: '1:11.848' },
        { name: 'Lewis Hamilton', team: 'Ferrari', time: '1:12.045' },
        { name: 'Kimi Antonelli', team: 'Mercedes', time: '1:12.111' },
        { name: 'Charles Leclerc', team: 'Ferrari', time: '1:12.131' },
        { name: 'Pierre Gasly', team: 'Alpine', time: '1:12.199' },
        { name: 'Isack Hadjar', team: 'Racing Bulls', time: '1:12.252' },
        { name: 'Fernando Alonso', team: 'Aston Martin', time: '1:12.284' },
        { name: 'Alexander Albon', team: 'Williams', time: '1:12.641' },
        { name: 'Gabriel Bortoleto', team: 'Kick Sauber', time: '1:12.756' },
        { name: 'Liam Lawson', team: 'Racing Bulls', time: '1:12.763' },
        { name: 'Lance Stroll', team: 'Aston Martin', time: '1:13.058' },
        { name: 'Oliver Bearman', team: 'Haas', time: '1:13.315' },
        { name: 'Nico Hulkenberg', team: 'Kick Sauber', time: '1:13.190' },
        { name: 'Esteban Ocon', team: 'Haas', time: '1:13.201' },
        { name: 'Carlos Sainz', team: 'Williams', time: '1:13.203' },
        { name: 'Franco Colapinto', team: 'Alpine', time: '1:13.334' },
        { name: 'Yuki Tsunoda', team: 'Red Bull', time: '1:13.385' },
      ],
    },
  },
};

export function getGrandPrixHistory(circuitId: string): GrandPrixHistory | null {
  return GP_HISTORY[circuitId] ?? null;
}
