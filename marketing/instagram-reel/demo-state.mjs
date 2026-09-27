// A demo player profile for the capture scripts: a name (so no name prompt covers the finish
// screen) and, for the menu screens, a season's worth of trophies, badges and a daily streak.
const day = 86400000;
const at = d => new Date('2026-09-26T16:00:00').getTime() - d * day;
const trophy = (round, circuitId, name, tier, operation, d) =>
  ({ id: `gp:2026:${round}:${circuitId}`, season: 2026, round, circuitId, name, tier, operation, at: at(d) });

export const RACER = { playerName: 'Alex', playerId: 'demo-player', soundEnabled: false };

export const ENGAGED = {
  ...RACER,
  totalLaps: 1260, racesWon: 23, careerPoints: 410,
  earnedBadges: ['first-win', 'laps-100', 'laps-1000', 'everything-is-purple', 'streak-7'],
  // Rounds 9 (Silverstone) and 12 (Zandvoort) stay empty: the trophy tile can't fit a name that
  // long yet (see "Known issue" in README.md).
  trophies: [
    trophy(10, 'spa', 'SPA', 'gold', 'Addition', 69),
    trophy(11, 'hungary', 'HUNGARY', 'bronze', 'Subtraction', 62),
    trophy(13, 'monza', 'MONZA', 'gold', 'Multiplication', 20),
    trophy(14, 'madrid', 'MADRID', 'silver', 'Division', 13),
  ],
  dailyStreak: { count: 12, lastDay: '2026-09-26', best: 12, recentDays: [], pitStops: 1 },
  unseenRewards: [],
};

/** localStorage for a returning player: state blob plus the one-time notices already seen. */
export const stateStorage = s => ({
  'f1-math-racer-state': JSON.stringify(s),
  quickRaceIntroSeen: '1',
  'drivingSchoolWhatsNew.v1': '1',
});
