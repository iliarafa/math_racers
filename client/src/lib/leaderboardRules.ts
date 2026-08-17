export const LEADERBOARD_OPERATIONS = [
  'Addition',
  'Subtraction',
  'Multiplication',
  'Division',
  'Variables',
] as const;

export type LeaderboardTab = 'free-practice' | 'grand-prix';

export function shouldReplaceBest(existingScore: number | null, incomingScore: number): boolean {
  return existingScore === null || incomingScore > existingScore;
}

function parseOperation(raw: string | null, persistedOperation: string): string {
  if (raw && (LEADERBOARD_OPERATIONS as readonly string[]).includes(raw)) return raw;
  if ((LEADERBOARD_OPERATIONS as readonly string[]).includes(persistedOperation)) return persistedOperation;
  return 'Addition';
}

function parseTab(mode: string | null): LeaderboardTab {
  if (mode === 'grand-prix') return 'grand-prix';
  return 'free-practice';
}

export function resolveLeaderboardView(input: {
  search: string;
  currentCircuitId: string;
  persistedOperation: string;
}): { tab: LeaderboardTab; circuitId: string | 'all'; operation: string } {
  const params = new URLSearchParams(input.search.startsWith('?') ? input.search.slice(1) : input.search);
  const circuitRaw = params.get('circuit');
  return {
    tab: parseTab(params.get('mode')),
    circuitId: circuitRaw === 'all' ? 'all' : (circuitRaw || input.currentCircuitId),
    operation: parseOperation(params.get('operation'), input.persistedOperation),
  };
}

export function leaderboardEmptyMessage(
  tab: LeaderboardTab,
  operation: string,
  circuitLabel: string | 'all',
): string {
  const session = tab === 'free-practice' ? `100-lap ${operation}` : `Race Day ${operation}`;
  if (circuitLabel === 'all') return `No ${session} times yet`;
  return `No ${session} times at ${circuitLabel} yet`;
}

export function circuitPickerIds(currentCircuitId: string, historyIds: string[]): string[] {
  const rest = historyIds.filter((id) => id !== currentCircuitId);
  return [currentCircuitId, ...rest];
}
