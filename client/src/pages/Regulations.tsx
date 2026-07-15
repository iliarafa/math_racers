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
          "#Difficulty",
          "Four levels set the number ranges for questions:",
          "Karting — numbers 1 to 10",
          "F3 — numbers 10 to 50",
          "F2 — numbers 20 to 100",
          "F1 — numbers 50 to 200",
          "Free Practice, Lane Racer, and Multiplayer let you choose Adaptive (default) or Locked to one of those levels before you start.",
          "Grand Prix Practice is always Adaptive — there is no Adaptive/Locked toggle. Qualifying and Race Day use the level achieved in Practice.",
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
          { color: "text-purple-400", label: "Purple", text: "personal best for that sector (race) or faster than half the expected time (practice)" },
          { color: "text-green-400", label: "Green", text: "correct and faster than the target time" },
          { color: "text-yellow-400", label: "Yellow", text: "correct but slower than the target time" },
          { color: "text-red-400", label: "Red", text: "required a retry on that question" },
        ],
      },
      {
        id: "weather",
        title: "Weather",
        description: "Weather conditions affect question difficulty.",
        details: [],
        richDetails: [
          { color: "text-white/70", label: "Dry", text: "standard difficulty" },
          { color: "text-white/70", label: "Wet", text: "bumps questions half a difficulty level harder" },
          { color: "text-white/70", label: "Random", text: "rain probability varies per circuit. In Realism Mode with Random weather, conditions alternate 3 to 5 times during the race" },
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
          "Activates when behind and within two sectors of your opponent (always available in Practice)",
          "2× progress per correct answer while active",
          "Questions are 1.5× harder (half a difficulty level)",
          "In wet weather, the difficulty boost stacks — wet + OVERTAKE = full difficulty level up",
          "Energy drains over time once activated (100% energy = 5 seconds)",
          "Tap again to deactivate early and preserve remaining energy",
          "A wrong answer depletes all energy immediately",
          "Disabled once your opponent finishes the race",
        ],
      },
      {
        id: "active-aero",
        title: "Active Aero",
        description: "Engage AERO in designated zones for a 2× sector boost per correct answer.",
        details: [
          "Two activation zones in Standard Mode (at 25% and 65% of race)",
          "Five activation zones in Realism Mode (at 15%, 30%, 50%, 70%, 85%)",
          "Each zone lasts for 3 questions",
          "A wrong answer while AERO is active deactivates it",
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
        id: "grand-prix",
        title: "Grand Prix",
        description: "A full race weekend at the Circuit Gilles-Villeneuve with three sequential phases.",
        details: [
          "Select your math operation, then progress through Practice, Qualifying, and Race Day",
          "Practice (30 questions) — always Adaptive; difficulty adjusts as you go (no Adaptive/Locked toggle)",
          "Qualifying (20 questions) — difficulty locks at the level reached in Practice and determines pole position",
          "Race Day (full simulation length) — uses the Practice lock; pole position grants a 2-sector head start on your first correct answer",
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
          "Adaptive (default) — difficulty adjusts from your speed and accuracy (starts at Karting).",
          "Locked — pick Karting / F3 / F2 / F1; level stays fixed for the session (no promotion or demotion).",
          "No penalties — wrong answers don't count against you.",
          "Your mission — complete all 100 questions to submit your score to the Leaderboard.",
          "BOX — click to exit to the pits and log your current stint. Go back to the track to start a new one.",
          "~(questions / time) × accuracy × difficulty multiplier × 1000 (max 100,000)",
        ],
        table: {
          title: "Difficulty multipliers",
          headers: ["Level", "Multiplier"],
          rows: [
            ["Karting", "1.0×"],
            ["F3", "1.5×"],
            ["F2", "2.0×"],
            ["F1", "3.0×"],
          ],
        },
      },
      {
        id: "lane-racer",
        title: "Lane Racer",
        description: "Arcade lane racing — pick the correct answer lane as numbers scroll toward you.",
        details: [
          "Choose track, team, operation, and level before you start",
          "Level — Adaptive (default) or Locked Karting / F3 / F2 / F1; Adaptive adjusts during the race, Locked stays fixed",
          "Chase Cam — optional 3D chase view",
          "Finish the race to submit your score to the Lane Racer leaderboard",
        ],
      },
      /* Deploy/Harvest regulation — archived, re-enable later */
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
          "Both players race the same set of questions",
          "Host sets Adaptive (default) or Locked Karting / F3 / F2 / F1 for the room — one shared difficulty track",
          "Guest must tap Ready before the host can start; host difficulty changes clear Ready",
          "Real-time progress visible during the race",
          "Host can toggle power-ups on or off before starting",
          "Winner is determined by fewer mistakes, then by faster time",
        ],
      },
      {
        id: "leaderboard",
        title: "Leaderboard",
        description: "Compete for the highest scores on the Free Practice and Grand Prix leaderboards.",
        details: [
          "#Free Practice",
          "Complete all 100 questions to submit your score",
          "Filter entries by math operation",
          "Search for players by name",
          "#Grand Prix",
          "Race Day completions are submitted to the Grand Prix leaderboard",
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
          "Reset — wipes all progress (requires confirmation)",
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
      <p className="text-sm md:text-base leading-relaxed text-white/80 mb-3">
        {article.description}
      </p>

      {article.richDetails && (
        <div className="text-white/60 text-sm md:text-base space-y-1.5 mb-2">
          {article.richDetails.map((item, i) => (
            <p key={i}>
              <span className={item.color}>{item.label}</span> — {item.text}
            </p>
          ))}
        </div>
      )}

      {article.details.length > 0 && (
        <div className="text-white/60 text-sm md:text-base space-y-2">
          {article.details.map((detail, i) => {
            if (detail.startsWith("#")) {
              return (
                <p key={i} className="font-bold text-white text-xs uppercase tracking-wider mt-4 first:mt-0">
                  {detail.slice(1)}
                </p>
              );
            }
            if (detail.startsWith("~")) {
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 font-mono text-xs md:text-sm text-white/60 text-center my-1">
                  {detail.slice(1)}
                </div>
              );
            }
            const parts = detail.split(" — ");
            if (parts.length >= 2) {
              return (
                <p key={i}>
                  <span className="font-bold text-white">{parts[0]}</span>
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
          <p className="text-white text-sm md:text-base font-bold mb-1">{article.table.title}</p>
          <table className="w-full text-sm md:text-base border-collapse">
            <thead>
              <tr className="text-left bg-white/5">
                {article.table.headers.map((h, i) => (
                  <th key={i} className="font-normal text-white/60 text-[10px] uppercase tracking-wider border border-white/10 px-3 py-1.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {article.table.rows.map((row, i) => (
                <tr key={i} className="text-white/60">
                  <td className="font-bold text-white border border-white/10 px-3 py-1.5">{row[0]}</td>
                  <td className="font-mono border border-white/10 px-3 py-1.5">{row[1]}</td>
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
    <GameLayout lockViewport backHref="/garage" darkBackground>
      {/* Fixed Title Block */}
      <div className="shrink-0 px-6 md:px-10 pt-6 pb-4 text-center">
        <h1
          className="text-xl md:text-2xl font-bold tracking-[0.25em] uppercase text-white"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          Technical Regulations
        </h1>
        <p
          className="text-xs tracking-widest uppercase text-white/60 mt-1"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          2026 Season
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-10 pb-20">
        <div className="max-w-2xl md:max-w-4xl mx-auto">

          {/* Table of Contents */}
          <div className="mb-8 space-y-1.5">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => scrollToChapter(chapter.id)}
                className="block w-full text-left text-xs tracking-wider uppercase text-white/60 active:text-white transition-colors py-1"
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
              <div className="pt-6 mb-4">
                <p
                  className="text-[10px] tracking-[0.3em] uppercase text-white/50"
                  style={{ fontFamily: "Oxanium, sans-serif" }}
                >
                  Chapter {chapter.numeral}
                </p>
                <p
                  className="text-lg md:text-xl tracking-widest uppercase font-bold text-white"
                  style={{ fontFamily: "Oxanium, sans-serif" }}
                >
                  {chapter.title}
                </p>
              </div>

              {/* Articles */}
              <div className="">
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
                          <span className="text-white/50">Art. {currentNum}</span>
                          <span className="text-white/20 mx-1.5">—</span>
                          <span className="text-white">{article.title}</span>
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

    </GameLayout>
  );
}
