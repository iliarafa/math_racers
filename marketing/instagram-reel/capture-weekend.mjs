// Records a Grand Prix weekend on times tables, raced in order as a player would: the weekend
// menu (setup card) and the tap on Start, then Practice (which sets the weekend's level),
// Qualifying and Race Day. Every answer is paced like a person's, so the grids and Race Day's
// full-screen flashes show a mix of purple, green and yellow:
//  - Practice colours against the question's own bot time (as Free Practice does);
//  - Qualifying and Race colour against the bot's time on the same lap, so the player races
//    just behind the bot and answers faster or slower than it lap by lap.
// Only the stretches the reel can use are recorded (RECORD below).
import { openPhone, Recorder, FPS, waitForApp, questionBotTime, botLapTime } from './browser.mjs';
import { RACER, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const RECORD = { practice: [22, 30], qualifying: [5, 13], race: [2, 10] };

let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const between = (a, b) => a + (b - a) * rand();
const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '−': (a, b) => a - b, '×': (a, b) => a * b, 'x': (a, b) => a * b, '÷': (a, b) => a / b, '/': (a, b) => a / b };

const { browser, page } = await openPhone({ cacheDir: `${WORK}/netcache`, webmDir: `${WORK}/webm`, seed: Number(process.env.SEED || 21),
  storage: { ...stateStorage(RACER), setupOperation: 'Multiplication' } });
page.on('pageerror', e => console.log('pageerror:', e.message));
const rec = new Recorder(page, `${WORK}/clips/weekend`);
const answerEl = page.getByTestId('display-answer');
const questionEl = answerEl.locator('xpath=preceding-sibling::div[1]');

/** Advance virtual time; off camera, keep animations in step so exits still complete. */
async function step(ms) {
  await rec.advance(ms);
  if (!rec.recording) await rec.settle({ video: false });
}

/** How long to take over this answer, and the colour it is aiming for. */
async function paceFor(session, q) {
  if (session === 'practice') {
    const bot = (await questionBotTime(page, q)) ?? 3000;
    const r = rand(), pace = r < 0.5 ? 'purple' : r < 0.84 ? 'green' : 'yellow';
    return { pace, ms: { purple: between(0.28, 0.42), green: between(0.58, 0.9), yellow: between(1.08, 1.4) }[pace] * bot };
  }
  const hud = (await page.locator('#root').innerText()).match(/LAP\s+(\d+)\s*\/\s*\d+/i);
  const sector = hud ? Number(hud[1]) - 1 : 0;
  const bot = await botLapTime(page, sector);
  if (bot == null) return { pace: 'behind-bot', ms: between(1700, 2400) };   // let the bot lead
  const r = rand(), pace = r < 0.4 ? 'purple' : r < 0.8 ? 'green' : 'yellow';
  return { pace, ms: { purple: between(0.62, 0.9), green: between(1.08, 1.42), yellow: between(1.6, 1.95) }[pace] * bot };
}

/** Tap Start on the setup card, wait out the lights, then answer `laps` questions. */
async function race(label, laps = 60) {   // 60: a safety cap, far above any session here
  await rec.tap(page.getByTestId('button-start-race'));
  rec.recording = false;
  for (let i = 0; i < 400 && !(await answerEl.count()); i++) await step(1000 / FPS);
  const [from, to] = RECORD[label];
  for (let lap = 1; lap <= laps; lap++) {
    if (!(await answerEl.count())) break;
    if (lap === from) { rec.recording = true; rec.mark(`${label}-racing`); }
    if (lap === to + 1) { rec.mark(`${label}-end`); rec.recording = false; }
    const q = (await questionEl.innerText()).trim().replace(/\s+/g, ' ');
    const m = q.match(/^(\d+) ([+\-−×x÷/]) (\d+)$/);
    if (!m) { console.log(label, 'unparsed question', JSON.stringify(q)); break; }
    const ans = String(OPS[m[2]](Number(m[1]), Number(m[3])));
    const { pace, ms } = await paceFor(label, q);
    const gaps = [...ans].map((_, i) => (i ? between(110, 170) : 0));
    const beforeSubmit = between(120, 190);
    const typing = gaps.reduce((a, b) => a + b, 0) + 70 * (ans.length + 1) + beforeSubmit;
    rec.mark('question', { session: label, lap, q, ans, pace });
    await step(Math.max(350, ms - typing));
    for (const [i, d] of [...ans].entries()) {
      if (i) await step(gaps[i]);
      await rec.tap(page.getByTestId(`keypad-${d}`), { hold: 70 });
    }
    await step(beforeSubmit);
    await rec.tap(page.getByTestId('keypad-submit'), { hold: 70 });
    rec.mark('answered', { session: label, lap, q, ans, pace });
    for (let w = 0; w < 120; w++) {
      await step(1000 / FPS);
      if (!(await answerEl.count())) break;
      if ((await answerEl.innerText()).trim() === '0') break;
    }
    if (lap >= from && lap <= to) console.log(`${label} lap ${lap}: ${q} = ${ans}  ${pace}  (frame ${rec.frame})`);
    if (label === 'race' && lap >= to) break;
  }
  rec.recording = false;
}

/** Off camera: the result screen's Continue button, back to the setup card for the next session. */
async function continueTo(name) {
  const btn = page.getByRole('button', { name });
  for (let i = 0; i < 300 && !(await btn.count()); i++) await step(100);
  await btn.click();
  for (let t = 0; t < 1200; t += 100) await step(100);
}

await page.goto(`${APP}/game/grand-prix`, { waitUntil: 'load' });
await waitForApp(page);
rec.recording = true;
rec.mark('menu');
for (let t = 0; t < 3000; t += 1000 / FPS) await step(1000 / FPS);   // the card arrives and settles

await race('practice');
await continueTo(/Continue to Qualifying/i);
await race('qualifying');
await continueTo(/Continue to Race/i);
await race('race');
rec.save();
console.log('frames:', rec.frame);
await browser.close();
