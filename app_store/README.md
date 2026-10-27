# App Store screenshots

Captioned cards built from real simulator screenshots.

| Folder | Canvas | Device captured |
|---|---|---|
| `iphone_6.9/` | 1242 × 2688 | iPhone 17 Pro Max simulator, iOS 26.5 (captured at 1320 × 2868, rendered to the 6.5" canvas) |
| `iphone_6.3/` | 1206 × 2622 | The `iphone_6.9/` cards scaled to 2622 tall and trimmed 3 px from each side (plain background) |
| `ipad_13/` | 2064 × 2752 portrait; `01_race.png` and `02_race_day.png` are 2752 × 2064 landscape (Race Weekend runs landscape on iPad) | iPad Pro 13-inch (M5) simulator, iOS 26.5 |

These are sizes App Store Connect accepts for the 6.9" iPhone slot, the 6.1" / 6.3"
iPhone slot (which takes 1206 × 2622 or 1179 × 2556) and the 13" iPad slot. Upload
the files in numeric order — the first three are the ones most people see on the
product page.

## Cards

| File | Title | Subtitle |
|---|---|---|
| `01_race` | Answer fast. Gain sectors. | Adaptive questions that scale from Karting to F1 |
| `02_race_day` | Full Purple! | Be the fastest on track |
| `03_lane_racer` | Race the instructor, lane by lane | A 3D chase-cam sprint where the right lane is the right answer |
| `04_grand_prix` | Practice. Qualify. Race. | A full Grand Prix weekend on one circuit |
| `05_paddock` | A new Grand Prix every week | The paddock follows the real 2026 season calendar |
| `06_driving_school` | Earn your Superlicence | Flashcards, reaction lights and lane racing |
| `07_strategy` | The whole reference, in your garage | Times tables and number facts whenever you need them |
| `08_superlicence` | Superlicence granted. | Finish Driving School and it joins your trophy cabinet |

`04`, `05` and the iPad `01` (its header chip) show the current Grand Prix. They
were last captured on Round 19 / Mexico City. `02` shows Race Day's lap count
(`/56`, from Round 16 / Malaysia) but no circuit name. `06` shows the Reaction Test target
(`REACTION_LICENCE_MS`, 0.40s), so retake it if that changes.

## Regenerating

1. Capture a screen: boot the simulator and set a clean status bar in **two**
   calls; combined with the other flags, `--time` shows the wrong weekday on iPad:
   `xcrun simctl status_bar <udid> override --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`,
   then `xcrun simctl status_bar <udid> override --time "2020-09-09T13:41:00.000Z"`
   (iPhone shows 9:41; iPad shows "9:41 AM Wed Sep 9" like the rest of the set —
   the fractional seconds are required). Then
   `xcrun simctl io <udid> screenshot --mask=black shot.png` (`--mask=black`
   draws the iPhone's Dynamic Island).
2. Build the compositor once: `swiftc -O tools/MakeCard.swift -o makecard`.
3. Make a card:
   `./makecard <canvasW> <canvasH> shot.png "Title" "Subtitle" <cornerRatio> out.png`
   Corner ratio is 0.115 for iPhone and 0.045 for iPad.
4. Remake the 6.3" set from the 6.9" one whenever an iPhone card changes:
   `sips --resampleHeight 2622 iphone_6.9/<card>.png --out /tmp/<card>.png &&
   sips --cropToHeightWidth 2622 1206 /tmp/<card>.png --out iphone_6.3/<card>.png`
   (the crop is centred).

Captions use Oxanium, the same font as the app.

### Tricky screens

- **Superlicence splash (`08`)** only shows for a player who has just graduated.
  Terminate the app, then insert into the WebKit localStorage database under the
  app's data container (`xcrun simctl get_app_container <udid> live.mathracer.app data`,
  then `Library/WebKit/**/LocalStorage/localstorage.sqlite3`, table `ItemTable`,
  values are UTF-16LE blobs): `drivingSchoolHighestCleared` = `10`,
  `reactionBestMs` = `350`, `laneRacerP1Win` = `1`, `superlicenceCelebrated` = `0`.
  Relaunch, take a burst of screenshots, and pick a frame just after the confetti
  peaks so the text is clear.
- **iPad landscape (`01`, `02`)**: rotate the iPad with the simulator `control` tool's
  `rotate` action (`direction: left`; it worked on 2026-10-27), or from the Claude simulator panel.
  Simulator.app isn't installed here, and on iPadOS 26 an app's own orientation
  lock turns into a floating window instead of a rotation. Panel taps stay in
  portrait coordinates after rotating: `x = landscapeY`, `y = 1376 − landscapeX`
  (points), for the rotation used on 2026-09-21 and 2026-09-28. On 2026-10-20
  portrait taps did nothing and upright landscape points (1376 × 1032, read off
  the `simctl io screenshot` at half its pixels) worked instead, so test one tap
  first (upright landscape points worked again on 2026-10-27 after `rotate`). `simctl io screenshot` still returns the frame upright at 2752 × 2064. Grand Prix practice
  has no pause button, so leave the session by tapping the header logo: it goes
  to the title screen without finishing.
- **Paddock and setup cards (`04`, `05`)**: the backgrounds are looping videos.
  Take a burst of screenshots about a second apart and pick a frame close to the
  previous card's. Before capturing, open Trophies once if the Garage card shows
  an "N NEW" badge, and switch sound on so the speaker icon isn't crossed out.
- **Race Day purple flash (`02`)** needs a capture-only build, never committed.
  Race Day unlocks only after Practice and Qualifying are finished in the same
  visit (in-memory state), and a sector is purple only when it beats the bot's
  time (2.8–5.2 s at Karting), which simulator taps can't do. So, temporarily:
  make `grandPrixDevBypass()` in `lib/drivingSchoolLicence.ts` return `true`
  (opens the Race tab); in `pages/Game.tsx` multiply the bot's `lapTime` by 10
  (the bot never reaches your sector first, so every answer is purple) and raise
  the 600 ms delay before the next question after a correct answer to 4000 ms
  (holds the flash long enough to screenshot). Build, install, then revert both
  files with `git checkout --` and rebuild. Answer straight after lights out to
  keep the clock low, and pause about 0.3 s before tapping ✓, since a tap right
  after a digit is sometimes dropped (Enter on the simulator keyboard doesn't
  submit). Leave with RETIRE → Yes: a DNF that submits nothing.
- **Race cards (`01`, iPhone and iPad)** also need a capture-only build, or their sectors all come
  out yellow. Practice colours a sector against the question's bot time (purple under
  half of it, green under it, yellow over), about 2–3 s at Karting, and each answer
  through the simulator panel takes longer than that. So, temporarily, multiply
  `question.botTime` in Game.tsx's practice colouring by 12, build, install, then
  revert with `git checkout --`, rebuild and re-sync. Answering at a steady pace then
  gives a mix of green and purple; wait about 45 s on one question for a yellow. On
  2026-10-27 answering within about 10 s gave purple, pausing about 7 s before ✓ gave
  green, and a 26 s first answer gave yellow. The 2026-10-27 iPad card stops at Lap 8/30
  (yellow, purple, green, purple, purple, green, purple) with AERO lit; the iPhone `01` card, retaken the same way, at Lap 7/30 with its next answer typed.
- **App opens in a window** on the iPad (window controls top-left, wallpaper
  around it): tap the controls, then the green button, and it stays full screen.
