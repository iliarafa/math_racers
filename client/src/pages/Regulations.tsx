import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";

export default function Regulations() {
  const { state } = useGameState();

  return (
    <GameLayout lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-white">
        <div className="max-w-2xl md:max-w-3xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold text-black mb-8">Race Regulations</h1>

          <div className="space-y-6 md:space-y-8">

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Free Practice</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Free Practice is available to everyone — no purchase required. Select any math operation and race 100 questions on the Bahrain International Circuit.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Tap Free Practice on the mode select screen, then pick your operation</p>
                <p>Difficulty adjusts dynamically based on your speed and accuracy</p>
                <p>No penalties — wrong answers don't count against you</p>
                <p>Complete all 100 questions to submit your score to the Leaderboard</p>
                <p>End your session early at any time — only 100-question completions count for the Leaderboard</p>
                <p>Score formula: (laps / time) × accuracy × difficulty multiplier × 1000 (max 100,000)</p>
                <p>Difficulty multipliers: Karting = 1.0, F3 = 1.5, F2 = 2.0, F1 = 3.0</p>
                <p>Name prompt appears on your first Leaderboard submission (max 20 characters)</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Circuits</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Each circuit tests a different math operation.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>SPA — Addition</p>
                <p>Monaco — Subtraction</p>
                <p>Monza — Multiplication</p>
                <p>Suzuka — Division</p>
                <p>Silverstone — Variables / Algebra</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Series</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Four series determine the difficulty of questions.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Karting (ages 6–8) — numbers 1 to 10</p>
                <p>F3 (ages 8–10) — numbers 10 to 50</p>
                <p>F2 (ages 10–12) — numbers 20 to 100</p>
                <p>F1 (ages 12+) — numbers 50 to 200</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Race</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Answer 20 math questions correctly to cross the finish line.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Each correct answer advances you one sector</p>
                <p>In Realism Mode, races use full Grand Prix distances (44–78 laps per circuit)</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Track Limits</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Each question allows up to 4 attempts.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Wrong answers show a track limits warning</p>
                <p>4th wrong attempt on the same question results in a crash (DNF)</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Sectors</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Answer times are color-coded based on your performance.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p><span className="text-purple-400">Purple</span> — fastest overall</p>
                <p><span className="text-green-400">Green</span> — quick response</p>
                <p><span className="text-yellow-400">Yellow</span> — slower response</p>
                <p><span className="text-red-400">Red</span> — incorrect answer</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Weather</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Weather conditions affect question difficulty.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p><span className="text-black/70">Dry</span> — standard difficulty</p>
                <p><span className="text-black/70">Wet</span> — increased difficulty</p>
                <p><span className="text-black/70">Random</span> — rain probability varies per circuit. In Realism Mode with Random weather, conditions alternate 3 to 5 times during the race</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Overtake</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Build energy by answering correctly. Faster answers charge more energy.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Activates when behind and within two sectors of your opponent</p>
                <p>2x progress per correct answer while active</p>
                <p>Harder questions while active</p>
                <p>A wrong answer depletes all energy immediately</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Active Aero</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Engage AERO in designated zones for sector boosts.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Two activation zones in Standard Mode</p>
                <p>Five activation zones in Realism Mode</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Championship</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Progress through the series by championing circuits.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Beat the bot to champion a circuit at your current series</p>
                <p>Championing a circuit unlocks it at the next series</p>
                <p>A new series unlocks when you champion at least one circuit at the previous series</p>
                <p>Progression: Karting → F3 → F2 → F1</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Practice Mode</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                A pressure-free environment within Career mode to sharpen your skills on any circuit.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>100-question sessions that loop until you stop</p>
                <p>No track limit penalties or disqualifications</p>
                <p>No series or circuit locks — practice any circuit at any difficulty</p>
                <p>Power-ups still work in practice</p>
                <p>No Leaderboard submission</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Realism Mode</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Full Grand Prix distance with stricter rules.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Full lap count per circuit (44–78 laps)</p>
                <p>Five AERO zones instead of two</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Grand Prix</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                A full race weekend at Melbourne with three sequential phases.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Select your math operation, then progress through Practice, Qualifying, and Race Day</p>
                <p>Practice (30 questions) — dynamic difficulty adjusts as you go</p>
                <p>Qualifying (20 questions) — difficulty locks at the level reached in Practice and determines pole position</p>
                <p>Race Day (full simulation length) — pole position grants a 2-sector head start on your first correct answer</p>
                <p>Power-ups are only active during Race Day</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Leaderboard</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Compete for the highest score on the Free Practice leaderboard.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Only Free Practice completions (100 questions) are submitted</p>
                <p>Filter entries by math operation</p>
                <p>Search for players by name</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Multiplayer</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Race 1v1 against another player using 4-digit room codes.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Host creates a room and shares the code</p>
                <p>Guest joins with the code</p>
                <p>Winner is determined by fewer mistakes, then by faster time</p>
                <p>Power-ups are available in multiplayer</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Garage</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Your dashboard for settings, stats, and navigation. Tap buttons to toggle settings — green icon means active.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Sound — toggle game audio</p>
                <p>Realism — toggle simulation distances and extra AERO zones</p>
                <p>Power-Ups — toggle OVERTAKE and AERO systems</p>
                <p>Reflex — F1-style reaction time test</p>
                <p>Racer Log — your race history grouped by series</p>
                <p>Leaderboard — Free Practice standings</p>
                <p>Regulations — rules and guide (this page)</p>
                <p>Strategy — math reference guide with tips for each operation</p>
                <p>Reset Career — wipes all progress (requires confirmation)</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Reaction Test</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                Test your reflexes with an F1-style 5-light start sequence.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Wait for the lights to go out, then tap as fast as you can</p>
                <p>Tapping before the green light is a jump start (disqualified)</p>
                <p>Perfect (under 0.2s), Excellent (under 0.3s), Good (under 0.4s), Average (under 0.5s), Slow (over 0.5s)</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-bold text-black border-b border-black/20 pb-2 mb-3">Strategy Guide</h2>
              <p className="text-black text-sm md:text-base leading-relaxed mb-2">
                A math reference guide with tabs for each operation.
              </p>
              <div className="text-black/50 text-sm md:text-base space-y-1">
                <p>Addition — number bonds and strategies</p>
                <p>Subtraction — counting up and rounding techniques</p>
                <p>Multiplication — interactive times table</p>
                <p>Division — fact families and inverse relationships</p>
                <p>Variables — solving for unknowns with balance method</p>
              </div>
            </section>

          </div>

        </div>
      </div>

      {/* Sticky bottom back button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-center py-3 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <Link href="/garage">
          <button
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            Back
          </button>
        </Link>
      </div>
    </GameLayout>
  );
}
