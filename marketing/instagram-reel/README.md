# Instagram Reel

`math-racer-reel.mp4`: an 18-second 9:16 ad (1080 × 1920, 30 fps, H.264 + AAC, −14 LUFS),
built from real footage of the app. `cover.jpg` is the end card, for the Reel cover.

| Time | Picture | Caption |
|---|---|---|
| 0–2 s | Five start lights, one by one, with the app's own 800 Hz beeps | YOUR KID LOVES RACING? |
| 2 s | Lights out: 1200 Hz beep, the Lane Racer track drops in, the phone arrives | |
| 2–4.5 s | Quick Race, laps 1–2, taps shown on the keypad | EVERY RIGHT ANSWER IS A LAP |
| 4.5–6 s | Fast-forward (motion blurred) on the sector rows | ANSWER FAST. GO PURPLE. |
| 6–8 s | The last two laps | LEAVE THE BOT BEHIND |
| 8–10 s | Chequered-flag wipe, the P1 result screen, confetti | BEAT THE BOT TO THE FLAG |
| 10–11.5 s | Lane Racer chase cam through the right answer | THE RIGHT LANE IS THE RIGHT ANSWER |
| 11.5–12.5 s | Grand Prix setup card (Round 15, Baku) | A NEW GRAND PRIX EVERY WEEK |
| 12.5–14 s | Trophy cabinet: streak and season trophies | WIN TROPHIES. KEEP THE STREAK. |
| 14–18 s | Logo, hero car, `mathracer2026.io` | MATHS PRACTICE THAT FEELS LIKE RACE DAY · PLAY FREE · AGES 6+ |

Every cut lands on the music's beat grid (120 BPM, lights out on the first downbeat). Text
stays inside Meta's Reels ad safe zone (y 250–1250 of 1920, 65 px side margins).

## Rebuilding

With the dev server running (`npm run dev`), run `./build.sh`. It needs Playwright with
Chromium (`npm i -D playwright`, or set `PLAYWRIGHT_MODULE`), an ffmpeg with libx264 and
libvpx-vp9 (`FFMPEG=/path/to/ffmpeg`), and Python 3 with numpy and scipy. Intermediate files go
to `.work/` (or `$WORK`).

| File | Job |
|---|---|
| `browser.mjs` | iPhone-sized page (393 × 852, 3×, Dynamic Island safe areas), Google Fonts served from a curl cache, a fake clock, and a frame recorder that re-seeks CSS and Web Animations to that clock, so footage plays at true game speed however slow each screenshot is |
| `demo-state.mjs` | The demo player: a name (no name prompt at the flag) and, for the menus, six weekend trophies and a 12-day streak |
| `capture-race.mjs` | Plays a seeded Quick Race by tapping the keypad; records frames and every tap |
| `capture-lane.mjs` | Plays Lane Racer with the chase cam, steering from the game's own controller |
| `snap-screens.mjs` | Stills of the menu screens |
| `stage.html` | The reel itself: `render(t)` draws frame *t* on a canvas; `cues()` lists sound cues |
| `render.mjs` | Drives the stage: `cues`, `stills <t…>` for review, `video`, `cover` |
| `make-audio.py` | Music from lights-out plus effects: the app's beeps, keypad clicks and correct chime, engine revs, whooshes, impact; loudness-normalised |

To change copy or timing, edit `CAPTIONS` / `T` in `stage.html`, check frames with
`WORK=… node render.mjs stills 3 5.5 8.6`, then `node render.mjs cues && python3 make-audio.py && node render.mjs video`.
