import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { ChevronLeft } from "lucide-react";

export default function Regulations() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins} darkBackground lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/garage">
              <button
                className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-neutral-800 rounded-full transition-colors text-white"
                data-testid="button-back-to-garage"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">Race Regulations</h1>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Race</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Answer 20 math questions correctly to cross the finish line.
              </p>
              <p className="text-white/50 text-sm">Each correct answer advances you one sector</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Overtake</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Build energy by answering correctly. Faster answers charge more energy.
              </p>
              <p className="text-white/50 text-sm">Activates when within two sectors of your opponent</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Active Aero</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Engage AERO in designated zones for sector boosts.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p>Two activation zones in Standard Mode</p>
                <p>Five activation zones in Realism Mode</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Sectors</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Answer times are color-coded based on your performance.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p><span className="text-purple-400">Purple</span> — fastest overall</p>
                <p><span className="text-green-400">Green</span> — quick response</p>
                <p><span className="text-yellow-400">Yellow</span> — slower response</p>
                <p><span className="text-red-400">Red</span> — incorrect answer</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Track Limits</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Wrong answers trigger warnings and time penalties.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p>Warnings come first, then time penalties</p>
                <p>Too many mistakes results in disqualification</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Weather</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Weather conditions affect question difficulty.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p><span className="text-white/70">Dry</span> — standard difficulty</p>
                <p><span className="text-white/70">Wet</span> — increased difficulty</p>
                <p><span className="text-white/70">Random</span> — conditions may change mid-race</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Practice</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                A pressure-free environment to sharpen your skills. Wrong answers don't count against you — retry each question until you get it right.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p>No track limit penalties or disqualifications</p>
                <p>Take your time to work through problems</p>
                <p>Perfect for learning new operations</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white border-b border-white/20 pb-2 mb-3">Realism Mode</h2>
              <p className="text-white text-sm leading-relaxed mb-2">
                Full Grand Prix distance with stricter rules.
              </p>
              <div className="text-white/50 text-sm space-y-1">
                <p>Must answer correctly to advance</p>
                <p>Additional AERO zones available</p>
                <p>Stricter penalty system</p>
                <p>Full lap count per circuit</p>
              </div>
            </section>
          </div>

          <div className="pt-8">
            <Link href="/garage">
              <button
                className="text-white/50 hover:text-white text-sm transition-colors"
                data-testid="button-return-garage"
              >
                ← Return to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
