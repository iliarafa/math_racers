# Instagram Reel

Two 36-second 9:16 ads (1080 × 1920, 30 fps, H.264 + AAC, −14 LUFS) built from real
footage of the app. They are identical until the end card:

- `math-racer-reel.mp4`: website end card (`mathracer2026.io`), app shown in a phone frame.
- `math-racer-reel-app-store.mp4`: Apple's "Download on the App Store" badge, app shown as a
  plain screen card.

`cover.jpg` / `cover-app-store.jpg` are the end cards, for the Reel cover.

| Time | Picture | Caption |
|---|---|---|
| 0–3 s | Five start lights, one every half second, with the app's own 800 Hz beeps | HERE COME THE LIGHTS! |
| 3 s | Lights out: 1200 Hz beep, the Lane Racer track drops in, the phone arrives on the Paddock | |
| 3–4.2 s | The Paddock, its background video playing, and the camera pushes in on the Weekend Briefing tile (Round 16, Malaysia), faster and faster | AND ON THEY GO! |
| 4.2–6.5 s | In 3D the tile lifts off the screen as a glowing slab and the camera carries on down, the Paddock wheeling round beneath it and sinking out of focus; it lands on the tile's top edge at the navy end and skates along it, the gradient streaming past (the flag, MALAYSIA and WEEKEND BRIEFING rushing by, streaks of shine flashing under), then tips over into the white end, and the white washes over everything | AND ON THEY GO! |
| 6.5–9.5 s | Free Practice comes out of the white close on its question, pulls back to the phone, then pushes in again: 100-lap session at Formula 2 (addition), laps 75–76, cut as 41 turns green; the sector grid a human mix of purple, green and yellow | MASTER THE TRACK IN FREE PRACTICE |
| 9.5–10.5 s | The Grand Prix weekend card (Round 16, Malaysia) arrives and the camera pushes in on its circuit map | FOLLOW THE LIVE SEASON |
| 10.5–14 s | The map lifts off the card as a 3D floating highway (the card stays below, the flat map printed on it) and the camera swings round to look down the track, dives onto the back straight, rounds the final hairpin and crosses the line under a chequered gantry | FOLLOW THE LIVE SEASON |
| 14–17 s | Grand Prix Practice, late in the session (times tables at Formula 1 level): a green sector lands on a grid of purple, green and yellow | PRACTICE (green) |
| 17–20 s | Qualifying against the bot: another green sector on a mixed grid | QUALIFY (amber) |
| 20–23 s | Race Day: a green full-screen sector flash, then a purple one | RACE (red) |
| 23 s | Chequered-flag wipe | |
| 23–28 s | Lane Racer late in a race, at Formula 1 level: MAX SPEED (340 km/h) as the flag clears, then four right answers in five seconds | TRAIN ON THE LANE RACER |
| 28–31 s | Trophy cabinet: streak and season trophies | WIN TROPHIES. KEEP THE STREAK. |
| 31–36 s | Logo, hero car, then the website or the App Store badge | MATHS PRACTICE THAT FEELS LIKE RACE DAY |

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
| `browser.mjs` | iPhone-sized page (393 × 852, 3×, Dynamic Island safe areas), Google Fonts served from a curl cache, the app's background videos as seekable WebM, a fake clock, and a frame recorder that re-seeks CSS, Web Animations and videos to that clock, so footage plays at true game speed however slow each screenshot is |
| `demo-state.mjs` | The demo player: a name (no name prompt at the flag) and, for the menus, seven weekend trophies (rounds 9–15) and a 12-day streak |
| `capture-paddock.mjs` | Films the Paddock (sound on), each frame again with the Weekend Briefing tile hidden, and the tile's parts (plate, flag, WEEKEND BRIEFING, the round's name) on transparent backgrounds at 8× |
| `capture-freepractice.mjs` | Plays a 100-lap Free Practice (addition, locked at Formula 2), pacing each answer against the question's bot time for a human mix of sector colours; records laps 75–81 |
| `capture-weekend.mjs` | Races a Grand Prix weekend on times tables in order, pacing each answer like a person's (against the question's bot time in Practice, against the bot's lap in Qualifying and the Race), recording the menu, Practice, Qualifying and Race Day |
| `capture-lane.mjs` | Plays a Lane Racer race with the chase cam, steering from the game's own controller: the first 20 answers off camera, then 18 s of the race at top speed, with the iPhone app's follow cam (the browser build keeps the camera centred) |
| `snap-screens.mjs` | Stills of the menu screens |
| `stage.html` | The reel itself: `render(t)` draws frame *t* on a canvas; `cues()` lists sound cues; `?variant=web\|appstore` picks the end card. `TILE` / `TILE3D` set the push-in on the Paddock's tile and its 3D timing, `FP_IN` where Free Practice comes out of the white, `CIRCUIT` this round's circuit for the track section |
| `scene3d.mjs` | What both 3D sections share: the WebGL view, a filmed screen frame as the ground, and the camera that sees exactly what the stage showed at the cut |
| `tile3d.mjs` | The Weekend Briefing tile in 3D, ridden like a skate ramp: its filmed parts laid over the filmed Paddock (so the cut to 3D is invisible), then the plate rising as a slab while the camera, carrying on at the push-in's speed, swoops onto its top edge, skates it from the navy end and drops in at the white end. `RIDE` sets the line, `SHINE` the streaks of light on the face; it also gives the stage its zoom blur and where that streams from |
| `track3d.mjs` | The 3D circuit: snaps the centreline onto the setup map's sector stripes (lifting one pass over the other where the lap runs back alongside itself), builds the three.js roads over a ground textured with the filmed card (aligned so the cut to 3D is invisible), and flies the camera: lift, orbit, dive, then a race to the line that eases off in tight corners |
| `trace-centreline.py` | Traces a centreline from a setup map when the app has none (`python3 trace-centreline.py malaysia` → `tracks/malaysia.json`), following the sector stripe and failing if any of it is missed |
| `render.mjs` | Drives the stage in headless Chromium with SwiftShader WebGL: `cues`, `stills <t…>` for review, `video` (`RANGE=from:to` for a slice), `cover` (`VARIANT=appstore` for the App Store version) |
| `make-audio.py` | Music from lights-out plus effects: the app's beeps, keypad clicks and correct chime, engine revs, whooshes, the 3D sections' risers and the track's engine wind-up; loudness-normalised |

Each weekend update changes the round: re-run the captures (the Paddock's tile follows the round by
itself), then point `CIRCUIT` in `stage.html` at the new circuit. Its `path` is the app's centreline if `circuitPathData.json` has one, else trace one;
re-fit `map` if the card or map image changed; pick `race` and `orbit` for the new layout.

To change copy or timing, edit `CAPTIONS` / `T` in `stage.html`, check frames with
`WORK=… node render.mjs stills 3 5.5 8.6`, then `node render.mjs cues && python3 make-audio.py && node render.mjs video`.
