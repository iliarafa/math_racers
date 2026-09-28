// Records the Paddock (the Hub) for the reel's opener, and the Weekend Briefing tile's parts for
// the 3D section in which the tile lifts off the screen and comes apart into layers:
//  - clips/paddock/NNNNN.jpg: the Paddock once it has settled, its background video playing;
//  - clips/paddock/notile/NNNNN.jpg: each frame again with the tile hidden, at the same virtual
//    time so the video frame matches: the ground the tile leaves behind as it lifts;
//  - clips/paddock/layers/*.png: the tile's parts on transparent backgrounds at 8x, sharp in
//    close-up: the gradient plate (no contents, no shadow), the flag, WEEKEND BRIEFING and the
//    round's name;
//  - events.json: where each part sits on the screen, and where its layer image covers.
// Sound is on, so the speaker icon reads as it does on a phone.
import { openPhone, Recorder, FPS, waitForApp } from './browser.mjs';
import { ENGAGED, stateStorage } from './demo-state.mjs';
import fs from 'node:fs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const SECONDS = 4;
const VIDEO_AT = 2500;             // ms into the background loop: the sketched car shading in, moving
const TILE = '[data-testid="link-weekend-briefing"]';
const PAD = 8;                     // CSS px of transparent margin around each layer image
const dir = `${WORK}/clips/paddock`;
const storage = stateStorage({ ...ENGAGED, soundEnabled: true });

/** The tile and its parts, in CSS px from the screen's top-left. */
const measure = page => page.evaluate(sel => {
  const tile = document.querySelector(sel);
  const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const [flag, text] = tile.children;
  return { plate: r(tile), flag: r(flag), label: r(text.children[0]), title: r(text.children[1]) };
}, TILE);

async function open(dpr) {
  const phone = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, dpr, storage });
  phone.page.on('pageerror', e => console.log('pageerror:', e.message));
  await phone.page.goto(`${APP}/hub`, { waitUntil: 'load' });
  await waitForApp(phone.page);
  return phone;
}

// ---- the clip, and the same frames without the tile
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(`${dir}/notile`, { recursive: true });
const clip = await open(3);
const rec = new Recorder(clip.page, dir);
// off camera until the background video (which follows the page clock) reaches VIDEO_AT
const now = await clip.page.evaluate(() => performance.now());
for (let t = now; t < VIDEO_AT; t += 100) { await rec.advance(Math.min(100, VIDEO_AT - t)); await rec.settle(); }
rec.recording = true;
rec.mark('paddock');
for (let i = 0; i < SECONDS * FPS; i++) {
  await rec.advance(Math.max(0, rec.nextFrameTime() - rec.vt));   // exactly one frame
  const hide = await clip.page.addStyleTag({ content: `${TILE} { visibility: hidden !important; }` });
  await rec.settle();
  await clip.page.screenshot({ path: `${dir}/notile/${String(rec.frame - 1).padStart(5, '0')}.jpg`, type: 'jpeg', quality: rec.quality });
  await hide.evaluate(n => n.remove());
}
const rects = await measure(clip.page);
await clip.browser.close();

// ---- the layers, isolated: everything else hidden and every background transparent
const sharp = await open(8);
for (let t = 0; t < 1500; t += 100) await sharp.page.clock.runFor(100);
const again = await measure(sharp.page);
for (const k of Object.keys(rects)) {
  for (const f of ['x', 'y', 'w', 'h']) {
    if (Math.abs(rects[k][f] - again[k][f]) > 0.5) throw new Error(`the ${k} moved between pages (${f}: ${rects[k][f]} vs ${again[k][f]})`);
  }
}
await sharp.page.addStyleTag({ content: `
  html, body, #root { background: transparent !important; }
  body * { visibility: hidden !important; }
  video { display: none !important; }
  [data-layer] { visibility: visible !important; }
  [data-layer="plate"] { box-shadow: none !important; }
` });
fs.mkdirSync(`${dir}/layers`, { recursive: true });
const layers = {};
const parts = { plate: TILE, flag: `${TILE} > img`, label: `${TILE} > div > div:nth-child(1)`, title: `${TILE} > div > div:nth-child(2)` };
for (const [name, sel] of Object.entries(parts)) {
  const el = sharp.page.locator(sel);
  await el.evaluate((e, n) => e.setAttribute('data-layer', n), name);
  const r = rects[name], clip = { x: r.x - PAD, y: r.y - PAD, width: r.w + 2 * PAD, height: r.h + 2 * PAD };
  await sharp.page.screenshot({ path: `${dir}/layers/${name}.png`, clip, omitBackground: true });
  await el.evaluate(e => e.removeAttribute('data-layer'));
  layers[name] = { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
}
await sharp.browser.close();

rec.save({ rects, layers });
console.log('frames:', rec.frame, JSON.stringify(rects));
