// Shared browser setup for the capture scripts.
//
// An iPhone-sized page (393x852 pt, 3x) with the Dynamic Island safe-area insets emulated, so
// the app lays out exactly as it does on a phone. External requests (Google Fonts) are fetched
// once with curl, which trusts this environment's CA, and served from a cache.
//
// Time is virtual: Playwright's fake clock drives setTimeout/setInterval/rAF/Date/performance,
// and CSS / Web Animations are re-seeked to that clock before every screenshot, so the footage
// plays at true game speed no matter how slow each screenshot is.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Playwright from the project, $PLAYWRIGHT_MODULE, or a global install. */
async function loadPlaywright() {
  const specs = ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright/index.mjs'];
  for (const spec of specs.filter(Boolean)) {
    try { return await import(spec); } catch { /* try the next one */ }
  }
  throw new Error('Playwright not found: `npm i -D playwright` or set PLAYWRIGHT_MODULE to its index.mjs');
}
export const { chromium } = await loadPlaywright();

export const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
export const PHONE = { width: 393, height: 852, top: 59, bottom: 34 };
export const FPS = 30;
export const T0 = new Date('2026-09-26T16:00:00').getTime();

function cachedFetch(cacheDir, url) {
  const key = createHash('sha1').update(url).digest('hex');
  const body = path.join(cacheDir, key + '.body');
  const meta = path.join(cacheDir, key + '.json');
  if (!fs.existsSync(meta)) {
    const r = spawnSync('curl', ['-sS', '-L', '--max-time', '20', '-A', UA, '-o', body, '-w', '%{http_code} %{content_type}', url], { encoding: 'utf8' });
    const [code, ...ct] = (r.stdout || '').trim().split(' ');
    fs.writeFileSync(meta, JSON.stringify({ url, status: Number(code) || 0, contentType: ct.join(' ') }));
  }
  const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
  if (m.status < 200 || m.status >= 400 || !fs.existsSync(body)) return null;
  return { ...m, body: fs.readFileSync(body) };
}

export async function openPhone({ cacheDir, webmDir, dpr = 3, storage = {}, routes = [], seed = null } = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: dpr,
    isMobile: true, hasTouch: true, userAgent: UA,
  });
  for (const [match, handler] of routes) await context.route(match, handler);
  // Open-source Chromium has no H.264: serve the WebM transcodes of the app's background videos.
  if (webmDir) await context.route(/\.mp4(\?|$)/, async route => {
    if (route.request().resourceType() !== 'media') return route.fallback(); // Vite's `?import` module
    const name = path.basename(new URL(route.request().url()).pathname, '.mp4').replace(/-[A-Za-z0-9_]{8}$/, '');
    const file = path.join(webmDir, name + '.webm');
    if (!fs.existsSync(file)) return route.abort();
    // Answer byte ranges as a real server does: without them the video can't seek, and the
    // recorder seeks every video to virtual time before each frame.
    const body = fs.readFileSync(file), range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
    const headers = { 'content-type': 'video/webm', 'accept-ranges': 'bytes' };
    if (!range) return route.fulfill({ status: 200, body, headers });
    const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    await route.fulfill({ status: 206, body: body.subarray(start, end + 1),
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${body.length}` } });
  });
  await context.route(u => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname), async route => {
    const url = route.request().url();
    if (url.includes('mcp.figma.com') || url.includes('supabase')) return route.abort();
    const hit = cachedFetch(cacheDir, url);
    if (!hit) return route.abort();
    await route.fulfill({ status: hit.status, body: hit.body, headers: {
      'content-type': hit.contentType || 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  // Deterministic Math.random, so a capture replays the same questions and lanes.
  if (seed != null) await context.addInitScript(s0 => {
    let s = s0 % 2147483647 || 1;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  }, seed);
  // Seed localStorage before any app script runs.
  await context.addInitScript(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: PHONE.top, bottom: PHONE.bottom, left: 0, right: 0 } });
  // Real-time animation progress between frames is slowed to a crawl; syncAnimations() seeks
  // every animation to virtual time before each screenshot.
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.02 });
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0 + 10);
  return { browser, context, page, cdp };
}

/** The dev server compiles modules on demand, so wait in real time until the app has painted. */
export async function waitForApp(page) {
  await page.waitForLoadState('networkidle');
  for (let i = 0; i < 300; i++) {
    const ready = await page.evaluate(() => (document.querySelector('#root')?.innerText || '').trim().length > 0);
    if (ready) break;
    await page.clock.runFor(20);
    await page.waitForTimeout(50);
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** Frame recorder over virtual time. */
export class Recorder {
  constructor(page, dir, { quality = 92 } = {}) {
    this.page = page; this.dir = dir; this.quality = quality;
    this.vt = 0;            // virtual ms elapsed on this page
    this.t0 = 0;            // virtual time of frame 0
    this.frame = 0;         // next frame index
    this._recording = false;
    this.events = [];       // taps and markers, stamped with frame index
    fs.mkdirSync(dir, { recursive: true });
  }
  /** Frames count from the moment recording (re)starts, however long the page ran unrecorded. */
  get recording() { return this._recording; }
  set recording(on) {
    if (on && !this._recording) this.t0 = this.vt - Math.round((this.frame * 1000) / FPS);
    this._recording = on;
  }
  nextFrameTime() { return this.t0 + Math.round((this.frame * 1000) / FPS); }
  async settle({ video = true } = {}) {
    await this.page.evaluate(() => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }));
    await this.page.evaluate(() => {
      const now = performance.now();
      const seen = (window.__animSeen ||= new WeakMap());
      for (const a of document.getAnimations()) {
        if (!seen.has(a)) seen.set(a, now);
        try { a.currentTime = Math.max(0, now - seen.get(a)); } catch {}
      }
    });
    // Background videos follow virtual time too.
    if (video) await this.page.evaluate(() => Promise.all([...document.querySelectorAll('video')].map(v => new Promise(r => {
      if (!(v.duration > 0)) return r();
      v.pause();
      const t = (performance.now() / 1000) % v.duration;
      if (Math.abs(v.currentTime - t) < 0.001) return r();
      const done = () => { v.removeEventListener('seeked', done); r(); };
      v.addEventListener('seeked', done);
      v.currentTime = t;
      setTimeout.call(window, done, 0); // fake clock: resolves on the next runFor at worst
    }))).then(() => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); })));
    await this.page.evaluate(() => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }));
  }
  /** Jump every finite animation to its end state (for stills). */
  async finishAnimations() {
    await this.page.evaluate(() => {
      for (const a of document.getAnimations()) {
        const end = a.effect?.getComputedTiming?.().endTime;
        if (Number.isFinite(end)) { try { a.finish(); } catch {} }
      }
    });
    await this.settle();
  }
  async shoot() {
    await this.settle();
    const file = path.join(this.dir, String(this.frame).padStart(5, '0') + '.jpg');
    await this.page.screenshot({ path: file, type: 'jpeg', quality: this.quality });
    this.frame++;
  }
  /** Advance virtual time by ms, capturing frames on the way when recording. */
  async advance(ms) {
    const target = this.vt + ms;
    while (this.recording && this.nextFrameTime() <= target) {
      const t = this.nextFrameTime();
      if (t > this.vt) { await this.page.clock.runFor(t - this.vt); this.vt = t; }
      await this.shoot();
    }
    if (target > this.vt) { await this.page.clock.runFor(target - this.vt); this.vt = target; }
  }
  mark(name, data = {}) { if (this.recording) this.events.push({ type: 'mark', name, frame: this.frame, ...data }); }
  /** Press and release an element like a finger: pointer down, hold, pointer up. */
  async tap(locator, { hold = 90 } = {}) {
    const box = await locator.boundingBox();
    if (!box) throw new Error('tap target not visible');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (this.recording) this.events.push({ type: 'tap', frame: this.frame, x, y, w: box.width, h: box.height });
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.advance(hold);
    await this.page.mouse.up();
  }
  save(extra = {}) {
    fs.writeFileSync(path.join(this.dir, 'events.json'), JSON.stringify({ fps: FPS, frames: this.frame, events: this.events, ...extra }, null, 1));
  }
}

/*
 * Pacing helpers: the app colours each lap (sector) by comparing the answer time with a bot's.
 * Practice modes compare with the question's own bot time (purple under half of it, green
 * under it, yellow slower); race modes compare with the bot's time on the same lap, once the
 * bot has driven it (purple if faster, green within 1.5x, yellow slower). Both are read from
 * the game's state through React's fiber tree, so a scripted player can land a chosen colour.
 */
async function findState(page, test, arg) {
  return page.evaluate(([src, arg]) => {
    const test = new Function('v', 'arg', src);
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const stack = key ? [root[key]] : [];
    while (stack.length) {
      const f = stack.pop();
      for (let h = f.memoizedState, n = 0; h && typeof h === 'object' && n < 1000; h = h.next, n++) {
        const found = test(h.memoizedState, arg);
        if (found !== undefined) return found;
      }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
    return null;
  }, [test, arg]);
}

/** The bot time of the question on screen (practice modes). */
export function questionBotTime(page, display) {
  return findState(page, `
    if (v && typeof v === 'object' && typeof v.botTime === 'number' && typeof v.display === 'string'
      && v.display.replace(/\\s+/g, ' ').trim() === arg) return v.botTime;`, display);
}

/** The bot's time on lap `sector` (0-based) if it has driven it yet, else null (race modes). */
export function botLapTime(page, sector) {
  return findState(page, `
    if (Array.isArray(v) && v.length && v[0] && typeof v[0].botTime === 'number' && 'sectorColor' in v[0])
      return v[arg] ? v[arg].botTime : null;`, sector);
}
