import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { ChevronLeft, ChevronDown, Flag } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const regulations = [
  {
    title: "RACE",
    color: "#d4640f",
    summary: "Answer 20 math questions correctly to cross the finish line.",
    details: ["Each correct answer advances you one sector"]
  },
  {
    title: "OVERTAKE",
    color: "#22c741",
    summary: "Build energy by answering correctly. Faster answers charge more energy.",
    details: [
      "Activates when within two sectors of your opponent"
    ]
  },
  {
    title: "ACTIVE AERO",
    color: "#3b82f6",
    summary: "Engage AERO in designated zones for sector boosts.",
    details: [
      "There are two activation zones in Standard Mode and five in Realism Mode"
    ]
  },
  {
    title: "SECTORS",
    color: "#a855f7",
    summary: "Answer times are color-coded based on your performance.",
    details: [
      "Purple: fastest overall",
      "Green: quick response",
      "Yellow: slower response",
      "Red: incorrect answer"
    ]
  },
  {
    title: "TRACK LIMITS",
    color: "#ff0000",
    summary: "Wrong answers trigger warnings and time penalties.",
    details: [
      "Warnings come first, then time penalties",
      "Too many mistakes results in disqualification"
    ]
  },
  {
    title: "WEATHER",
    color: "#3b82f6",
    summary: "Weather conditions affect question difficulty.",
    details: [
      "Dry: standard difficulty",
      "Wet: increased difficulty",
      "Random: conditions may change mid-race"
    ]
  },
  {
    title: "PRACTICE",
    color: "#eab308",
    summary: "No penalties. Retry questions until correct.",
    details: ["No time pressure or penalties applied"]
  },
  {
    title: "REALISM MODE",
    color: "#2ec9ba",
    summary: "Full Grand Prix distance with stricter rules.",
    details: [
      "Must answer correctly to advance",
      "Additional AERO zones available",
      "Stricter penalty system",
      "Full lap count per circuit"
    ]
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
              <Collapsible key={index} className="bg-black border border-[#333] rounded-2xl">
                <CollapsibleTrigger className="w-full p-4 flex items-start justify-between text-left group">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1" style={{ color: reg.color }}>
                      {reg.title}
                    </h3>
                    <p className="text-white text-sm leading-relaxed">{reg.summary}</p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-200 mt-1 ml-2 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-[#333] pt-3">
                      {reg.details.length === 1 ? (
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {reg.details[0]}
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {reg.details.map((item, i) => (
                            <li key={i} className="text-gray-400 text-sm flex gap-2">
                              <span className="text-gray-600">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
