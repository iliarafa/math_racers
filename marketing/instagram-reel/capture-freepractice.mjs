// Records a 100-lap Free Practice session (addition, locked at Formula 2) played like a person
// would: each answer is paced against that question's bot time, so the sector grid fills
// with a human mix of purple (under half the bot's time), green (under the bot's time) and
// yellow (slower). Laps 1-74 run off camera and fill the grid with that mix; laps 75-81 are
// recorded. Every correct answer is followed by the app's 0.6 s pause, so on camera the laps
// are quick (purple) to land two of them (laps 75 and 76) in the 4-second scene.
import { openPhone, Recorder, FPS, waitForApp, questionBotTime } from './browser.mjs';
import { RACER, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const FIRST_ON_AIR = 75, LAST_ON_AIR = 81;

let seed = 5;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + (b - a) * rand();
/** Off camera: about half purple, a third green, the rest yellow. */
const offAirPace = () => { const r = rand(); return r < 0.5 ? 'purple' : r < 0.84 ? 'green' : 'yellow'; };

const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, seed: Number(process.env.SEED || 31),
  storage: { ...stateStorage(RACER), setupOperation: 'Addition', difficultyMode: 'locked', lockedDifficulty: 'medium', freePracticeLaps: '100' } });
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

const tally = { purple: 0, green: 0, yellow: 0 };
for (let lap = 1; lap <= LAST_ON_AIR; lap++) {
  if (!(await answerEl.count())) break;
  if (lap === FIRST_ON_AIR) { rec.recording = true; rec.mark('racing'); }
  const q = (await questionEl.innerText()).trim().replace(/\s+/g, ' ');
  const m = q.match(/^(\d+) \+ (\d+)$/);
  if (!m) { console.log('unparsed question', JSON.stringify(q)); break; }
  const ans = String(Number(m[1]) + Number(m[2]));
  const bot = (await questionBotTime(page, q)) ?? 3000;
  const pace = lap >= FIRST_ON_AIR ? 'purple' : offAirPace();
  const share = { purple: between(0.28, 0.42), green: between(0.58, 0.9), yellow: between(1.08, 1.4) }[pace];
  // on camera: a quick but human answer, 0.95-1.25 s (well inside purple for these bot times)
  const target = lap >= FIRST_ON_AIR ? Math.min(between(950, 1250), 0.45 * bot) : share * bot;
  // typing takes roughly 70 ms per key press plus the gaps between them
  const gaps = [...ans].map((_, i) => (i ? between(110, 170) : 0));
  const typing = gaps.reduce((a, b) => a + b, 0) + 70 * (ans.length + 1);
  const beforeSubmit = between(120, 190);
  const think = Math.max(300, target - typing - beforeSubmit);
  rec.mark('question', { lap, q, ans, pace, bot });
  await step(think);
  for (const [i, d] of [...ans].entries()) {
    if (i) await step(gaps[i]);
    await rec.tap(page.getByTestId(`keypad-${d}`), { hold: 70 });
  }
  await step(beforeSubmit);
  await rec.tap(page.getByTestId('keypad-submit'), { hold: 70 });
  rec.mark('answered', { lap, q, ans, pace });
  tally[pace]++;
  for (let w = 0; w < 120; w++) {
    await step(1000 / FPS);
    if (!(await answerEl.count())) break;
    if ((await answerEl.innerText()).trim() === '0') break;
  }
  if (lap >= FIRST_ON_AIR - 1) console.log(`lap ${lap}: ${q} = ${ans}  ${pace} (bot ${Math.round(bot)} ms)  frame ${rec.frame}`);
}
await rec.advance(500);
rec.save();
console.log('paces:', JSON.stringify(tally), ' frames:', rec.frame);
await browser.close();
