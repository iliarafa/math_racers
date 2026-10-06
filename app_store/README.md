# App Store screenshots

Captioned cards built from real simulator screenshots.

| Folder | Canvas | Device captured |
|---|---|---|
| `iphone_6.9/` | 1242 × 2688 | iPhone 17 Pro Max simulator, iOS 26.5 (captured at 1320 × 2868, rendered to the 6.5" canvas) |
| `ipad_13/` | 2064 × 2752 portrait; `01_race.png` and `02_race_day.png` are 2752 × 2064 landscape (Race Weekend runs landscape on iPad) | iPad Pro 13-inch (M5) simulator, iOS 26.5 |

Both sizes are ones App Store Connect accepts for the 6.9" iPhone and 13" iPad
slots. Upload the files in numeric order — the first three are the ones most
people see on the product page.

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
were last captured on Round 16 / Malaysia. `02` shows Race Day's lap count
(`/56`, Malaysia) but no circuit name. `06` shows the Reaction Test target
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
- **iPad landscape (`01`, `02`)**: rotate the iPad from the Claude simulator panel.
  Simulator.app isn't installed here, and on iPadOS 26 an app's own orientation
  lock turns into a floating window instead of a rotation. Panel taps stay in
  portrait coordinates after rotating: `x = landscapeY`, `y = 1376 − landscapeX`
  (points), for the rotation used on 2026-09-21 and 2026-09-28. `simctl io
  screenshot` still returns the frame upright at 2752 × 2064. Grand Prix practice
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
- **App opens in a window** on the iPad (window controls top-left, wallpaper
  around it): tap the controls, then the green button, and it stays full screen.
