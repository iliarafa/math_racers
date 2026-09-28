"""Trace a circuit's centreline from its setup-card map, for circuits the app has no path data
for (client/src/lib/circuitPathData.json).

The map (client/src/assets/<circuit>_setup_track.png) draws the circuit as a black ribbon with a
thin coloured sector stripe down its middle. This follows the stripe: small steps, each steering
toward the stripe's centre ahead, coasting straight through the one gap in it (the chequered
start/finish and its arrow). The stripe, not the ribbon, because where two parts of the lap run
close together their ribbons merge while their stripes stay apart. A coverage check then
requires every stripe pixel to lie on the traced line, so a shortcut fails loudly.

Output: marketing/instagram-reel/tracks/<circuit>.json in the app's path units (the map scaled
to 700 wide), in the same form as circuitPathData.json entries.

Usage: python3 trace-centreline.py malaysia
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

PATH_W = 700             # the app's path units: the map scaled to 700 wide
STEP = 3.0               # PNG px per step
TURN = math.radians(40)  # steering range per step
COAST = 20               # steps allowed across the start/finish gap in the stripe

circuit = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", ".."))
img = np.asarray(Image.open(os.path.join(repo, "client", "src", "assets", f"{circuit}_setup_track.png")).convert("RGBA"))
rgb = img[..., :3].astype(int)
stripe = (img[..., 3] > 128) & ((rgb.max(-1) - rgb.min(-1)) > 90)
field = ndimage.gaussian_filter(stripe.astype(float), 1.5)    # peaks along the stripe's centre
H, W = stripe.shape


def at(x, y):
    """Bilinear sample of the stripe field."""
    x0, y0 = int(math.floor(x)), int(math.floor(y))
    if not (0 <= x0 < W - 1 and 0 <= y0 < H - 1):
        return 0.0
    fx, fy = x - x0, y - y0
    f = field[y0:y0 + 2, x0:x0 + 2]
    return (f[0, 0] * (1 - fx) + f[0, 1] * fx) * (1 - fy) + (f[1, 0] * (1 - fx) + f[1, 1] * fx) * fy


# start on the topmost stripe pixel (a lone stretch of track), heading along the stripe
ys, xs = np.nonzero(stripe)
i0 = np.argmin(ys)
x, y = float(xs[i0]), float(ys[i0] + 2)
heading = max((math.radians(a) for a in range(0, 360, 5)),
              key=lambda h: at(x + 2 * STEP * math.cos(h), y + 2 * STEP * math.sin(h)))
start = (x, y)
pts, coasting = [start], 0
for i in range(20000):
    cands = [heading + TURN * k / 20 for k in range(-20, 21)]
    best = max(cands, key=lambda h: at(x + STEP * math.cos(h), y + STEP * math.sin(h)))
    if at(x + STEP * math.cos(best), y + STEP * math.sin(best)) > 0.3:
        heading, coasting = best, 0
    else:
        # no stripe ahead (the start/finish gap): coast on the direction of the last few steps,
        # which the stripe's blurred end can't bend
        if coasting == 0 and len(pts) > 8:
            heading = math.atan2(pts[-1][1] - pts[-8][1], pts[-1][0] - pts[-8][0])
        coasting += 1
        if coasting > COAST:
            sys.exit(f"lost the stripe at step {i} ({x:.0f}, {y:.0f})")
    x += STEP * math.cos(heading)
    y += STEP * math.sin(heading)
    if i > 50 and math.hypot(x - start[0], y - start[1]) < STEP * 1.5:
        break
    pts.append((x, y))
else:
    sys.exit("the trace never closed the loop")

# every stripe pixel must lie on the traced line
gap, _ = cKDTree(np.array(pts)).query(np.stack([xs, ys], 1))
if gap.max() > 6:
    sys.exit(f"the trace misses part of the map (a stripe pixel {gap.max():.0f} px from the line)")

s = W / PATH_W
path = [(px / s, py / s) for px, py in pts]
d = "M " + " L ".join(f"{px:.2f} {py:.2f}" for px, py in path)
out = {"w": PATH_W, "h": round(H / s), "points": len(path), "d": d, "source": f"{circuit}_setup_track.png"}
os.makedirs(os.path.join(here, "tracks"), exist_ok=True)
with open(os.path.join(here, "tracks", f"{circuit}.json"), "w") as f:
    json.dump(out, f)
perimeter = sum(math.dist(path[k], path[(k + 1) % len(path)]) for k in range(len(path)))
print(f"{circuit}: {len(path)} points, perimeter {perimeter:.0f} path units; every stripe pixel within {gap.max():.1f} px of the line")
