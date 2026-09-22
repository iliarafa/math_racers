/** Pages that play the menu music (MenuMusic in App.tsx), matched exactly. */
const MENU_ROUTES = ['/', '/hub', '/game', '/strategy', '/regulations', '/racer-log', '/trophies', '/leaderboard', '/lane-racer', '/multiplayer', '/grand-prix', '/driving-school', '/reaction'];

/**
 * Whether the menu music may play on `location`. Every `/game/<mode>` route counts: its
 * setup card is a menu, and Game pauses the music itself from the red lights on by sending
 * `racingStateChange`, so the music plays right up to the start sequence.
 */
export function isMenuMusicRoute(location: string): boolean {
  return MENU_ROUTES.includes(location) || location.startsWith('/game/');
}
