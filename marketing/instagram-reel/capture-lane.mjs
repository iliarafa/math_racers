// Records Lane Racer's 3D chase cam late in a race, once the car has sped up and the questions
// roll in quickly: Start, the lights, then a player who steers into the lane holding the right
// answer. The first LANE_FROM answers are played off camera and the next LANE_SECONDS are
// recorded. The lane is read from the game's own controller (found through React's fiber tree)
// and the car is steered with the arrow keys.
//
// The iPhone app's chase cam eases sideways to follow the car into the side lanes; the browser
// build keeps it centred, which leaves the car half off a portrait screen. The capture turns the
// app's follow on so the footage matches the iPhone.
import { openPhone, Recorder, FPS, waitForApp } from './browser.mjs';
import { ENGAGED, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const FROM = Number(process.env.LANE_FROM || 22);
const SECONDS = Number(process.env.LANE_SECONDS || 14);

const nativeChaseCam = [/\/LaneRacerCanvas3D\.tsx(\?|$)/, async route => {
  const res = await route.fetch();
  const src = await res.text();
  const body = src.replace(/const NATIVE_SOFT_FOLLOW = [^;\n]+;/, 'const NATIVE_SOFT_FOLLOW = true;');
  if (body === src) throw new Error('chase-cam follow switch not found in LaneRacerCanvas3D');
  await route.fulfill({ response: res, body });
}];

const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, dpr: 2, seed: Number(process.env.SEED || 5),
  storage: { ...stateStorage(ENGAGED), laneRacerRenderer: '3d', lastSelectedTeam: 'ferrari' }, routes: [nativeChaseCam] });
page.on('pageerror', e => console.log('pageerror:', e.message));
const rec = new Recorder(page, `${WORK}/clips/lane`);
await page.goto(`${APP}/lane-racer`, { waitUntil: 'load' });
await waitForApp(page);
for (let t = 0; t < 1500; t += 100) { await rec.advance(100); await rec.settle(); }

const readGame = () => page.evaluate(() => {
  const isCtl = v => v && typeof v.spawnTokens === 'function' && Array.isArray(v.tokens);
  if (!isCtl(window.__lrc)) {
    window.__lrc = null;
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const stack = key ? [root[key]] : [];
    while (stack.length && !window.__lrc) {
      const f = stack.pop();
      for (let h = f.memoizedState, n = 0; h && typeof h === 'object' && n < 60; h = h.next, n++) {
        const v = h.memoizedState;
        if (v && typeof v === 'object' && 'current' in v && isCtl(v.current)) { window.__lrc = v.current; break; }
      }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
  }
  const c = window.__lrc;
  if (!c) return null;
  const good = c.tokens.find(t => t.isCorrect);
  return { carLane: c.carLane, target: good ? good.lane : null, tokenId: good ? good.id : null, answered: c.questionsAnswered, speed: c.speed };
});

await rec.tap(page.getByTestId('button-start-race'));
let seenToken = null, seenAt = 0, lastMove = -1e9, answered = 0, lastHitAt = 0, end = Infinity;
while (rec.vt < end) {
  await rec.advance(1000 / FPS);
  if (!rec.recording) await rec.settle({ video: false });
  const g = await readGame();
  if (g && g.answered !== answered) {
    answered = g.answered;
    console.log(`answer ${answered}: ${((rec.vt - lastHitAt) / 1000).toFixed(2)} s after the last, speed ${Number(g.speed).toFixed(2)}`);
    lastHitAt = rec.vt;
    if (answered === FROM) { rec.recording = true; end = rec.vt + SECONDS * 1000; }
    rec.mark('hit', { answered });
  }
  if (!g || g.target == null) continue;
  if (g.tokenId !== seenToken) { seenToken = g.tokenId; seenAt = rec.vt; rec.mark('question', { lane: g.target }); }
  const reaction = 420 + ((g.tokenId * 97) % 5) * 40;   // a human beat before steering
  if (g.carLane !== g.target && rec.vt - seenAt > reaction && rec.vt - lastMove > 170) {
    const key = g.target < g.carLane ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.press(key);
    if (rec.recording) rec.events.push({ type: 'steer', frame: rec.frame, key });
    lastMove = rec.vt;
  }
}
rec.save();
console.log('frames:', rec.frame);
await browser.close();
