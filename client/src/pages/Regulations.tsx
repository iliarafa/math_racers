import { useState } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";

const sections = [
  {
    id: "free-practice",
    label: "Free Practice",
    title: "Free Practice",
    description: "Free Practice is available to everyone — no purchase required. Select any math operation and race 100 questions.",
    details: [
      "Tap Free Practice on the mode select screen, then pick your operation",
      "Difficulty adjusts dynamically based on your speed and accuracy",
      "No penalties — wrong answers don't count against you",
      "Complete all 100 questions to submit your score to the Leaderboard",
      "End your session early at any time — only 100-question completions count for the Leaderboard",
      "~(laps / time) × accuracy × difficulty multiplier × 1000 (max 100,000)",
      "Name prompt appears on your first Leaderboard submission (max 20 characters)",
    ],
    table: {
      title: "Difficulty multipliers",
      headers: ["Series", "Multiplier"],
      rows: [
        ["Karting", "1.0×"],
        ["F3", "1.5×"],
        ["F2", "2.0×"],
        ["F1", "3.0×"],
      ],
    },
  },
  {
    id: "race",
    label: "Race",
    title: "Race",
    description: "Answer 20 math questions correctly to cross the finish line. In Realism Mode, races use full Grand Prix distances (44–78 laps per circuit).",
    details: [
      "#Circuits",
      "SPA — Addition",
      "Monaco — Subtraction",
      "Monza — Multiplication",
      "Suzuka — Division",
      "Silverstone — Variables / Algebra",
      "#Series",
      "Karting (ages 6–8) — numbers 1 to 10",
      "F3 (ages 8–10) — numbers 10 to 50",
      "F2 (ages 10–12) — numbers 20 to 100",
      "F1 (ages 12+) — numbers 50 to 200",
    ],
  },
  {
    id: "track-limits",
    label: "Track Limits",
    title: "Track Limits",
    description: "Each question allows up to 4 attempts.",
    details: [
      "Wrong answers show a track limits warning",
      "4th wrong attempt on the same question results in a crash (DNF)",
    ],
  },
  {
    id: "sectors",
    label: "Sectors",
    title: "Sectors",
    description: "Answer times are color-coded based on your performance.",
    details: [],
    richDetails: [
      { color: "text-purple-400", label: "Purple", text: "fastest overall" },
      { color: "text-green-400", label: "Green", text: "quick response" },
      { color: "text-yellow-400", label: "Yellow", text: "slower response" },
      { color: "text-red-400", label: "Red", text: "incorrect answer" },
    ],
  },
  {
    id: "weather",
    label: "Weather",
    title: "Weather",
    description: "Weather conditions affect question difficulty.",
    details: [],
    richDetails: [
      { color: "text-black/70", label: "Dry", text: "standard difficulty" },
      { color: "text-black/70", label: "Wet", text: "increased difficulty" },
      { color: "text-black/70", label: "Random", text: "rain probability varies per circuit. In Realism Mode with Random weather, conditions alternate 3 to 5 times during the race" },
    ],
  },
  {
    id: "overtake",
    label: "Overtake",
    title: "Overtake",
    description: "Build energy by answering correctly. Faster answers charge more energy.",
    details: [
      "Activates when behind and within two sectors of your opponent",
      "2x progress per correct answer while active",
      "Harder questions while active",
      "A wrong answer depletes all energy immediately",
    ],
  },
  {
    id: "active-aero",
    label: "Active Aero",
    title: "Active Aero",
    description: "Engage AERO in designated zones for sector boosts.",
    details: [
      "Two activation zones in Standard Mode",
      "Five activation zones in Realism Mode",
    ],
  },
  {
    id: "championship",
    label: "Championship",
    title: "Championship",
    description: "Progress through the series by championing circuits.",
    details: [
      "Beat the bot to champion a circuit at your current series",
      "Championing a circuit unlocks it at the next series",
      "A new series unlocks when you champion at least one circuit at the previous series",
      "Progression: Karting → F3 → F2 → F1",
    ],
  },
  {
    id: "practice-mode",
    label: "Practice Mode",
    title: "Practice Mode",
    description: "A pressure-free environment within Career mode to sharpen your skills on any circuit.",
    details: [
      "100-question sessions that loop until you stop",
      "No track limit penalties or disqualifications",
      "No series or circuit locks — practice any circuit at any difficulty",
      "Power-ups still work in practice",
      "No Leaderboard submission",
    ],
  },
  {
    id: "realism",
    label: "Realism",
    title: "Realism Mode",
    description: "Full Grand Prix distance with stricter rules.",
    details: [
      "Full lap count per circuit (44–78 laps)",
      "Five AERO zones instead of two",
    ],
  },
  {
    id: "grand-prix",
    label: "Grand Prix",
    title: "Grand Prix",
    description: "A full race weekend at Melbourne with three sequential phases.",
    details: [
      "Select your math operation, then progress through Practice, Qualifying, and Race Day",
      "Practice (30 questions) — dynamic difficulty adjusts as you go",
      "Qualifying (20 questions) — difficulty locks at the level reached in Practice and determines pole position",
      "Race Day (full simulation length) — pole position grants a 2-sector head start on your first correct answer",
      "Power-ups are only active during Race Day",
    ],
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    title: "Leaderboard",
    description: "Compete for the highest score on the Free Practice leaderboard.",
    details: [
      "Only Free Practice completions (100 questions) are submitted",
      "Filter entries by math operation",
      "Search for players by name",
    ],
  },
  {
    id: "multiplayer",
    label: "Multiplayer",
    title: "Multiplayer",
    description: "Race 1v1 against another player using 4-digit room codes.",
    details: [
      "Host creates a room and shares the code",
      "Guest joins with the code",
      "Winner is determined by fewer mistakes, then by faster time",
      "Power-ups are available in multiplayer",
    ],
  },
  {
    id: "garage",
    label: "Garage",
    title: "Garage",
    description: "Your dashboard for settings, stats, and navigation. Tap buttons to toggle settings — green icon means active.",
    details: [
      "Sound — toggle game audio",
      "Realism — toggle simulation distances and extra AERO zones",
      "Power-Ups — toggle OVERTAKE and AERO systems",
      "Reflex — F1-style reaction time test",
      "Racer Log — your race history grouped by series",
      "Leaderboard — Free Practice standings",
      "Regulations — rules and guide (this page)",
      "Strategy — math reference guide with tips for each operation",
      "Reset Career — wipes all progress (requires confirmation)",
    ],
  },
  {
    id: "reaction-test",
    label: "Reaction Test",
    title: "Reaction Test",
    description: "Test your reflexes with an F1-style 5-light start sequence.",
    details: [
      "Wait for the lights to go out, then tap as fast as you can",
      "Tapping before the green light is a jump start (disqualified)",
      "Perfect (under 0.2s), Excellent (under 0.3s), Good (under 0.4s), Average (under 0.5s), Slow (over 0.5s)",
    ],
  },
  {
    id: "strategy-guide",
    label: "Strategy",
    title: "Strategy Guide",
    description: "A math reference guide with tabs for each operation.",
    details: [
      "Addition — number bonds and strategies",
      "Subtraction — counting up and rounding techniques",
      "Multiplication — interactive times table",
      "Division — fact families and inverse relationships",
      "Variables — solving for unknowns with balance method",
    ],
  },
];

export default function Regulations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <GameLayout lockViewport hideHeader>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-20 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-black mb-8 text-center" style={{ fontFamily: 'Oxanium, sans-serif' }}>Regulations</h1>

          <div className="divide-y divide-black/10">
            {sections.map((section) => {
              const isOpen = expandedId === section.id;
              return (
                <div key={section.id} className="py-4">
                  <div
                    onClick={() => setExpandedId(isOpen ? null : section.id)}
                    className="cursor-pointer active:opacity-60 transition-opacity"
                  >
                    <span className="text-xs uppercase tracking-widest text-black" style={{ fontFamily: 'Oxanium, sans-serif' }}>{section.label}</span>
                  </div>
                  {isOpen && (
                    <div className="mt-3">
                      <p className="text-black text-sm md:text-base leading-relaxed mb-2">{section.description}</p>
                      {"richDetails" in section && section.richDetails && (
                        <div className="text-black/50 text-sm md:text-base space-y-1 mb-2">
                          {section.richDetails.map((item, i) => (
                            <p key={i}><span className={item.color}>{item.label}</span> — {item.text}</p>
                          ))}
                        </div>
                      )}
                      {section.details.length > 0 && (
                        <div className="text-black/50 text-sm md:text-base space-y-1">
                          {section.details.map((detail, i) => {
                            if (detail.startsWith("#")) {
                              return (
                                <p key={i} className="font-bold text-black text-sm md:text-base mt-2 first:mt-0">
                                  {detail.slice(1)}
                                </p>
                              );
                            }
                            if (detail.startsWith("~")) {
                              return (
                                <div key={i} className="bg-black/5 rounded-lg px-3 py-2 font-mono text-xs md:text-sm text-black/70 text-center">
                                  {detail.slice(1)}
                                </div>
                              );
                            }
                            const parts = detail.split(" — ");
                            if (parts.length >= 2) {
                              return (
                                <p key={i}>
                                  <span className="font-bold text-black">{parts[0]}</span>
                                  {" — "}{parts.slice(1).join(" — ")}
                                </p>
                              );
                            }
                            return <p key={i}>{detail}</p>;
                          })}
                        </div>
                      )}
                      {"table" in section && section.table && (
                        <div className="mt-2">
                          <p className="text-black text-sm md:text-base font-bold mb-1">{section.table.title}</p>
                          <table className="w-full text-sm md:text-base border-collapse border border-black/15">
                            <thead>
                              <tr className="text-black/50 text-left">
                                {section.table.headers.map((h: string, i: number) => (
                                  <th key={i} className="font-normal border border-black/15 px-3 py-1">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {section.table.rows.map((row: string[], i: number) => (
                                <tr key={i} className="text-black/50">
                                  <td className="font-bold text-black border border-black/15 px-3 py-1">{row[0]}</td>
                                  <td className="font-mono border border-black/15 px-3 py-1">{row[1]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
