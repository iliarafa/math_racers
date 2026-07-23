# Next Session Handoff

**Branch:** `main`  
**App version:** `1.3.11` — **single source of truth.** Build `1` is correct (nothing archived for 1.3.11 yet).  
**App Store live:** `1.3.10` (shipped as build 2 — build numbers reset per marketing version, so 1.3.11 build 1 is valid)  
**Current GP:** Round 11 / Hungary — `client/src/lib/currentGrandPrix.ts`  
**Last updated:** 2026-07-22  
**Status:** Free Practice / Grand Prix setup cards rebuilt as **LEVEL / VIEW / WEATHER drums**. Shipped and verified on the iPhone 17 Pro sim.

---

## Resume here (start here)

```bash
git checkout main
git pull
npm run dev -- --port 8081
```

Open **`http://127.0.0.1:8081`** (prefer over `localhost` — server listens IPv4 only).

**iOS:**  
`npm run build && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios`  
`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604`  
(iPhone 17 sim — confirm with `xcrun simctl list devices booted`)

**Agent map for Spa-quality circuit work (if needed):** [`docs/spa-quality-circuit-map-guide.md`](spa-quality-circuit-map-guide.md)

---

## Setup drums — how the cards work now

Free Practice and Grand Prix share **one** component. Both used to be ~110 lines of
byte-identical JSX; that duplication is gone.

| Piece | Location |
|-------|----------|
| Shared card | [`client/src/components/setup/RaceSetupCard.tsx`](../client/src/components/setup/RaceSetupCard.tsx) |
| Drum mechanism | [`client/src/components/setup/SetupDrum.tsx`](../client/src/components/setup/SetupDrum.tsx) (extracted from Lane Racer) |
| Titled drum | [`client/src/components/setup/SetupDrumRow.tsx`](../client/src/components/setup/SetupDrumRow.tsx) |
| Weather options | [`client/src/components/setup/weatherOptions.ts`](../client/src/components/setup/weatherOptions.ts) |
| Level options | `DIFFICULTY_DRUM_OPTIONS` in [`gameLogic.ts`](../client/src/lib/gameLogic.ts) — **derived from `DRIVERS`**, do not hand-edit |
| Setup click sound | [`client/src/lib/uiSound.ts`](../client/src/lib/uiSound.ts) (owns the shared `AudioContext`) |

**Three drums: LEVEL / VIEW / WEATHER.** All words, all the same type size — one language.

- **LEVEL** — `Adaptive, Karting, F3, F2, F1, Pro`. Free Practice only; Grand Prix has no
  LEVEL drum (always adaptive in Practice, then locks). Presence of the optional `level`
  prop is what distinguishes the two cards.
- **VIEW** — Track | Sectors → `state.raceMapView`.
- **WEATHER** — Dry | Wet | Random. **Words only, no icon** — a deliberate call: `Random`
  has no honest icon, and the drum shows one item at a time with nothing to disambiguate it.

**The Adaptive/Locked toggle is gone from the UI.** Underneath, `difficultyMode` +
`lockedDifficulty` are unchanged — the drum maps to/from a drum index, exactly as Lane
Racer already did. **No server, wire-protocol, or localStorage migration was involved**;
do not "finish the job" by collapsing that state without deciding to deploy both ends.

**Per-circuit silhouette art is now config,** not JSX: `mapStageClass` in
[`currentGrandPrix.ts`](../client/src/lib/currentGrandPrix.ts) (falls back to
`DEFAULT_MAP_STAGE_CLASS`). Hungary uses `h-40 md:h-60` because its line art is thin.
**Weekly rotation: set or clear this one field** instead of editing a ternary in two cards.

**Weather now persists** under its own `setupWeather` key — deliberately *not* in the
`f1-math-racer-state` blob, which `MenuMusic` can clobber (see Known issues). If you ever
reintroduce a `setSelectedWeather('dry')` reset in `restartRace` /
`restartToSelectingScreen`, you will silently break persistence after the first race.

### Trap worth knowing

`updateDynamicDifficulty` ([`shared/mathEngine.ts`](../shared/mathEngine.ts)) used to
default `maxDifficulty` to `'pro'` — i.e. **uncapped** — while five call sites passed
`'hard'` as the only thing keeping Pro out of the adaptive ladder. It is now a **required
parameter**, so omitting it is a compile error. Keep it that way. Gate:

```bash
grep -rn -A8 "updateDynamicDifficulty" client/src/pages/Game.tsx client/src/pages/LaneRacer.tsx server/websocket.ts | grep -c "'hard'"
```

Must print `5`.

---

## Shipped this stretch (on `origin/main`)

| Commit | What |
|--------|------|
| _this stretch_ | Setup drums: LEVEL / VIEW / WEATHER on FP + GP, shared `RaceSetupCard`, weather persistence, `mapStageClass` config, F3 colour fix, ~250 lines of dead carousel removed |
| `1f5034a` | Regulations: Everything Is Purple + Hungaroring; Lane Racer defaults to GP circuit; iPhone setup card tighten |
| `16e1293` | Free Practice all-purple lap → ALL PURPLE label + persistent Racer Log badge |
| `88bd6cf`…`c70ad84` | Hungary Live Circuit Map + Round 11 weekend rotation |

**Purple badge (verified)**

- Id: `BADGE_EVERYTHING_IS_PURPLE` (`everything-is-purple`) in `gameLogic.ts`  
- Earn: Free Practice only — full circuit tour all purple → toast + Racer Log badge  
- HUD: level label temporarily **ALL PURPLE** while lit  
- Regulations Free Practice + Garage Racer Log lines updated  

---

## Version — 1.3.11

**`1.3.11` is the single source of truth.** Verified consistent across the working tree:

| File | Value |
|------|-------|
| `package.json` / `package-lock.json` | `1.3.11` |
| `capacitor.config.ts` | `1.3.11` |
| `ios/App/App/capacitor.config.json` (generated by `cap sync`) | `1.3.11` |
| `ios/App/App.xcodeproj/project.pbxproj` | `MARKETING_VERSION` 1.3.11 (both configs) |
| `ios/App/App.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` 1 |

No version string is rendered anywhere in the app UI — these files are the only places it lives.

**Build number `1` is correct.** 1.3.10 shipped as build 2, but App Store Connect scopes
the build counter to the marketing version, so 1.3.11 starts at 1. It only needs raising
if a *second* upload of 1.3.11 goes to ASC.

**History, so nobody "fixes" it backwards:** `6afe18c` ("Add Hungary live circuit map")
bumped to `1.3.12` by mistake — `c70ad84` had already set 1.3.11 for the Hungary round.
That stray bump has been **reverted down** to 1.3.11 and committed. 1.3.12 was never
released; do not treat it as a version to return to.

---

## Hungary / Live Circuit Map (current facts)

| Item | Verified |
|------|----------|
| Thick Live Map art | `client/src/assets/circuit_hungary.png` |
| Thin line art | `client/src/assets/circuit_hungary_black.png` (Lane Racer + FP setup black map) |
| Path JSON | `w: 698`, `h: 667`, `points: 2476`, `ribbon: 19` |
| Lane Racer maps | `hungary: circuitHungaryBlack` |
| Regenerated via | `npx tsx script/extractCircuitCenterline.ts hungary` |

Optional later: further Lane Racer Hungary stroke/framing polish — **do not** enlarge the shared Lane Racer stage (`itemHeight={140}`, `h-24` / `maxWidth: 140`).

---

## Locked product decisions (still in force)

| Topic | Decision |
|-------|----------|
| Adaptive default | Factory default on FP / Lane Racer / MP |
| Locked | Fixed Karting…F1/Pro for the race; no promotion/demotion. **No longer a visible mode** — picking a level on the LEVEL drum *is* locking |
| Grand Prix | Always adaptive Practice; Quali/Race lock after Practice — no LEVEL drum on GP setup |
| Setup drums | One language: LEVEL / VIEW / WEATHER, words only, same type size. No icons mixed with words |
| Soft-follow 3D cam | Capacitor native only (`isNativePlatform()`), including iPad — never in browser |
| Selection chrome | Text color / opacity only — no gray selection pills, no filled selection tiles |
| Kid difficulty ladder | Karting→F1 compressed; Adaptive soft-caps at F1; Pro Locked-only |
| Live Circuit Map iPad size | Native iPad only (`isNativeIPad()`), not browser / not iPhone |
| Lane Racer track stage | Keep Spa-era clamps; no global enlarge to fix one circuit |

---

## Backlog (confirm with user)

0. **1.3.12: unlock the track picker + ship consistent PNGs for all circuits.** In **1.3.11** the
   TRACK picker in Lane Racer **and** Multiplayer is **locked to the current GP circuit** — the six
   remaining silhouettes are still inconsistent in stroke/size (raster problem CSS can't fix), so
   rather than ship that, only the weekend's circuit is shown, as a non-interactive TRACK row. The
   lock is one flag: **`LOCK_MENU_TO_CURRENT_GP` in `client/src/lib/circuitMenuArt.ts`** — while
   `true`, `MENU_CIRCUITS` collapses to `[current GP]`; a single-option row auto-renders static (see
   `SetupRow`'s `interactive` branch). Multiplayer's `selectedCircuit` init was pointed at
   `MENU_CIRCUITS[0]` so the created room's `circuitId` follows the lock.

   For **1.3.12**: (a) set `LOCK_MENU_TO_CURRENT_GP = false`, and (b) add fresh, **consistent**
   thin-line `_black` PNGs (~360px canvas, matching Spa's stroke/tone) for **all** circuits — the six
   already in `CIRCUIT_MENU_ART` need re-exports to actually match, and Miami / Canada / Barcelona /
   Austria need adding back (they were removed earlier for heavy raster art; still inert in `CIRCUITS`
   / `SIM_LAP_COUNTS`). Adding a circuit = one entry in `CIRCUIT_MENU_ART` (`image` + `flag`); nothing
   else changes. (An abandoned alternative — rendering silhouettes from vector centerlines for uniform
   stroke — is written up under "Follow-up: uniform VECTOR silhouettes" in the session plan; the user
   chose fresh PNGs instead.)

1. **Multiplayer setup card** — still the only `SetupChoiceRow` consumer, still has the
   filled-tile weather row (labelled Standard / Harder / Surprise). Adopting the drums
   there needs a `variant` prop first: `SetupDrum` hardcodes `text-white/35` chevrons and
   MP's card is light-themed. ← **most natural next step**
2. Align Multiplayer race status chrome with Game  
3. Remove or gate `/dev/circuit-maps` in production  
4. Play-test kid ladder + Lane Racer pace  

### Known issues (found, not fixed)

- **`useGameState` blob clobber.** `useGameState` is a plain hook, not a context, and
  `MenuMusic` (`App.tsx`) holds a second independent copy while rendering the sound
  toggle. The persistence effect rewrites the *entire* `f1-math-racer-state` blob on any
  change, so toggling music can write `MenuMusic`'s mount-time-stale `raceMapView` over a
  newer value. Real, pre-existing, and the reason setup weather uses its own key.
- **Multiplayer setup card unverified** after the `SetupChoiceRow` prop cleanup — it needs
  a hosted room to reach. The lobby renders and `tsc` is clean; only a dead prop was removed.

### Local untracked (not committed)

- `docs/hungary-90cw-centerline-check.png`  
- `docs/mockup-map-toggle-real-sectors.png`  
- `docs/mockup-map-toggle-real-track.png`  
- `docs/setup-card-target.png`  

### Out of scope unless asked

- Soft-follow in browser  
- Championship unlock redesign  
- Deploy/Harvest re-enable  
- Retracing Canada / Miami / Barcelona / Austria  

---

## Note for the next agent

You are on **`main`**, synced with origin for code through `1f5034a`. GP is **Hungary (Round 11)**. App version is **1.3.11**, build **1** — uncommitted, and it is a *revert down* from the stray `1.3.12` on `HEAD`, not a bump.  

**Start with Free Practice setup** in `Game.tsx` (`hero-card-pst-hungary` / `isPreSeasonTesting` card). Prefer `http://127.0.0.1:8081`. iOS: build + `cap sync` + `cap run` to the iPhone 17 sim. Do not reopen locked difficulty / map-stage decisions without asking.
