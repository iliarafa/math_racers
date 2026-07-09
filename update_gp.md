# Weekly Grand Prix Rotation — Runbook (`update_gp`)

How to re-theme the app to each week's Formula 1 circuit. This drives the **Free Practice** card, the **Grand Prix** mode, and the **`/grand-prix` "Weekend Briefing"** page.

> Prefer this doc over `SESSION_NOTES.md` for the rotation process. `SESSION_NOTES.md` is an older handoff that describes a superseded setup (GP config inlined in `Game.tsx`); the config now lives in its own files (below). When in doubt, copy the most recent rotation commit — e.g. Silverstone `d17e8a0`, Austria `caad87e`.

---

## TL;DR checklist

- [ ] **Assets present** in `client/src/assets/`: a flag, a dark track **silhouette**, and a colored **detail map**. Convert any `.avif` → `.png`.
- [ ] **`client/src/lib/currentGrandPrix.ts`** — swap the two asset imports + rewrite every field of `CURRENT_GRAND_PRIX`.
- [ ] **`client/src/lib/grandPrixHistory.ts`** — add a `GP_HISTORY[<circuitId>]` entry (facts + **real** prior-year race & qualifying results).
- [ ] **New circuit only** — add it to `SIM_LAP_COUNTS` + `CIRCUITS` in `gameLogic.ts` and to the two maps in `LaneRacer.tsx`. *(Skip for the 5 base circuits — see below.)*
- [ ] **Version bump** in `package.json`, `capacitor.config.ts`, and `ios/App/App.xcodeproj/project.pbxproj` (×2).
- [ ] **Verify**: `npm run check` → `npm run build` → browser on `:8081` (Free Practice card + `/grand-prix`).
- [ ] **Deploy**: `cap sync ios` + `cap run ios` on the iPhone 17 sim (UTF-8 prefix).
- [ ] **Commit** to `main` (Austria-style message). **Push is run by the repo owner** → Vercel auto-deploys from `main`.

---

## Step 0 — Prerequisites (assets)

Every rotation needs up to three images. There are strict rendering rules (see [Asset rules](#asset-rules-critical)):

| Role | Used as | Rendering | Style required |
|------|---------|-----------|----------------|
| **Flag** | `CURRENT_GRAND_PRIX.flagImage` | shown as-is | any flag image (`flag_*.png/.jpg`) |
| **Track silhouette** | `CURRENT_GRAND_PRIX.trackImage` | **`invert(1)`** on hero cards | a **dark** line-art outline on transparent bg (inverts to white) |
| **Detail map** | `GP_HISTORY[id].detailMapImage` | **no filter** | a **colored/annotated** map (sector-coded, corner numbers) on transparent bg |

The detail map should match the house style of `client/src/assets/austria_detail_track.png` / `silverstone_detail_track.png`: color-coded sectors (S1 pink, S2 yellow, S3 blue), numbered corners, and the `OVERTAKE ACTIVATION` / `OVERTAKE DETECTION` / `SPEED TRAP` / `STRAIGHT MODE ZONE` labels.

If a supplied asset is `.avif` (or `.webp`), convert to PNG for consistency and iOS/WKWebView safety:

```bash
sips -s format png "<supplied-file>.avif" --out client/src/assets/<circuit>_detail_track.png
```

Leave the original source file untracked (don't commit it).

---

## Step 1 — `currentGrandPrix.ts` (the primary change)

`client/src/lib/currentGrandPrix.ts` is the single source of truth for the featured circuit. Swap the two asset imports and rewrite the object. Every consuming lookup keys off `circuitId`, so the Free Practice card, hero cards, and briefing banner update automatically.

```ts
import circuitSilverstoneBlack from "@/assets/circuit_silverstone_black.png";
import flagUK from "@/assets/flag_uk.png";

export const CURRENT_GRAND_PRIX = {
  round: 9,                       // app's own sequential counter (Austria was 8)
  circuitId: 'silverstone',       // MUST match the GP_HISTORY key + a CIRCUITS id
  name: 'SILVERSTONE',            // shown on cards / briefing hero
  country: 'UNITED KINGDOM',      // used only in flag alt text
  trackImage: circuitSilverstoneBlack,  // dark silhouette (rendered inverted)
  flagImage: flagUK,
  rainProbability: 0.45,          // 0..1, overrides any base value for this circuit
  simLapCount: 52,                // Realism-mode race length; match SIM_LAP_COUNTS
  gradient: 'linear-gradient(90deg, #012169 0%, #FFFFFF 50%, #C8102E 100%)', // briefing banner bg
  welcomeBlurb: 'This week we head to Silverstone, ... for the British Grand Prix.',
};

export type CurrentGrandPrix = typeof CURRENT_GRAND_PRIX;
```

Field notes:
- `round` — the app uses its **own** incrementing counter (not the real F1 round number). Increment from the last rotation.
- `gradient` — a CSS gradient in the country's flag colors; used as the Weekend Briefing banner background.
- `rainProbability` — for a pre-existing base circuit this **overrides** the base value in `Game.tsx`'s `CIRCUIT_RAIN_PROBABILITY` while it's the featured GP.

---

## Step 2 — `grandPrixHistory.ts` (Weekend Briefing entry)

`client/src/lib/grandPrixHistory.ts` holds `GP_HISTORY: Record<string, GrandPrixHistory>`, looked up by `getGrandPrixHistory(circuitId)` (returns the entry or `null`). Import the detail map and add an entry keyed by the **same `circuitId`** as `CURRENT_GRAND_PRIX`. If no entry exists, the briefing page shows "Detailed information for this circuit is coming soon."

Type shape (all fields required except `detailMapImage`):

```ts
type Driver = { name: string; team: string };
type PodiumEntry = Driver & { time?: string };   // race row
type QualiEntry  = Driver & { time?: string };   // quali row

type GrandPrixHistory = {
  officialName: string;                                  // e.g. 'FORMULA 1 BRITISH GRAND PRIX 2026'
  firstHeld: number;
  trackLength: string;                                   // e.g. '5.891 km'
  laps: number;
  lapRecord: { driver: string; time: string; year: number };
  mostWins:  { driver: string; count: number };
  summary: string;                                       // prose about the circuit
  detailMapImage?: string;                               // imported PNG (rendered WITHOUT invert)
  lastYear: { season: number; race: PodiumEntry[]; quali: QualiEntry[] };
};
```

Rules for the data:
- **Use real results.** Fetch and verify last year's race + qualifying classifications (all 20 drivers) — do not invent times. Winner's row shows the total time (`1:37:15.735`), the rest show gaps (`+6.812`); use `+1 lap`, `DNF`, `DNS` where applicable.
- **Team names**: use the short forms already in the file — `McLaren`, `Ferrari`, `Mercedes`, `Red Bull`, `Racing Bulls`, `Aston Martin`, `Kick Sauber`, `Haas`, `Alpine`, `Williams`.
- **Qualifying order** is the session **classification** (Q3 group, then Q2, then Q1) — a Q2 driver can have a numerically faster lap than a slower Q3 driver but still ranks below them.
- Add the new entry near the top so the current circuit sits first (convention only; order doesn't matter functionally).

---

## Step 3 — New-circuit-only wiring

**Skip this step for the 5 base circuits** — `spa`, `monaco`, `monza`, `suzuka`, `silverstone` — they are already fully wired (verify before adding to avoid duplicates). Do it only when the featured circuit isn't already in `CIRCUITS`.

For a genuinely new circuit:
- **`client/src/lib/gameLogic.ts`**
  - Add `<id>: <laps>` to `SIM_LAP_COUNTS`.
  - Add a `CIRCUITS` entry: `{ id, name, type, description, mapUrl: "", paths: { s1:"", s2:"", s3:"" } }`. `type` is the default math operation (`Addition`/`Subtraction`/`Multiplication`/`Division`/`Variables`); empty `paths` are fine (carousel renders the PNG, not SVG sectors).
- **`client/src/pages/LaneRacer.tsx`** — import the flag + track images and add `<id>: ...` to both `FLAG_IMAGES` and `CIRCUIT_MAP_IMAGES` (each is `{ [id: string]: string }`).

> Why base circuits need nothing: `Game.tsx` builds its `FLAG_IMAGES` / `TRACK_IMAGES` / `CIRCUIT_MAP_IMAGES` / `CIRCUIT_RAIN_PROBABILITY` objects with a **computed `[CURRENT_GRAND_PRIX.circuitId]` key declared last**, so it overrides any literal base entry for the featured circuit. TypeScript does not flag a literal-vs-computed duplicate key, so `npm run check` stays clean.

---

## Step 4 — Version bump

Bump the patch version in all three (they were `1.3.7` → `1.3.8` for Silverstone):
- `package.json` → `"version"`
- `capacitor.config.ts` → `version`
- `ios/App/App.xcodeproj/project.pbxproj` → **both** `MARKETING_VERSION` lines

---

## Step 5 — Verify

```bash
npm run check      # tsc — must pass
npm run build      # tsx script/build.ts — bundles client + server; confirm the new PNG is emitted
```

Then run the dev server and check in a browser. The preview server is preconfigured in `.claude/launch.json` as **`dev`** (runs `npm run dev` = `PORT=8081 tsx server/index.ts`) on **port 8081**. (Avoid `dev:client`/Vite on 5000 — it collides with macOS AirPlay on this machine.)

Confirm visually:
- **`/game` → Free Practice card** reads `ROUND <n> / <NAME>`, and the **Weekend Briefing banner** shows the flag + name over the new gradient.
- **`/grand-prix`** — hero (Round, name, flag, `officialName`); the **detail map renders correctly on the dark background with no invert**; Circuit Facts, the two results tables (with a "SHOW ALL (20)" expander), and the summary all render.

---

## Step 6 — Deploy (Web + iOS)

Web ships via Vercel on push to `main` (static SPA). For iOS, sync the built web assets into the Capacitor project and run on the simulator. **Always prefix `cap` commands with the UTF-8 locale** or `pod install` fails with a Ruby `Encoding::CompatibilityError`:

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap run ios --target=A1301ED4-C124-4695-9A60-D05ACF4B4604
```

`A1301ED4-C124-4695-9A60-D05ACF4B4604` is the iPhone 17 simulator. (App id `live.mathracer.app`, web dir `dist/public`.)

---

## Step 7 — Commit & push

Commit to `main` with an Austria-style message (subject `Update Free Practice and Grand Prix to Round <n> / <Circuit>` + a bulleted body). Stage only the intended files — **not** `.claude/settings.local.json` or the untracked source art.

```bash
git add capacitor.config.ts package.json \
  client/src/lib/currentGrandPrix.ts client/src/lib/grandPrixHistory.ts \
  client/src/assets/<circuit>_detail_track.png \
  ios/App/App.xcodeproj/project.pbxproj
git commit -F <message-file>
```

**The repo owner runs/authorizes `git push origin main`.** Vercel then auto-deploys the web build.

---

## Asset rules (critical)

The two track images are rendered differently — getting these backwards makes the art invisible:

- **`trackImage`** (silhouette) is shown with **`filter: invert(1)`** on the Grand Prix / Pre-Season hero cards (`Game.tsx`) and as the **fallback** on the briefing page (`GrandPrixInfo.tsx`). → Supply a **dark** outline on transparent bg; it inverts to white.
- **`detailMapImage`** (briefing map) is rendered with **no filter** (`GrandPrixInfo.tsx`). → Supply a **colored** map that already reads on a dark background. A dark silhouette here would be nearly invisible; if that's all you have, either add an invert for that asset or fall back to using `trackImage` (omit `detailMapImage`).

---

## Where it's consumed (reference)

| File | What it reads | Renders |
|------|---------------|---------|
| `client/src/pages/Game.tsx` | `CURRENT_GRAND_PRIX` | Free Practice card (`ROUND ${round} / ${name}`), Weekend Briefing banner (gradient + flag + name → `/grand-prix`), PST & GP hero cards (silhouette, `invert(1)`); builds `FLAG_IMAGES`/`TRACK_IMAGES`/`CIRCUIT_MAP_IMAGES`/`CIRCUIT_RAIN_PROBABILITY` with a computed `[circuitId]` key |
| `client/src/pages/GrandPrixInfo.tsx` | `CURRENT_GRAND_PRIX` + `getGrandPrixHistory(circuitId)` | `/grand-prix` Weekend Briefing: hero, detail map (no invert) / fallback silhouette (invert), Circuit Facts, 2025 Race + Qualifying tables, summary; "coming soon" if no history |
| `client/src/App.tsx` | — | Registers `<Route path="/grand-prix" component={GrandPrixInfo} />` and lists `/grand-prix` in `MENU_ROUTES` (keeps menu music playing) |
| `client/src/lib/gameLogic.ts` | — | `SIM_LAP_COUNTS`, `CIRCUITS` |
| `client/src/pages/LaneRacer.tsx` | — | `FLAG_IMAGES`, `CIRCUIT_MAP_IMAGES` for the track drum |

---

## Gotchas

- **`SESSION_NOTES.md` is stale** — it predates the extraction of the GP config into `currentGrandPrix.ts` / `grandPrixHistory.ts`. Trust this runbook + the latest rotation commit.
- **Base circuits are already wired** — don't re-add `silverstone`/`spa`/`monaco`/`monza`/`suzuka` to `gameLogic.ts` or `LaneRacer.tsx`.
- **Computed-key override** — a base circuit's literal entries in `Game.tsx` (e.g. `CIRCUIT_RAIN_PROBABILITY.silverstone = 0.50`) are overridden by the `CURRENT_GRAND_PRIX` values while it's featured.
- **AVIF/WebP** — convert to PNG before importing; keeps the codebase consistent and avoids iOS webview surprises.
- **Real data** — never invent lap times / results in `grandPrixHistory.ts`; fetch and verify them.

---

## Worked example — Round 9 / Silverstone (commit `d17e8a0`)

The British GP rotation, for reference:
- Silverstone is a **pre-existing base circuit** → Step 3 was skipped entirely (already in `CIRCUITS`, `SIM_LAP_COUNTS.silverstone = 52`, and both `LaneRacer.tsx` maps).
- `trackImage` reused the existing dark `circuit_silverstone_black.png`; `flagImage` reused `flag_uk.png`.
- Only new asset: `silverstone_detail_track.png`, converted from a supplied `.avif`.
- `grandPrixHistory.silverstone`: firstHeld 1950, 5.891 km, 52 laps, lap record Verstappen 1:27.097 (2020), most wins Hamilton (9), plus the full real 2025 British GP race + qualifying tables.
- Version `1.3.7` → `1.3.8`. Files changed: `currentGrandPrix.ts`, `grandPrixHistory.ts`, `silverstone_detail_track.png`, `package.json`, `capacitor.config.ts`, `project.pbxproj`.
