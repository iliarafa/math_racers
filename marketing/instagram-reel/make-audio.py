"""Soundtrack for the reel: the app's Lane Racer music from lights-out, plus sound effects
placed from $WORK/cues.json (written by `node render.mjs cues`).

The start-light beeps, keypad clicks and "correct" chime re-create the app's own WebAudio
sounds (Game.tsx: playBeep, playKeypadClick, playCorrectSound). Output: $WORK/soundtrack.wav,
loudness-normalised to -14 LUFS / -1.5 dBTP.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy import signal

SR = 48000
WORK = os.environ["WORK"]
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MUSIC = os.path.join(REPO, "attached_assets", "laneracer3.mp3")
rng = np.random.default_rng(2026)
cues = json.load(open(os.path.join(WORK, "cues.json")))
MUSIC_AT = cues["musicAt"]  # lights out: the track's first downbeat lands here
DUR = cues["duration"]
N = int(round(DUR * SR))
mix = np.zeros((N, 2), np.float64)


def tvec(d):
    return np.arange(int(round(d * SR))) / SR


def place(buf, t, gain=1.0, pan=0.0):
    """Add mono (equal-power panned) or stereo audio at time t."""
    if buf.ndim == 1:
        th = (pan + 1) * np.pi / 4
        buf = np.stack([buf * np.cos(th), buf * np.sin(th)], 1) * np.sqrt(2)
    i = int(round(t * SR))
    j0 = max(0, -i)
    i0 = max(0, i)
    n = min(len(buf) - j0, N - i0)
    if n > 0:
        mix[i0:i0 + n] += buf[j0:j0 + n] * gain


def env_exp(d, a0, a1, attack=0.003):
    t = tvec(d)
    e = a0 * (a1 / a0) ** (t / d)
    k = int(attack * SR)
    e[:k] *= np.linspace(0, 1, k)
    return e


def square(f, t):
    out = np.zeros_like(t)
    k = 1
    while k * f < 12000:
        out += np.sin(2 * np.pi * k * f * t) / k
        k += 2
    return out * 4 / np.pi


def sweep_phase(freq):
    return 2 * np.pi * np.cumsum(freq) / SR


def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def bandsweep(x, f0, f1, q=1.2, block=256):
    """Band-pass with a centre frequency that glides exponentially from f0 to f1."""
    out = np.zeros_like(x)
    zi = None
    nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        p = b / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** p
        bw = fc / q
        lo, hi = max(20, fc - bw / 2), min(SR / 2 - 100, fc + bw / 2)
        bb, aa = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
        if zi is None:
            zi = signal.lfilter_zi(bb, aa) * 0
        seg = x[b * block:(b + 1) * block]
        y, zi = signal.lfilter(bb, aa, seg, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


# ------------------------------------------------------------------ the app's sounds
def beep(f, d):  # playBeep: square wave, gain 0.3 -> 0.01 exponential over the duration
    t = tvec(d)
    return square(f, t) * env_exp(d, 0.3, 0.01)


def click():  # playKeypadClick: 600 Hz sine, 0.08 -> 0.01 over 40 ms (+ a tiny tap transient)
    d = 0.04
    t = tvec(d)
    x = np.sin(2 * np.pi * 600 * t) * env_exp(d, 0.08, 0.01)
    x[:96] += rng.standard_normal(96) * np.linspace(0.05, 0, 96)
    return x


def correct():  # playCorrectSound: C5 -> E5 -> G5 sine steps, 0.3 -> 0.01 over 0.3 s
    d = 0.3
    t = tvec(d)
    f = np.where(t < 0.1, 523.25, np.where(t < 0.2, 659.25, 783.99))
    ph = sweep_phase(f)
    return (np.sin(ph) + 0.18 * np.sin(2 * ph)) * env_exp(d, 0.3, 0.01)


# ------------------------------------------------------------------ sound design
def engine(freq, amp):
    """A V6-ish drone: detuned saws through soft clipping, low-passed."""
    ph = sweep_phase(freq)
    saw = lambda p: 2 * ((p / (2 * np.pi)) % 1.0) - 1
    x = saw(ph) + 0.7 * saw(ph * 1.004 + 1.3) + 0.5 * np.sin(ph * 0.5)
    x *= 1 + 0.35 * np.sin(ph * 3)  # firing pulses
    x = np.tanh(1.8 * x)
    x = lowpass(x, 900, 2)
    return x * amp


def idle_and_revs(lights, until):
    t = tvec(until)
    f = np.full_like(t, 38.0)
    for lt in lights:  # a blip of throttle as each light comes on
        k = t - lt
        blip = np.where(k > 0, np.exp(-k / 0.22) * (1 - np.exp(-k / 0.03)), 0)
        f += 44 * blip
    f += 10 * np.clip((t - 1.4) / 0.6, 0, 1) ** 2  # holding revs under the last light
    amp = 0.05 + 0.10 * np.clip(t / until, 0, 1)
    amp *= np.clip(t / 0.25, 0, 1)
    x = engine(f, amp)
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return x


def launch():
    d = 1.6
    t = tvec(d)
    f = 60 * (260 / 60) ** np.clip(t / 0.9, 0, 1)
    amp = np.exp(-t / 0.75) * (1 - np.exp(-t / 0.012)) * 0.55
    x = engine(f, amp)
    noise = lowpass(rng.standard_normal(len(t)), 700) * np.exp(-t / 0.35) * 0.5
    sub_f = 58 * (34 / 58) ** np.clip(t / 0.4, 0, 1)
    sub = np.sin(sweep_phase(sub_f)) * np.exp(-t / 0.28) * 0.8
    return x + noise + sub


def whoosh(d):
    t = tvec(d)
    x = bandsweep(rng.standard_normal(len(t)), 350, 3800, q=1.1)
    peak = 0.55
    e = np.where(t / d < peak, (t / d / peak) ** 2, ((1 - t / d) / (1 - peak)) ** 1.5)
    x = x * e
    return x / (np.abs(x).max() + 1e-9)


def riser(d):
    t = tvec(d)
    x = bandsweep(rng.standard_normal(len(t)), 250, 5000, q=1.6)
    x = x / (np.abs(x).max() + 1e-9) * (t / d) ** 2
    tone = np.sin(sweep_phase(220 * (880 / 220) ** (t / d))) * (t / d) ** 3 * 0.25
    return x * 0.7 + tone


def fast_forward(d):
    t = tvec(d)
    base = whoosh(d) * 0.5
    ticks = np.zeros_like(t)
    k = 0
    tt = 0.02
    while tt < d - 0.05:  # laps flying by: rising blips, densest mid-way
        p = tt / d
        f = 900 * (2200 / 900) ** p
        n = int(0.035 * SR)
        i = int(tt * SR)
        seg = np.sin(2 * np.pi * f * tvec(0.035)) * np.exp(-tvec(0.035) / 0.012)
        ticks[i:i + n] += seg[: len(ticks[i:i + n])] * (0.25 + 0.5 * np.sin(np.pi * p))
        tt += 0.11 - 0.06 * np.sin(np.pi * p)
        k += 1
    return base + ticks * 0.6


# ------------------------------------------------------------------ music
raw = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-i", MUSIC, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                     check=True, capture_output=True).stdout
music = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
need = N - int(MUSIC_AT * SR)
# The track is a 16-bar loop (it loops in the app), so repeat it if the reel outlasts it,
# with a 10 ms crossfade at the seam so the join can't click.
xf = int(0.01 * SR)
looped = music.copy()
while len(looped) < need:
    seam = looped[-xf:] * np.linspace(1, 0, xf)[:, None] + music[:xf] * np.linspace(0, 1, xf)[:, None]
    looped = np.concatenate([looped[:-xf], seam, music[xf:]])
m = looped[:need].copy()
tm = np.arange(len(m)) / SR + MUSIC_AT
fade_in = np.clip((tm - MUSIC_AT) / 0.008, 0, 1)
fade_out = np.clip((DUR - tm) / 1.1, 0, 1) ** 1.5
m *= (fade_in * fade_out)[:, None]
place(m, MUSIC_AT, gain=0.62)

# ------------------------------------------------------------------ effects from the cue list
lights = [c["t"] for c in cues["cues"] if c["kind"] == "beep" and c["f"] == 800]
place(idle_and_revs(lights, MUSIC_AT), 0.0, gain=0.9)
for c in cues["cues"]:
    k, t = c["kind"], c["t"]
    if k == "beep":
        place(beep(c["f"], c["d"]), t, gain=1.25)
    elif k == "launch":
        place(launch(), t, gain=0.85)
    elif k == "riser":
        place(riser(c["d"]), t, gain=0.22)
    elif k == "click":
        place(click(), t, gain=2.2)
    elif k == "correct":
        place(correct(), t, gain=1.25)
    elif k == "ff":
        place(fast_forward(c["d"]), t, gain=0.38)
    elif k == "whoosh":
        place(whoosh(c["d"]), t - c["d"] * 0.55, gain=0.33, pan=0.0)

peak = np.abs(mix).max()
print(f"raw peak {peak:.3f}", file=sys.stderr)
mix *= 0.9 / peak
raw_path = os.path.join(WORK, "soundtrack_raw.wav")
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
import wave

with wave.open(raw_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# Two-pass loudness normalisation. `linear=true` asks for one constant gain, but the effects'
# peaks rule that out at -14 LUFS / -1.5 dBTP, so loudnorm falls back to its dynamic mode: a
# slow gain rider. That is the sound the reels were signed off with, but a loud one-off effect
# pulls everything down for about a second around it, music included (an impact and chime on
# the end card used to duck the music there), so keep effects near the level of the others.
meas = subprocess.run([FFMPEG, "-hide_banner", "-i", raw_path, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex("{"): meas.rindex("}") + 1])
af = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:"
      f"measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}")
subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", raw_path, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le",
                os.path.join(WORK, "soundtrack.wav")], check=True)
print(f"soundtrack.wav: input {js['input_i']} LUFS -> -14 LUFS", file=sys.stderr)
