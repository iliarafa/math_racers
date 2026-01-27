import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { ChevronLeft, Flag } from "lucide-react";

const regulations = [
  {
    title: "RACE",
    color: "#d4640f",
    description: "Each race consists of 20 sectors. Answer a math question correctly to advance through each sector and reach the finish line."
  },
  {
    title: "OVERTAKE (DRS)",
    color: "#22c741",
    description: "Complete a 3-answer warmup phase at the start of each race. After warmup, every 3 consecutive correct answers earns 1 OVERTAKE charge (maximum 1). You can only activate OVERTAKE when within 2 sectors of the bot - just like real DRS zones! Press OVERTAKE to freeze the opponent for 3 seconds."
  },
  {
    title: "ACTIVE AERO (ERS)",
    color: "#3b82f6",
    description: "Harvest energy by answering questions quickly - faster answers charge your energy meter more! Press AERO anytime you have energy to activate 2x sector boost mode. Energy drains over 5 seconds at full charge (proportionally less at lower energy). While active, correct answers advance 2 sectors. Warning: a wrong answer while AERO is active immediately depletes all energy!"
  },
  {
    title: "SECTORS",
    color: "#a855f7",
    description: "After each answer, your sector time is color-coded to show your performance. Purple means you set the fastest time for that sector (beating both your previous best and the bot). Green means you answered quickly (within 1.5x of the best time). Yellow indicates a slower response. Red appears when you give a wrong answer."
  },
  {
    title: "TRACK LIMITS",
    color: "#ff0000",
    description: "Wrong answers result in time penalties that increase with each mistake. Your first three mistakes add 2 seconds each. Mistakes four through six add 5 seconds each. Mistakes seven through ten add 10 seconds each. If you make 11 mistakes, you crash and receive a DNF (Did Not Finish)."
  },
  {
    title: "WEATHER",
    color: "#3b82f6",
    description: "Weather conditions affect the difficulty of math problems. Dry conditions use standard difficulty for your selected series. Wet conditions increase the difficulty with harder numbers. Random weather gives each circuit a specific chance of rain."
  },
  {
    title: "PRACTICE",
    color: "#eab308",
    description: "Practice mode removes all penalties and lets you answer unlimited questions. When you give a wrong answer, you see \"Try Again\" and can attempt the same problem until you solve it correctly."
  },
  {
    title: "REALISM MODE",
    color: "#2ec9ba",
    description: "Realism Mode extends your race to a full Grand Prix distance with realistic lap counts for each circuit. You must answer each question correctly to advance, making every sector count."
  }
];

export default function Regulations() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins} darkBackground lockViewport>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/garage">
              <button
                className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-neutral-800 rounded-full transition-colors text-white"
                data-testid="button-back-to-garage"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <Flag className="w-6 h-6 text-white" />
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white">Race Regulations</h1>
            </div>
          </div>

          <div className="space-y-4">
            {regulations.map((reg, index) => (
              <div
                key={index}
                className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-4"
              >
                <h3
                  className="font-bold mb-2 text-sm"
                  style={{ color: reg.color }}
                >
                  {reg.title}
                </h3>
                <p className="text-white text-sm leading-relaxed">
                  {reg.description}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Link href="/garage">
              <button
                className="flex items-center gap-2 px-4 min-h-11 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors text-sm"
                data-testid="button-return-garage"
              >
                <ChevronLeft className="w-4 h-4" />
                Return to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
