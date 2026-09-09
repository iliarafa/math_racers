# App Store screenshots

Captioned cards built from real simulator screenshots.

| Folder | Canvas | Device captured |
|---|---|---|
| `iphone_6.9/` | 1242 × 2688 | iPhone 17 Pro Max simulator (captured at 1320 × 2868, rendered to the 6.5" canvas) |
| `ipad_13/` | 2064 × 2752 portrait; `01_race.png` is 2752 × 2064 landscape, since Race Weekend runs landscape on iPad | iPad Pro 13-inch (M5) simulator |

Both sizes are ones App Store Connect accepts for the 6.9" iPhone and 13" iPad
slots. Upload the files in numeric order — the first three are the ones most
people see on the product page.

## Regenerating

1. Capture a screen: boot the simulator, set a clean status bar with
   `xcrun simctl status_bar <udid> override --time "9:41" --batteryState charged
   --batteryLevel 100 --cellularBars 4 --wifiBars 3`, then
   `xcrun simctl io <udid> screenshot shot.png`.
2. Build the compositor once: `swiftc -O tools/MakeCard.swift -o makecard`.
3. Make a card:
   `./makecard <canvasW> <canvasH> shot.png "Title" "Subtitle" <cornerRatio> out.png`
   Corner ratio is 0.115 for iPhone and 0.045 for iPad.

Captions use Oxanium, the same font as the app.
