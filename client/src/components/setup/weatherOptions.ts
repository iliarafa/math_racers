import type { Weather } from '@/lib/gameLogic';

export interface WeatherOption {
  id: Weather;
  label: string;
  /** Active text colour, matching each condition's established tint. */
  color: string;
}

export const WEATHER_DRUM_OPTIONS: WeatherOption[] = [
  { id: 'dry', label: 'Dry', color: '#eab308' },
  { id: 'wet', label: 'Wet', color: '#3b82f6' },
  { id: 'random', label: 'Random', color: '#a855f7' },
];

export function weatherDrumIndex(weather: Weather): number {
  const i = WEATHER_DRUM_OPTIONS.findIndex((o) => o.id === weather);
  return i >= 0 ? i : 0;
}
