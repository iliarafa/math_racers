import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GameLayout } from "@/components/layout/GameLayout";

interface Article {
  id: string;
  title: string;
  description: string;
  details: string[];
  richDetails?: { color: string; label: string; text: string }[];
  table?: { title: string; headers: string[]; rows: string[][] };
}

interface Chapter {
  id: string;
  numeral: string;
  title: string;
  articles: Article[];
}

const chapters: Chapter[] = [
  {
    id: "chapter-1",
    numeral: "I",
    title: "Race Procedures",
    articles: [
      {
        id: "race",
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
        title: "Track Limits",
        description: "Each question allows up to 4 attempts.",
        details: [
          "Wrong answers show a track limits warning",
          "4th wrong attempt on the same question results in a crash (DNF)",
        ],
      },
      {
        id: "sectors",
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
        title: "Weather",
        description: "Weather conditions affect question difficulty.",
        details: [],
        richDetails: [
          { color: "text-black/70", label: "Dry", text: "standard difficulty" },
          { color: "text-black/70", label: "Wet", text: "increased difficulty" },
          { color: "text-black/70", label: "Random", text: "rain probability varies per circuit. In Realism Mode with Random weather, conditions alternate 3 to 5 times during the race" },
        ],
      },
    ],
  },
  {
    id: "chapter-2",
    numeral: "II",
    title: "Technical Systems",
    articles: [
      {
        id: "overtake",
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
        title: "Active Aero",
        description: "Engage AERO in designated zones for sector boosts.",
        details: [
          "Two activation zones in Standard Mode",
          "Five activation zones in Realism Mode",
        ],
      },
    ],
  },
  {
    id: "chapter-3",
    numeral: "III",
    title: "Race Formats",
    articles: [
      {
        id: "championship",
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
        id: "grand-prix",
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
        id: "realism",
        title: "Realism Mode",
        description: "Full Grand Prix distance with stricter rules.",
        details: [
          "Full lap count per circuit (44–78 laps)",
          "Five AERO zones instead of two",
        ],
      },
      {
        id: "free-practice",
        title: "Free Practice",
        description: "Free Practice is available to everyone — no purchase required. Select any math operation and race 100 questions.",
        details: [
          "Dynamic Difficulty — adjusts based on your speed and accuracy.",
          "No penalties — wrong answers don't count against you.",
          "Your mission — complete all 100 questions to submit your score to the Leaderboard.",
          "BOX — click to exit to the pits and log your current stint. Go back to the track to start a new one.",
          "~(laps / time) × accuracy × difficulty multiplier × 1000 (max 100,000)",
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
    ],
  },
  {
    id: "chapter-4",
    numeral: "IV",
    title: "Competition",
    articles: [
      {
        id: "multiplayer",
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
        id: "leaderboard",
        title: "Leaderboard",
        description: "Compete for the highest score on the Free Practice leaderboard.",
        details: [
          "Only Free Practice completions (100 questions) are submitted",
          "Filter entries by math operation",
          "Search for players by name",
        ],
      },
    ],
  },
  {
    id: "chapter-5",
    numeral: "V",
    title: "Reference",
    articles: [
      {
        id: "garage",
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
    ],
  },
];

function renderArticleContent(article: Article) {
  return (
    <>
      <p className="text-sm md:text-base leading-relaxed text-black/80 mb-3">
        {article.description}
      </p>

      {article.richDetails && (
        <div className="text-black/50 text-sm md:text-base space-y-1.5 mb-2">
          {article.richDetails.map((item, i) => (
            <p key={i}>
              <span className={item.color}>{item.label}</span> — {item.text}
            </p>
          ))}
        </div>
      )}

      {article.details.length > 0 && (
        <div className="text-black/50 text-sm md:text-base space-y-2">
          {article.details.map((detail, i) => {
            if (detail.startsWith("#")) {
              return (
                <p key={i} className="font-bold text-black text-xs uppercase tracking-wider mt-4 first:mt-0">
                  {detail.slice(1)}
                </p>
              );
            }
            if (detail.startsWith("~")) {
              return (
                <div key={i} className="bg-black/[0.03] border border-black/10 rounded-md px-3 py-2 font-mono text-xs md:text-sm text-black/60 text-center my-1">
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

      {article.table && (
        <div className="mt-3">
          <p className="text-black text-sm md:text-base font-bold mb-1">{article.table.title}</p>
          <table className="w-full text-sm md:text-base border-collapse border border-black/10">
            <thead>
              <tr className="text-left bg-black/[0.03]">
                {article.table.headers.map((h, i) => (
                  <th key={i} className="font-normal text-black/40 text-[10px] uppercase tracking-wider border border-black/10 px-3 py-1.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {article.table.rows.map((row, i) => (
                <tr key={i} className="text-black/50">
                  <td className="font-bold text-black border border-black/10 px-3 py-1.5">{row[0]}</td>
                  <td className="font-mono border border-black/10 px-3 py-1.5">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Regulations() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const top = el.offsetTop - container.offsetTop - 16;
      container.scrollTo({ top, behavior: "smooth" });
    }
  };

  let articleNum = 0;

  return (
    <GameLayout lockViewport hideHeader>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 pb-20 bg-white">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          {/* Title Block */}
          <div className="text-center mb-6">
            <h1
              className="text-xl md:text-2xl font-bold tracking-[0.25em] uppercase text-black"
              style={{ fontFamily: "Oxanium, sans-serif" }}
            >
              Technical Regulations
            </h1>
            <p
              className="text-xs tracking-widest uppercase text-black/40 mt-1"
              style={{ fontFamily: "Oxanium, sans-serif" }}
            >
              2026 Season
            </p>
          </div>

          <div className="border-t border-black/10 mb-6" />

          {/* Table of Contents */}
          <div className="mb-8 space-y-1.5">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => scrollToChapter(chapter.id)}
                className="block w-full text-left text-xs tracking-wider uppercase text-black/40 active:text-black transition-colors py-1"
                style={{ fontFamily: "Oxanium, sans-serif" }}
              >
                {chapter.numeral}. {chapter.title}
              </button>
            ))}
          </div>

          {/* Chapters */}
          {chapters.map((chapter) => (
            <div key={chapter.id} id={chapter.id} className="mt-10 first:mt-0">
              {/* Chapter Heading */}
              <div className="border-t border-black/10 pt-6 mb-4">
                <p
                  className="text-[10px] tracking-[0.3em] uppercase text-black/30"
                  style={{ fontFamily: "Oxanium, sans-serif" }}
                >
                  Chapter {chapter.numeral}
                </p>
                <p
                  className="text-sm md:text-base tracking-widest uppercase font-bold text-black"
                  style={{ fontFamily: "Oxanium, sans-serif" }}
                >
                  {chapter.title}
                </p>
              </div>

              {/* Articles */}
              <div className="divide-y divide-black/[0.06]">
                {chapter.articles.map((article) => {
                  articleNum++;
                  const currentNum = articleNum;
                  const isOpen = expandedId === article.id;

                  return (
                    <div key={article.id} className="py-4">
                      <div
                        onClick={() => setExpandedId(isOpen ? null : article.id)}
                        className="cursor-pointer active:opacity-60 transition-opacity"
                      >
                        <span
                          className="text-xs md:text-sm tracking-wider uppercase"
                          style={{ fontFamily: "Oxanium, sans-serif" }}
                        >
                          <span className="text-black/30">Art. {currentNum}</span>
                          <span className="text-black/20 mx-1.5">—</span>
                          <span className="text-black">{article.title}</span>
                        </span>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3">
                              {renderArticleContent(article)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Sticky bottom back button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm flex justify-center py-3 z-50"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Link href="/garage">
          <button
            className="transition-colors text-sm uppercase tracking-wider text-gray-400 hover:text-black"
            style={{ fontFamily: "Oxanium, sans-serif" }}
          >
            Back
          </button>
        </Link>
      </div>
    </GameLayout>
  );
}
