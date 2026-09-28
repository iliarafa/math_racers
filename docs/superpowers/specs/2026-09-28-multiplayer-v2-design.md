# Multiplayer v2: Race a Friend

## Context

Multiplayer v1 (`client/src/pages/Multiplayer.tsx` with `server/websocket.ts`) only works when the
local Express dev server serves the page. The client builds every URL from its own origin
(relative `/api/rooms`, `ws://<host>/ws`). The live site on Vercel is a static build
(`vercel.json`: `vite build`, SPA rewrite), so `/api/rooms` returns `index.html` and `/ws` never
upgrades. The iOS app (origin `capacitor://localhost`) has no server URL at all. Create and Join
therefore fail everywhere players are, and the Hub has not linked to multiplayer since `e2136ec`
(2026-08-05). The lobby labels itself "LAN Only".

The v1 race screen is a ~375-line copy of Game.tsx's phone HUD and has drifted:
- a wrong answer advances a lap instead of retrying
- menu music keeps playing through the race
- there is no iPad landscape split
- the first player to finish is left on a frozen screen with the clock running

The v1 server keeps all state in one process and trusts the client. It has three ordinary ways
to leave a race that never ends:
- a +2 bonus capped at the finish line (the server expects exactly +2 and drops the update)
- players with different Realism settings (`raceLength` is never sent to the guest)
- a disconnect during the countdown

Decisions taken with the user (brainstorming, 2026-09-28):

- **Goal: a fresh race experience.** A new lobby, a race screen with the friend on track, a
  results podium and a one-tap rematch, built from the single-player race pieces rather than a
  separate copy. Still 1v1 with a room code: no strangers, no matchmaking, no chat.
- **Online, on the web and in the iOS app.**
- **Transport: Supabase Realtime** (Broadcast) on the leaderboard project
  `pslagmyvlvrpwnbhwqpp`. The org is on the Pro plan: 500 concurrent connections, 500 messages/s,
  5M messages a month. There is no game server; **the host's device referees**, and the room
  ends if the host quits (no host migration).
- **Rules: Quick Race's.** 20 laps. A wrong answer turns the sector red and you retry the same
  question; the 4th wrong try on one question is a crash (DNF). **First across the line wins.**
  v1's "fewer mistakes wins" is dropped.
- **One level for the room.** The host locks it in the lobby (Karting, F3, F2, F1 or Pro); both
  players get the exact same questions. No Adaptive in multiplayer. (A maths level says nothing
  about a player's age, so per-player levels were rejected.)
- **No power-ups:** no OVERTAKE, no ACTIVE AERO, no energy.
- **Track:** the current GP circuit. The host picks the maths operation.
- **Branching:** v2 lives on `feat/multiplayer-v2` (worktree `.worktrees/multiplayer-v2`), in new
  files only. The race pieces it needs from Game.tsx move into shared components as
  no-visible-change commits on `main`. v1 stays untouched until the merge replaces it.

Defaults chosen during design, open to change:
- a 4-digit numeric room code typed on the game's own keypad
- RETIRE in place of pause
- the host can change the level or maths on the results screen before a rematch
- a page reload mid-race counts as leaving that race
- no Racer Log or personal-best entries
- no "remove player" button

## 1. Transport: Supabase Realtime

The client already talks to Supabase directly for the leaderboards (`client/src/lib/supabase.ts`,
URL and anon key hardcoded). Multiplayer reuses that client. There is no Supabase auth, so
players are identified by `GameState.playerId` (a persistent UUID) and `playerName`.

**Spike results (2026-09-28, two Node clients, realtime-js 2.95.3):**

| Check | Result |
|---|---|
| Anon client subscribes to a public channel | Yes, about 0.2–0.5 s |
| Broadcast round trip | 43–109 ms |
| 8 KB broadcast | Delivered in 33 ms |
| Newcomer sees the other player in **presence** | 0.7–2.9 s. The first `sync` is always empty. |
| Guest `sync` broadcast → host `room` reply | 228 ms after the guest's subscribe call |
| Unclean socket drop (raw socket closed) | Channel goes `CHANNEL_ERROR` at once, then rejoins by itself: `SUBSCRIBED` again after about 3 s. The subscribe callback fires again. Presence is **not** re-tracked automatically. |
| Other side notices the drop via presence | 1.2–2.6 s after a socket close. A real iOS suspension sends no close frame, so expect much longer. |
| `realtime.disconnect()` then `connect()` | Channels do **not** rejoin: a manual disconnect is treated as deliberate. Never use it except when leaving. |
| `sendHeartbeat()` | Resolves at once. It only forces a reconnect when an earlier heartbeat is still unanswered. |

Consequences for the design:
- **Broadcast only; no presence.** Joining uses a broadcast handshake (the guest sends `sync`, the
  host answers `room`), and app-level heartbeats plus `bye` decide who is away, because presence
  is slow to show a newcomer and can take much longer to notice a suspended phone. Dropping it
  also removes the re-track-on-rejoin chore.
- **Re-send `sync` (and the guest's state) on every `SUBSCRIBED`,** since a rejoin can follow a
  gap in which messages were lost.
- **Resume probe:** on `visibilitychange` to visible, call `sendHeartbeat()` now and again 2 s
  later. The second call turns a dead socket into a reconnect.

## 2. Protocol (`client/src/lib/multiplayerProtocol.ts`)

**Topic.** `mathracer:mp2:<env>:<code>`.
- `env` is `dev` on the dev server (`import.meta.env.DEV`), because it shares the production
  project, and `live` otherwise. `VITE_MP_ENV` overrides it for iOS test builds.
- `code` is 1000–9999.

The protocol version is **not** in the topic. If it were, players on different versions would
never meet, and the joiner could only report "no race found". Instead every message carries it,
and it is checked before the message's shape, so a newer friend's message is reported as a
version mismatch rather than dropped as garbage.

**Events.** Every payload is validated with zod (already a dependency) and carries
`v: PROTOCOL_VERSION` and `app` (the sender's app version). Unknown keys are stripped and lengths
are capped (name ≤ 20, display ≤ 24).

| Event | Sender | When | Payload |
|---|---|---|---|
| `room` | host | Every state change (`seq++`), which includes every guest message it receives (that is the acknowledgement); every 3 s regardless; in reply to `sync` | `{ v, app, seq, snap: RoomSnapshot }` |
| `bank` | host | Just before the first countdown `room` of a race; in reply to a `sync` that asks for it | `{ v, app, roomId, raceId, level, op, questions }` |
| `guest` | guest | Every local change (`seq++`); resent every 1.5 s until `snap.guestAck` reaches it; every 4 s regardless | The guest's complete state: `{ v, app, seq, session, id, name, agree, raceId, race, raceMs }` |
| `sync` | guest (and a host probing a code) | On every `SUBSCRIBED`; every 0.8 s while joining; every 1 s while the race's bank is missing | `{ v, app, id, name, need: ('room' \| 'bank')[] }` |
| `bye` | either | Leave, unmount, `pagehide` | `{ v, app, id }` |

- `agree` is `{ raceId, rev }`: "start the race after `raceId` with settings revision `rev`". It is
  the guest's Ready in the lobby and its Race again after a race; the host's Start and Race again
  set the same agreement on its side. A race starts when both agree on the current pair, so a
  resend of an old Ready can never start a race the guest hasn't seen.
- `session` is new for every page load, so a reloaded guest whose `seq` starts again is not taken
  as a stale message.
- `raceMs` is the guest's race time when it sent the message, for the referee's
  "can it still win" check.

**Joining.**
- **Host:** subscribe, then send a `sync` probe. If another host answers with `room` (or with a
  message on another protocol version) within 1.5 s, pick a new code (up to 5 tries). Then
  broadcast `room`.
- **Guest:** subscribe, then send `sync` every 0.8 s until the first `room` reply, which decides:
  - a matching `v` → join
  - a different `v` → "Your game and your friend's game are different versions. Update both,
    then try again." with both app versions shown
  - a guest already seated → "This race is full"
  - the host is you → "That's your own race"
  - no reply within 4 s → "No race with code 4821"

**Volume.** About 125 sends for a 20-lap race of about 90 s, so 5M messages a month is roughly
20,000 races.

## 3. Questions (`client/src/lib/multiplayerQuestions.ts`)

The host deals the race's questions at each start:

```ts
mintQuestionBank(raceId, level, op, circuitId, laps = RACE_LENGTH, gen = generateQuestion): QuestionBank
```

- 20 questions at the room's level, each generated with the previous display so nothing repeats
  back to back. About 1.5 KB.
- Both devices play `bank.questions[lap]`.
- Each item carries `display`, `answer` and what fact mastery needs (`num1`, `num2`,
  `operation`).
- `shared/mathEngine.ts` is not changed.

A host-dealt bank was chosen over each device generating the questions from a shared seed.
App Store builds trail the web by weeks. A seed only reproduces the same questions while
`mathEngine`'s ranges and its order of random draws match exactly on both devices. A
single-player tweak would silently break "both players get the same questions", and nobody
editing `mathEngine` would think to bump the multiplayer protocol. The bank keeps the promise
by construction.

## 4. One player's race (`client/src/lib/multiplayerRaceState.ts`, pure)

```ts
startRacer(raceId, laps): RacerState
currentQuestion(s, bank): BankQuestion | null   // null before this race's bank arrives, and once stopped
submitAnswer(s, bank, value, responseTimeMs, raceMsNow): { state, outcome: 'correct' | 'wrong' | 'crash' | 'finish' | 'ignored' }
retireRacer(s, raceMsNow): RacerState
toWire(s): RacerWire
sectorColors(mine: LapWire[], rival: LapWire[]): { mine: SectorColor[]; rival: SectorColor[] }
```

It mirrors Game.tsx's race mode at a fixed level:
- **Correct answer:** records a lap with its response time, `fact` (`factKey`) and any wrong
  attempts.
- **Wrong answer:** adds a warning and an attempt, and keeps the same question.
- **4th wrong answer** on one question: crash.
- **Lap 20:** finish, recording the race time.

`sectorColors` reproduces Quick Race's race-mode colours (`Game.tsx` 1177–1223):
- purple: the fastest time on that sector, taken back when beaten
- green: within 1.5× of the fastest
- yellow: slower than that
- red: the lap needed a retry

## 5. Referee (`client/src/lib/multiplayerRoom.ts`, pure, clock injected)

```ts
createRoom({ roomId, code, host, level, op, circuit, laps }): RoomState
reduceRoom(s, action): RoomState
toSnapshot(s, now): RoomSnapshot
lightsOutAt(s): number | null
```

Every action carries `now`; the reducer first applies what time alone changes (the lights going
out, a silent guest dropped or marked out, a start both sides agreed to, a result that has become
certain), then the action, then the same again. It returns the same object when nothing changed.

**Phases:** lobby → countdown → racing → results → (rematch) → countdown.
- The countdown is 6 s: lights 1–5 at one-second steps, lights out at 6 s (as `Game.tsx` 816–833).
- The guest starts its lights when the countdown snapshot arrives, skipping the time already
  elapsed, and holds on the fifth light until the bank has arrived.
- Guest race updates count only for the current `raceId`, and laps only ever grow.

**Settings.** Level and maths belong to the host and can change only between races. Changing
either bumps the settings revision, which voids every agreement given for the old one (the
host's included), so the guest always sees what it is agreeing to. A race starts when host and
guest agree on the current `(raceId, rev)` and the guest is not away; a rematch is the same rule
in the results phase.

**Winner.** Each device times itself from its own lights-out with `Date.now()` differences.
No clock sync is needed, and a late start costs nothing. The lowest race time wins. The host
declares P1 only when the other car provably cannot beat it:
- For itself, the host uses its own clock: `now − hostLightsOut > leader.ms`.
- For the guest: `g.raceMs + (now − g.receivedAt) > leader.ms + FINISH_MARGIN_MS` (1.5 s). The
  guest's last reported race time plus the time since it arrived never overestimates its
  current race time. The margin covers a guest finish that is still in flight when the host
  crosses the line.

A tie goes to fewer warnings, then to the host. A crash, retirement or disconnect is a DNF. If
both cars are out, nobody wins. A declared result never changes. Race updates are accepted only
for the current race, only if the laps grow, never after a car has stopped, and a finish only
with every lap done and a race time no shorter than the sum of its lap times.

The phase moves to results once the result is final **and** both cars have stopped: a winner
decided early leaves the other car racing to the line, as in Quick Race.

**Away.** The guest sends its state at least every 4 s; one silent for 9 s is shown as away.

| Situation | Lobby | Countdown or race | Results |
|---|---|---|---|
| Guest silent, or sent `bye` | Seat freed after 20 s of silence, at once on `bye` | "WAITING FOR MIA"; a DNF after 60 s of silence, at once on `bye` (a car that already finished keeps its finish). Its own clock keeps running meanwhile, so the winner rule still holds. | Kept on the podium, shown as away; Race again waits for them. The seat is never freed here, so the host's screen never jumps back to the lobby. |
| Guest comes back (same `playerId`) | Re-seated | Nothing lost; it resends its full state | Can Race again |
| Host silent for 7 s | Guest sees "Waiting for [host]…" | Guest keeps racing and shows the waiting pill | Same |
| Host gone for 60 s, or `bye` | Room closed | Room closed. The guest's own result stands with no position; streak and mastery count, a win does not. | Room closed |
| Reload mid-race (new `session`) | — | Counts as leaving the race | — |

## 6. Client wiring

- **The transport contract** lives in `multiplayerController.ts`:
  `OpenTransport = (topic, { onMessage, onStatus }) => { send(event, payload): boolean; probe(); close() }`,
  with `onStatus('joined')` on the first join and after every automatic rejoin. The tests supply
  an in-memory hub (in the test file) that can drop, delay, cut and restore delivery.
- **`multiplayerSupabase.ts`:** the Supabase transport, not imported by tests.
  - Register every `.on()` before `subscribe()`; adding a listener to a joined channel forces a
    resubscribe.
  - `send()` returns `false` unless the channel is joined (otherwise supabase-js falls back to REST).
  - Before opening, remove any existing channel with the same topic, because
    `supabase.channel(topic)` returns it.
  - `probe()` is the resume probe from section 1; `close()` calls `removeChannel`.
- **`multiplayerController.ts`:** `RoomController.host(deps, settings)` and
  `RoomController.join(deps, code)`, plain TypeScript with the transport, clock, timers,
  randomness and ids injected. The view (`stage`, `error`, `snap`, `bank`, `racer`,
  `countdownEndsAt`, `lightsOutAt`, `hostSilent`, …) is what the page renders; the actions are
  `agree`, `setLevel`, `setOperation`, `answer`, `retire`, `resume` and `leave`.
  - The host runs the reducer, ticks it every 250 ms, broadcasts whenever the state changes and
    every 3 s regardless, and deals the bank when a race starts.
  - The guest keeps the snapshot with the highest `seq`, resends until acknowledged, heartbeats,
    and asks for the bank while it is missing. A bank can arrive before the snapshot that starts
    its race and is kept for it. Its lights go out at the end of the countdown or when the bank
    arrives, whichever is later.
- **`hooks/use-multiplayer-room.ts`:** exposes the controller through `useSyncExternalStore`,
  wires `visibilitychange` to the resume probe, and disposes on unmount. Keeping the logic
  outside React avoids v1's stale-closure bugs.

Pure modules sit flat in `client/src/lib/` so the non-recursive `npm test` glob finds their
tests. They must not import `currentGrandPrix.ts` or `circuitMenuArt.ts`, which import `.png`
files that Node cannot load: the circuit is passed in. `__APP_VERSION__` is injected.

## 7. Screens (`client/src/pages/RaceAFriend.tsx`, `client/src/components/multiplayer/`)

1. **Name.** Only when `playerName` is empty: 1–20 characters, saved with `setPlayerName`,
   "Your friend will see this name".
2. **Home.** "Host a race" and "Join a race". The first tap starts audio, which iOS needs for
   the countdown beeps.
3. **Join pad.** Four digit slots filled from `RaceKeypad` (desktop: `KeyStrip` and the physical
   keyboard). It joins on the fourth digit.
4. **Lobby.** A `RaceSetupCard`, like single-player setup.
   - The room code large, and both players.
   - The level row (locked levels only, defaulting to the host's `loadLockedDifficulty()`) and
     the maths row, both set by the host. The guest sees them as readouts.
   - Ready for the guest; Start race for the host, enabled once the guest is ready.
5. **Countdown.** `StartLights`.
6. **Race.** The Quick Race HUD.
   - **Phone:** a badge row with the rival's status pill and RETIRE (with a confirm) in place of
     pause; the clock and the race's level label; `PhoneQuestionPane`; a two-row
     `SectorProgressGrid` with the rival's name as the rival row's label and
     `Warnings: N` on the right; `RaceKeypad`.
   - **iPad landscape:** the shared `RacingScreen*` wrappers give the two-pane split.
   - **Desktop:** `DesktopRaceScreen` with `QuestionPane` (grid in `between`), `HudClock`,
     `KeyStrip` and `useKeyEcho`.
   - Keys: 0–9, Backspace and Enter through one ref-backed listener. Sounds from `raceSounds`,
     respecting `soundEnabled`. Feedback timings as in Game (600 ms), FINAL LAP on the last lap.
   - Rival pill states: `MIA FINISHED`, `MIA CRASHED`, `MIA RETIRED`, `WAITING FOR MIA`.
   - If you finish first: "Finished 1:02.345, checking the result…", resolved once the rival
     provably cannot catch you. If the rival finishes first, you keep racing to the line, as in
     Quick Race.
7. **Results.**
   - A podium: P1 and P2 (or DNF), names, times, the gap, red sectors.
   - Confetti on a win, and `RewardStrip`.
   - "Race again": both tap, then the host starts automatically. The host can change level or
     maths first.
   - "Leave".

**Rewards,** once per race and only when you finished and the result is final (or the room
closed): a win calls `incrementRacesWon()`; then `touchDailyStreak()`, `ingestFactResults(...)`,
`settleMilestones()` and `announceRewards(...)`. No trophy, no leaderboard entry, no coins.

**Music.** Dispatch `racingStateChange` with `racing: true` from the countdown through results,
and `false` in the lobby and on unmount (same pattern as `Game.tsx` 765–772).

**Two players in one browser.** Tabs in one browser share `GameState.playerId`. On the dev server
only, `?player=b` gives a tab the id `<playerId>-b` and the name "`<name>` B".

## 8. Shared race pieces extracted on `main`

Six replace-only commits, each with no visible change, so v2 and Game.tsx share one race screen:

1. `lib/supabase.ts`: export `supabase`.
2. `lib/raceSounds.ts`: `initAudio`, `playBeep`, `playCorrectSound`, `playKeypadClick`,
   `playIncorrectSound`, moved out of Game.tsx.
3. `components/race/StartLights.tsx` (`{ lit }`).
4. `components/race/RacingScreen.tsx`: `RacingScreen`, `RacingScreenLeft`, `RacingScreenColumn`,
   `RacingScreenRight`, holding the `.racing-screen` / `.landscape-*` CSS contract
   (`index.css` 115–153).
5. `components/race/PhoneQuestionPane.tsx`: the phone twin of the desktop `QuestionPane`
   (question, answer, feedback colours, `+5s` overlay, FINAL LAP slot). Adds
   `data-testid="display-question"`.
6. `components/race/RaceKeypad.tsx`: `onDigit`, `onDelete`, `onSubmit`, `disabled`, `locked`,
   `canSubmit`, `topRow`. It stays a direct child of `.landscape-right` (the iPad key-height rule
   targets `.racing-screen .landscape-right .grid.grid-cols-3 > *`) and takes Game's power-up
   row as `topRow`.

Each is checked with a before/after diff of the page structure (tags, sorted classes, test ids)
in every HUD variant (Race Day, GP Practice, GP Qualifying, Free Practice, Quick Race) on phone,
the web column, iPad landscape and desktop, without finishing a Quick Race or Race Day.

## 9. Merging

When the user decides to publish:
- `/multiplayer` points at `RaceAFriend`; the development route `/multiplayer/v2` goes.
- Delete v1:
  - `pages/Multiplayer.tsx`
  - `server/websocket.ts`
  - the room routes and storage methods
  - `multiplayerRooms` in `shared/schema.ts`, adding `"!multiplayer_rooms"` to the drizzle
    `tablesFilter`
  - `ws`, `@types/ws`, `bufferutil`, and `ws` from the build allowlist
- Removing the `/ws` server also fixes the dev server's hot reload: that `WebSocketServer`
  answers `/vite-hmr` upgrades with 400.
- A Hub card, Regulations, CLAUDE.md, a version bump; a smoke test on mathracer2026.io and
  TestFlight.

## 10. Testing

**Unit and integration tests** (`client/src/lib/*.test.ts`, node:test):
- Protocol: topic strings, the code range, zod accepting valid messages and rejecting a wrong
  `v` or oversized fields.
- Questions: 20 questions at the room's level, no back-to-back repeats, each answer matching its
  display.
- Race state: correct, wrong, retry and red sector; the 4th wrong try crashes; the last lap
  finishes; no question before this race's bank; the wire form; sector colours.
- Referee: lobby join and leave, agreements in either order, settings voiding them, the start
  guard, countdown to racing at 6 s, stale `seq` and `raceId` ignored, race updates that shrink
  or don't add up refused; a guest finish inside the 1.5 s margin beats the host's; beaten once
  the lower bound passes; both crash; crash then finish; retire; tie-breaks; a declared result
  never changing; away and drop timings in each phase; reload and `bye` mid-race; rematch.
- Controller over an in-memory hub with a fake clock: joining, not found, full, own race,
  version mismatch, code collision; lights and identical questions on both screens; a full race
  with the guest's clock an hour off; 30% message loss; a guest cut off and restored; a crash;
  race again; an idle lobby; a lost Ready resent before the next heartbeat; lost questions asked
  for again; the host heard while the guest's messages are lost; a silent host, one coming back,
  and one leaving. Each of the resend, bank-retry and heartbeat paths was checked by removing it
  and watching its test fail.
- A soak run (not committed) of full 20-lap races over 200 loss patterns: at 10% loss all ended
  the same on both screens; at 30% and 50% the only failures were joins that timed out, and no
  run ever showed two different or unfinished results.

**Browser:** tab A at `/multiplayer/v2`, tab B with `?player=b`, on a worktree dev server.
Finishing a multiplayer race is safe (no leaderboard). Browsers slow background tabs' timers, so
finish order is proven by the tests; the browser checks flow and visuals.

**iOS:** a `VITE_MP_ENV=dev` build on the iPhone and iPad simulators racing a dev browser tab,
backgrounded for 10 s and 70 s mid-race and with the screen locked; then a real phone on
cellular.

## 11. Risks and limits

- Codes can be guessed and the anon key is public, so anyone could listen to an open room and see
  the two names. There is no chat, rooms vanish when the host leaves, and nothing is stored.
  Accepted as part of "racing a friend".
- There is no authentication, so a modified client could send a false race. Accepted for the
  same reason.
- If Supabase ever turns off public channels for the project, the fallback is private channels
  with an RLS policy on `realtime.messages` for topics like `'mathracer:mp2:%'`.
