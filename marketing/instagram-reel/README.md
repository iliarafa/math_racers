# Instagram Reel

Two 31.5-second 9:16 ads (1080 × 1920, 30 fps, H.264 + AAC, −14 LUFS) built from real
footage of the app. They are identical until the end card:

- `math-racer-reel.mp4`: website end card (`mathracer2026.io`), app shown in a phone frame.
- `math-racer-reel-app-store.mp4`: Apple's "Download on the App Store" badge, app shown as a
  plain screen card.

`cover.jpg` / `cover-app-store.jpg` are the end cards, for the Reel cover.

| Time | Picture | Caption |
|---|---|---|
| 0–3 s | Five start lights, one every half second, with the app's own 800 Hz beeps | HERE COME THE LIGHTS! |
| 3 s | Lights out: 1200 Hz beep, the Lane Racer track drops in, the phone arrives | |
| 3–6 s | Free Practice, 100-lap session at Formula 2 (addition): laps 75–76, cut as 41 turns green; the sector grid a human mix of purple, green and yellow | IMMERSE YOURSELF IN FREE PRACTICE |
| 6–9.5 s | The Grand Prix weekend card arrives and the camera pushes in on Round 15, Baku and its circuit map | FOLLOW THE LIVE SEASON |
| 9.5–12.5 s | Grand Prix Practice, late in the session (times tables at Formula 1 level): a green sector lands on a grid of purple, green and yellow | PRACTICE (green) |
| 12.5–15.5 s | Qualifying against the bot: another green sector on a mixed grid | QUALIFY (amber) |
| 15.5–18.5 s | Race Day: a green full-screen sector flash, then a purple one | RACE (red) |
| 18.5 s | Chequered-flag wipe | |
| 19.5–25.5 s | Lane Racer chase cam, driving through two right answers | TRAIN ON THE LANE RACER |
| 23.5–26.5 s | Trophy cabinet: streak and season trophies | WIN TROPHIES. KEEP THE STREAK. |
| 26.5–31.5 s | Logo, hero car, then the website or the App Store badge | MATHS PRACTICE THAT FEELS LIKE RACE DAY |

Every session is played at a person's pace, so the sector grids and Race Day's flashes show a
mix of purple, green and yellow rather than a wall of purple. Every caption stays up for at
least 3 seconds so it can be read over the footage, and every cut lands on the music's beat
grid (120 BPM, lights out on the first downbeat). Text stays inside Meta's Reels ad safe zone
(y 250–1250 of 1920, 65 px side margins).

The App Store version follows Apple's marketing guidelines for the badge
(developer.apple.com/app-store/marketing/guidelines): the black badge as supplied
(`assets/download-on-the-app-store.svg`, from developer.apple.com), one per video, cut in
rather than animated, nothing inside its clear space, iPhone and iPad named in a referential
phrase, and Apple's credit line at the end. Apple asks for its own product bezels when an app
is shown on a device; those downloads were unreachable when this was made, so that version
shows the screen without a device frame.

## Rebuilding

With the dev server running (`npm run dev`), run `./build.sh`. It needs Playwright with Chromium
(`npm i -D playwright`, or set `PLAYWRIGHT_MODULE`), an ffmpeg with libx264 and libvpx-vp9
(`FFMPEG=/path/to/ffmpeg`), and Python 3 with numpy and scipy. Intermediate files go to
`.work/` (or `$WORK`).

| File | Job |
|---|---|
| `browser.mjs` | iPhone-sized page (393 × 852, 3×, Dynamic Island safe areas), Google Fonts served from a curl cache, a fake clock, and a frame recorder that re-seeks CSS and Web Animations to that clock, so footage plays at true game speed however slow each screenshot is |
| `demo-state.mjs` | The demo player: a name (no name prompt at the flag) and, for the menus, six weekend trophies and a 12-day streak |
| `capture-freepractice.mjs` | Plays a 100-lap Free Practice (addition, locked at Formula 2), pacing each answer against the question's bot time for a human mix of sector colours; records laps 75–81 |
| `capture-weekend.mjs` | Races a Grand Prix weekend on times tables in order, pacing each answer like a person's (against the question's bot time in Practice, against the bot's lap in Qualifying and the Race), recording the menu, Practice, Qualifying and Race Day |
| `capture-lane.mjs` | Plays Lane Racer with the chase cam, steering from the game's own controller |
| `snap-screens.mjs` | Stills of the menu screens |
| `stage.html` | The reel itself: `render(t)` draws frame *t* on a canvas; `cues()` lists sound cues; `?variant=web\|appstore` picks the end card |
| `render.mjs` | Drives the stage: `cues`, `stills <t…>` for review, `video`, `cover` (`VARIANT=appstore` for the App Store version) |
| `make-audio.py` | Music from lights-out plus effects: the app's beeps, keypad clicks and correct chime, engine revs, whooshes; loudness-normalised |

To change copy or timing, edit `CAPTIONS` / `T` in `stage.html`, check frames with
`WORK=… node render.mjs stills 3 5.5 8.6`, then `node render.mjs cues && python3 make-audio.py && node render.mjs video`.
