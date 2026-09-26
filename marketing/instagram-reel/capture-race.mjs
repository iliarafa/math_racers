// Records a real Quick Race: 20 laps answered by a quick (scripted) player tapping the
// on-screen keypad, then the result screen. The reel draws its own start lights, so the app's
// are not needed: on a cold dev server they are usually over before the first frame.
import { openPhone, Recorder, FPS, waitForApp } from './browser.mjs';
import { RACER, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const OUT = `${WORK}/clips/race`;

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + (b - a) * rand();

// A named player (no name prompt at the flag) racing for the first time (the First Win badge).
const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, storage: stateStorage(RACER), seed: Number(process.env.SEED || 11) });
const rec = new Recorder(page, OUT);
page.on('pageerror', e => console.log('pageerror:', e.message));

await page.goto(`${APP}/game/quick-race`, { waitUntil: 'load' });
await waitForApp(page);
// Step virtual time until the start lights are on screen (or have been and gone), then roll.
for (let i = 0; i < 200 && !(await page.locator('.rounded-full.bg-zinc-800').count()); i++) {
  await page.clock.runFor(10);
  await page.waitForTimeout(20);
}
rec.recording = true;
rec.mark('lights');

const answerEl = page.getByTestId('display-answer');
const questionEl = answerEl.locator('xpath=preceding-sibling::div[1]');
while (!(await answerEl.count())) await rec.advance(1000 / FPS);
rec.mark('racing');

for (let lap = 1; lap <= 40; lap++) {
  if (!(await answerEl.count())) break;
  const q = (await questionEl.innerText()).trim();
  const m = q.replace(/\s+/g, ' ').match(/^(\d+) \+ (\d+)$/);
  if (!m) { console.log('unparsed question', JSON.stringify(q)); break; }
  const ans = String(Number(m[1]) + Number(m[2]));
  rec.mark('question', { lap, q, ans });
  await rec.advance(between(330, 560));
  for (const [i, d] of [...ans].entries()) {
    if (i) await rec.advance(between(110, 170));
    await rec.tap(page.getByTestId(`keypad-${d}`), { hold: 70 });
  }
  await rec.advance(between(120, 190));
  await rec.tap(page.getByTestId('keypad-submit'), { hold: 70 });
  rec.mark('answered', { lap, q, ans });
  // Wait for the next question (answer resets to the grey "0") or the finish screen.
  for (let w = 0; w < 120; w++) {
    await rec.advance(1000 / FPS);
    if (!(await answerEl.count())) break;
    if ((await answerEl.innerText()).trim() === '0') break;
  }
  console.log(`lap ${lap}: ${q} = ${ans}  (frame ${rec.frame})`);
}
rec.mark('finish');
await rec.advance(6000);
rec.save();
console.log('frames:', rec.frame);
await browser.close();
