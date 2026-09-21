# App Store screenshots

Captioned cards built from real simulator screenshots.

| Folder | Canvas | Device captured |
|---|---|---|
| `iphone_6.9/` | 1242 × 2688 | iPhone 17 Pro Max simulator, iOS 26.5 (captured at 1320 × 2868, rendered to the 6.5" canvas) |
| `ipad_13/` | 2064 × 2752 portrait; `01_race.png` is 2752 × 2064 landscape (Race Weekend runs landscape on iPad) | iPad Pro 13-inch (M5) simulator, iOS 26.5 |

Both sizes are ones App Store Connect accepts for the 6.9" iPhone and 13" iPad
slots. Upload the files in numeric order — the first three are the ones most
people see on the product page.

## Cards

| File | Title | Subtitle |
|---|---|---|
| `01_race` | Answer fast. Gain sectors. | Adaptive questions that scale from Karting to F1 |
| `02_lane_racer` | Race the instructor, lane by lane | A 3D chase-cam sprint where the right lane is the right answer |
| `03_grand_prix` | Practice. Qualify. Race. | A full Grand Prix weekend on one circuit |
| `04_paddock` | A new Grand Prix every week | The paddock follows the real 2026 season calendar |
| `05_driving_school` | Earn your Superlicence | Flashcards, reaction lights and lane racing |
| `06_strategy` | The whole reference, in your garage | Times tables and number facts whenever you need them |
| `07_superlicence` | Superlicence granted. | Finish Driving School and it joins your trophy cabinet |

`03`, `04` and the iPad `01` (its header chip) show the current Grand Prix. They
were last captured on Round 15 / Baku. `05` shows the Reaction Test target
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

- **Superlicence splash (`07`)** only shows for a player who has just graduated.
  Terminate the app, then insert into the WebKit localStorage database under the
  app's data container (`xcrun simctl get_app_container <udid> live.mathracer.app data`,
  then `Library/WebKit/**/LocalStorage/localstorage.sqlite3`, table `ItemTable`,
  values are UTF-16LE blobs): `drivingSchoolHighestCleared` = `10`,
  `reactionBestMs` = `350`, `laneRacerP1Win` = `1`, `superlicenceCelebrated` = `0`.
  Relaunch, take a burst of screenshots, and pick a frame just after the confetti
  peaks so the text is clear.
- **iPad landscape (`01`)**: rotate the iPad from the Claude simulator panel.
  Simulator.app isn't installed here, and on iPadOS 26 an app's own orientation
  lock turns into a floating window instead of a rotation. Panel taps stay in
  portrait coordinates after rotating: `x = landscapeY`, `y = 1376 − landscapeX`
  (points), for the rotation used on 2026-09-21.
- **App opens in a window** on the iPad (window controls top-left, wallpaper
  around it): tap the controls, then the green button, and it stays full screen.
