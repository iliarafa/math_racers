// Records a Grand Prix weekend on times tables, raced in order as a player would: the weekend
// menu (setup card) and the tap on Start, then Practice (which sets the weekend's level; fast
// answers climb it), Qualifying (which decides pole) and Race Day with its full-screen sector
// flashes. Recording pauses through the start lights and the result screens in between.
import { openPhone, Recorder, FPS, waitForApp } from './browser.mjs';
import { RACER, stateStorage } from './demo-state.mjs';

const WORK = process.env.WORK;
const APP = process.env.APP_URL || 'http://localhost:8081';
const RACE_LAPS = Number(process.env.RACE_LAPS || 10);

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

/** Tap Start on the setup card, wait out the lights off camera, then answer `laps` questions. */
async function race(label, laps = 60) {   // 60: a safety cap, far above any session here
  await rec.tap(page.getByTestId('button-start-race'));
  rec.recording = false;
  for (let i = 0; i < 400 && !(await answerEl.count()); i++) await step(1000 / FPS);
  rec.recording = true;
  rec.mark(`${label}-racing`);
  for (let lap = 1; lap <= laps; lap++) {
    if (!(await answerEl.count())) break;
    const q = (await questionEl.innerText()).trim().replace(/\s+/g, ' ');
    const m = q.match(/^(\d+) ([+\-−×x÷/]) (\d+)$/);
    if (!m) { console.log(label, 'unparsed question', JSON.stringify(q)); break; }
    const ans = String(OPS[m[2]](Number(m[1]), Number(m[3])));
    rec.mark('question', { session: label, lap, q, ans });
    await step(between(380, 620));
    for (const [i, d] of [...ans].entries()) {
      if (i) await step(between(110, 170));
      await rec.tap(page.getByTestId(`keypad-${d}`), { hold: 70 });
    }
    await step(between(120, 190));
    await rec.tap(page.getByTestId('keypad-submit'), { hold: 70 });
    rec.mark('answered', { session: label, lap, q, ans });
    for (let w = 0; w < 120; w++) {
      await step(1000 / FPS);
      if (!(await answerEl.count())) break;
      if ((await answerEl.innerText()).trim() === '0') break;
    }
    console.log(`${label} lap ${lap}: ${q} = ${ans}  (frame ${rec.frame})`);
  }
  rec.mark(`${label}-end`);
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
rec.recording = true;
rec.mark('qualifying-menu');
await race('qualifying');
await continueTo(/Continue to Race/i);
rec.recording = true;
rec.mark('race-menu');
await race('race', RACE_LAPS);
rec.save();
console.log('frames:', rec.frame);
await browser.close();
