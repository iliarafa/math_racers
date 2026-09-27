// Records Free Practice: addition, locked at Formula 2, a quick (scripted) player tapping the
// keypad. The setup card and the start lights run off camera.
import { openPhone, Recorder, FPS, waitForApp } from './browser.mjs';
import { RACER, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const LAPS = Number(process.env.FP_LAPS || 10);

let seed = 5;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + (b - a) * rand();

const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, seed: Number(process.env.SEED || 31),
  storage: { ...stateStorage(RACER), setupOperation: 'Addition', difficultyMode: 'locked', lockedDifficulty: 'medium', freePracticeLaps: '25' } });
page.on('pageerror', e => console.log('pageerror:', e.message));
const rec = new Recorder(page, `${WORK}/clips/freepractice`);
const answerEl = page.getByTestId('display-answer');
const questionEl = answerEl.locator('xpath=preceding-sibling::div[1]');
const step = async ms => { await rec.advance(ms); if (!rec.recording) await rec.settle({ video: false }); };

await page.goto(`${APP}/game/free-practice`, { waitUntil: 'load' });
await waitForApp(page);
for (let t = 0; t < 1500; t += 100) await step(100);
await rec.tap(page.getByTestId('button-start-race'));
for (let i = 0; i < 400 && !(await answerEl.count()); i++) await step(1000 / FPS);

rec.recording = true;
rec.mark('racing');
for (let lap = 1; lap <= LAPS; lap++) {
  if (!(await answerEl.count())) break;
  const q = (await questionEl.innerText()).trim().replace(/\s+/g, ' ');
  const m = q.match(/^(\d+) \+ (\d+)$/);
  if (!m) { console.log('unparsed question', JSON.stringify(q)); break; }
  const ans = String(Number(m[1]) + Number(m[2]));
  rec.mark('question', { lap, q, ans });
  await step(between(380, 600));
  for (const [i, d] of [...ans].entries()) {
    if (i) await step(between(110, 170));
    await rec.tap(page.getByTestId(`keypad-${d}`), { hold: 70 });
  }
  await step(between(120, 190));
  await rec.tap(page.getByTestId('keypad-submit'), { hold: 70 });
  rec.mark('answered', { lap, q, ans });
  for (let w = 0; w < 120; w++) {
    await step(1000 / FPS);
    if (!(await answerEl.count())) break;
    if ((await answerEl.innerText()).trim() === '0') break;
  }
  console.log(`lap ${lap}: ${q} = ${ans}  (frame ${rec.frame})`);
}
await rec.advance(500);
rec.save();
console.log('frames:', rec.frame);
await browser.close();
