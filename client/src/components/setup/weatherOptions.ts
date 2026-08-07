import type { Weather } from '@/lib/gameLogic';

export interface WeatherOption {
  id: Weather;
  label: string;
}

export const WEATHER_DRUM_OPTIONS: WeatherOption[] = [
  { id: 'dry', label: 'Dry' },
  { id: 'wet', label: 'Wet' },
  { id: 'random', label: 'Random' },
];

export function weatherDrumIndex(weather: Weather): number {
  const i = WEATHER_DRUM_OPTIONS.findIndex((o) => o.id === weather);
  return i >= 0 ? i : 0;
}
