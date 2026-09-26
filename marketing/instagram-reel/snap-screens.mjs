// Stills of the menu screens, each after a short settle in virtual time.
import { openPhone, Recorder, waitForApp } from './browser.mjs';
import { ENGAGED, stateStorage } from './demo-state.mjs';
import fs from 'node:fs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const only = process.argv.slice(2);
const SHOTS = [
  { name: 'hub', url: '/hub', settle: 2500 },
  { name: 'grand-prix', url: '/game/grand-prix', settle: 2500 },
  { name: 'trophies', url: '/trophies', settle: 2500 },
  { name: 'lane-racer', url: '/lane-racer', settle: 2500 },
  { name: 'driving-school', url: '/driving-school', settle: 2500 },
  { name: 'garage', url: '/garage', settle: 2500 },
  { name: 'reaction', url: '/reaction', settle: 2500 },
];
fs.mkdirSync(`${WORK}/stills`, { recursive: true });


for (const shot of SHOTS.filter(s => !only.length || only.includes(s.name))) {
  const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`,
    storage: { ...stateStorage(ENGAGED), ...(shot.storage || {}) } });
  page.on('pageerror', e => console.log(shot.name, 'pageerror:', e.message));
  const rec = new Recorder(page, `${WORK}/stills/.tmp-${shot.name}`);
  await page.goto(APP + shot.url, { waitUntil: 'load' });
  await waitForApp(page);
  for (let t = 0; t < shot.settle; t += 100) { await rec.advance(100); await rec.settle(); }
  await rec.finishAnimations();
  await page.screenshot({ path: `${WORK}/stills/${shot.name}.png` });
  console.log('shot', shot.name);
  await browser.close();
}
