// Drives stage.html in headless Chromium.
//   node render.mjs cues                 -> $WORK/cues.json (sound cue list)
//   node render.mjs stills 0 2.5 8.4 ... -> $WORK/review/t<sec>.png (single frames, by time)
//   node render.mjs video                -> $WORK/out/reel.mp4 (frames piped into ffmpeg, muxed
//                                           with $WORK/soundtrack.wav when it exists)
//   node render.mjs cover [t]            -> $WORK/out/cover.jpg (the end card, for the Reel cover)
import { chromium } from './browser.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const WORK = process.env.WORK;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const [mode = 'video', ...rest] = process.argv.slice(2);

const TYPES = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2' };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.route('http://reel.local/**', async route => {
  const p = decodeURIComponent(new URL(route.request().url()).pathname);
  const file = p === '/stage.html' ? path.join(HERE, 'stage.html')
    : p.startsWith('/work/') ? path.join(WORK, p.slice(6))
    : p.startsWith('/repo/') ? path.join(REPO, p.slice(6)) : null;
  if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
  await route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' } });
});
await page.goto('http://reel.local/stage.html');
const { duration, fps } = await page.evaluate(() => window.ready);
const frames = Math.round(duration * fps);

async function frameAt(t) {
  await page.evaluate(t => window.render(t), t);
  return page.screenshot({ type: 'png' });
}

if (mode === 'cues') {
  const cues = await page.evaluate(() => window.cues());
  fs.writeFileSync(path.join(WORK, 'cues.json'), JSON.stringify({ duration, cues }, null, 1));
  console.log(`${cues.length} cues, ${duration}s`);
} else if (mode === 'cover') {
  fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });
  await page.evaluate(t => window.render(t), Number(rest[0] ?? 17.0));
  await page.screenshot({ path: path.join(WORK, 'out', 'cover.jpg'), type: 'jpeg', quality: 92 });
  console.log('cover written');
} else if (mode === 'stills') {
  fs.mkdirSync(path.join(WORK, 'review'), { recursive: true });
  for (const s of rest) {
    const t = Number(s);
    fs.writeFileSync(path.join(WORK, 'review', `t${t.toFixed(2)}.png`), await frameAt(t));
  }
  console.log('stills:', rest.join(' '));
} else {
  fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });
  const out = path.join(WORK, 'out', process.env.OUT || 'reel.mp4');
  const audio = path.join(WORK, 'soundtrack.wav');
  const hasAudio = fs.existsSync(audio) && !process.env.NO_AUDIO;
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF || '17', '-maxrate', '14M', '-bufsize', '28M',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-r', String(fps),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest'] : []),
    '-movflags', '+faststart', out];
  const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = await frameAt(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  console.log('wrote', out, hasAudio ? '(with audio)' : '(silent)');
}
await browser.close();
