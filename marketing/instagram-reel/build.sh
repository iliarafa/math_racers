#!/usr/bin/env bash
# Rebuilds both reels end to end: math-racer-reel.mp4 (website end card) and
# math-racer-reel-app-store.mp4 (App Store badge), each with a cover image.
# Needs the dev server on :8081 (`npm run dev`), Playwright with Chromium, an ffmpeg with
# libx264 + libvpx-vp9 (set FFMPEG if it isn't on PATH), and Python 3 with numpy + scipy.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
export WORK="${WORK:-$HERE/.work}"
export FFMPEG="${FFMPEG:-ffmpeg}"
mkdir -p "$WORK/webm" "$WORK/fonts"

# Oxanium (SIL Open Font License), the app's own font, for the captions.
[ -f "$WORK/fonts/oxanium-latin.woff2" ] || curl -sSL -o "$WORK/fonts/oxanium-latin.woff2" \
  "https://fonts.gstatic.com/s/oxanium/v21/RrQQboN_4yJ0JmiMe2LE0Q.woff2"

# Open-source Chromium can't decode the app's H.264 background videos; serve VP9 copies.
for f in "$REPO"/attached_assets/*.mp4; do
  out="$WORK/webm/$(basename "$f" .mp4).webm"
  [ -f "$out" ] || "$FFMPEG" -hide_banner -loglevel error -y -i "$f" -map 0:v:0 \
    -c:v libvpx-vp9 -crf 34 -b:v 0 -deadline realtime -cpu-used 8 -row-mt 1 -an "$out"
done

cd "$HERE"
node capture-paddock.mjs       # the Paddock, and the Weekend Briefing tile's parts
node capture-freepractice.mjs  # Free Practice: addition at Formula 2
node capture-weekend.mjs       # Grand Prix weekend: menu, Practice, Qualifying, Race Day
node capture-lane.mjs          # Lane Racer, chase cam
node snap-screens.mjs trophies
node render.mjs cues
python3 make-audio.py
for v in web appstore; do
  VARIANT=$v OUT=reel-$v.mp4 node render.mjs video
  VARIANT=$v node render.mjs cover && mv "$WORK/out/cover.jpg" "$WORK/out/cover-$v.jpg"
done
cp "$WORK/out/reel-web.mp4" "$HERE/math-racer-reel.mp4"
cp "$WORK/out/cover-web.jpg" "$HERE/cover.jpg"
cp "$WORK/out/reel-appstore.mp4" "$HERE/math-racer-reel-app-store.mp4"
cp "$WORK/out/cover-appstore.jpg" "$HERE/cover-app-store.jpg"
echo "done: $HERE/math-racer-reel.mp4, $HERE/math-racer-reel-app-store.mp4"
