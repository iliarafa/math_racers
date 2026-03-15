import { useState, useRef, useEffect, Fragment } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Grid3X3, Divide, Plus, Minus, Variable } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "multiplication" | "division" | "addition" | "subtraction" | "variables";

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "addition", label: "Overtakes", icon: <Plus className="w-4 h-4" /> },
  { id: "subtraction", label: "Gaps", icon: <Minus className="w-4 h-4" /> },
  { id: "multiplication", label: "The Grid", icon: <Grid3X3 className="w-4 h-4" /> },
  { id: "division", label: "Pit Stops", icon: <Divide className="w-4 h-4" /> },
  { id: "variables", label: "X-Factor", icon: <Variable className="w-4 h-4" /> },
];

function MultiplicationGrid() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-bold mb-2 text-red-400 text-center">MULTIPLICATION DATA MATRIX</h3>
        <p className="text-sm text-neutral-400 mb-4 text-center">Hover over any cell to highlight the row and column factors.</p>
      </div>
      
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid-container text-xs md:text-base" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(32px, 1fr))', gap: '2px', minWidth: '340px' }}>
          <div className="grid-header-corner bg-neutral-200 p-1.5 md:p-2.5 text-center font-bold text-neutral-400">×</div>
          {numbers.map(n => (
            <div 
              key={`header-${n}`} 
              className={cn(
                "grid-header bg-red-100 p-1.5 md:p-2.5 text-center font-bold text-red-700 transition-colors",
                hoveredCell?.col === n && "bg-red-700 text-white"
              )}
            >
              {n}
            </div>
          ))}
          
          {numbers.map(row => (
            <Fragment key={row}>
              <div
                className={cn(
                  "grid-header bg-red-100 p-1.5 md:p-2.5 text-center font-bold text-red-700 transition-colors",
                  hoveredCell?.row === row && "bg-red-700 text-white"
                )}
              >
                {row}
              </div>
              {numbers.map(col => {
                const isHighlighted = hoveredCell?.row === row || hoveredCell?.col === col;
                const isIntersection = hoveredCell?.row === row && hoveredCell?.col === col;
                return (
                  <div
                    key={`cell-${row}-${col}`}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={cn(
                      "p-1.5 md:p-2.5 text-center transition-all cursor-pointer border border-neutral-200",
                      isIntersection
                        ? "bg-yellow-400 text-black font-bold scale-110 z-10 shadow-lg shadow-yellow-400/50"
                        : isHighlighted
                          ? "bg-neutral-200 text-black"
                          : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    )}
                    data-testid={`grid-cell-${row}-${col}`}
                  >
                    {row * col}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function DivisionContent() {
  const [selectedFamily, setSelectedFamily] = useState<{ product: number; facts: string[] } | null>(null);

  const factFamilies = [
    { product: 12, facts: ["3 × 4 = 12", "4 × 3 = 12", "12 ÷ 4 = 3", "12 ÷ 3 = 4"] },
    { product: 30, facts: ["5 × 6 = 30", "6 × 5 = 30", "30 ÷ 6 = 5", "30 ÷ 5 = 6"] },
    { product: 56, facts: ["7 × 8 = 56", "8 × 7 = 56", "56 ÷ 8 = 7", "56 ÷ 7 = 8"] },
    { product: 36, facts: ["9 × 4 = 36", "4 × 9 = 36", "36 ÷ 4 = 9", "36 ÷ 9 = 4"] },
    { product: 42, facts: ["6 × 7 = 42", "7 × 6 = 42", "42 ÷ 7 = 6", "42 ÷ 6 = 7"] },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-bold mb-2 text-blue-400 text-center">FACT FAMILIES</h3>
        <p className="text-sm text-neutral-400 text-center">Tap a number to see its fact family!</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {factFamilies.map((family, i) => (
          <div
            key={i}
            className="tech-card-glow text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => setSelectedFamily(family)}
          >
            <div className="font-bold text-lg text-neutral-800">{family.product}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedFamily && (
          <StepByStepModal
            problem={String(selectedFamily.product)}
            steps={selectedFamily.facts}
            onClose={() => setSelectedFamily(null)}
          />
        )}
      </AnimatePresence>

      <div className="tech-card mt-6">
        <h4 className="text-md font-bold mb-2 text-purple-400 text-center">QUICK TIP</h4>
        <p className="text-sm text-neutral-600">
          Division is the reverse of multiplication.<br/>
          12 ÷ 4 = ? means "How many 4s fit into 12?"
        </p>
      </div>
    </div>
  );
}

function AdditionContent() {
  const numberBonds = [
    { target: 10, pairs: [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]] },
    { target: 20, pairs: [[10, 10], [12, 8], [15, 5], [17, 3], [19, 1]] },
    { target: 100, pairs: [[50, 50], [25, 75], [30, 70], [40, 60], [45, 55]] },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-bold mb-2 text-green-600 text-center">NUMBER BONDS</h3>
        <p className="text-sm text-neutral-400 text-center">Master these number pairs to add faster than your rivals!</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {numberBonds.map((bond, i) => (
          <div key={i} className="tech-card-glow text-center">
            <div className="font-bold text-lg text-neutral-800 mb-2">{bond.target}</div>
            <div className="space-y-1 text-sm">
              {bond.pairs.map(([a, b], j) => (
                <div key={j} className="text-neutral-600 tabular-nums">{a} + {b}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-bold mb-2 text-cyan-400 text-center">STRATEGY NOTES</h4>
        <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
          <li>Break big numbers into friendly pairs</li>
          <li>Add 9 by adding 10, then subtract 1</li>
          <li>Double numbers are easy: 6 + 6 = 12, so 6 + 7 = 13</li>
        </ul>
      </div>
    </div>
  );
}

function StepByStepModal({ problem, steps, onClose }: { problem: string; steps: string[]; onClose: () => void }) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [cursorLine, setCursorLine] = useState(0);

  useEffect(() => {
    let stepIdx = 0;
    let charIdx = 0;
    const result: string[] = [];

    const interval = setInterval(() => {
      if (stepIdx >= steps.length) {
        setCursorLine(-1);
        clearInterval(interval);
        return;
      }

      const currentStep = steps[stepIdx];
      charIdx++;

      if (charIdx > currentStep.length) {
        stepIdx++;
        charIdx = 0;
        setCursorLine(stepIdx);
        if (stepIdx >= steps.length) {
          setCursorLine(-1);
          clearInterval(interval);
        }
        return;
      }

      result[stepIdx] = currentStep.slice(0, charIdx);
      setDisplayed([...result]);
    }, 80);

    return () => clearInterval(interval);
  }, [steps]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl p-6 w-full max-w-xs shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-2xl text-neutral-800 text-center mb-4">{problem}</div>
        <div className="text-base text-neutral-600 space-y-1 text-center min-h-[5rem]">
          {displayed.map((text, i) => (
            <div key={i}>
              {text}
              {i === cursorLine && <span className="animate-pulse ml-0.5">|</span>}
            </div>
          ))}
          {cursorLine >= 0 && displayed.length === 0 && (
            <div><span className="animate-pulse">|</span></div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

function SubtractionContent() {
  const [selectedExample, setSelectedExample] = useState<{ problem: string; steps: string[] } | null>(null);

  const examples = [
    { problem: "15 - 7", steps: ["Count up from 7", "7 → 10 = 3 steps", "10 → 15 = 5 steps", "Total: 8"] },
    { problem: "23 - 9", steps: ["Subtract 10", "23 - 10 = 13", "Add 1 back", "13 + 1 = 14"] },
    { problem: "50 - 28", steps: ["Round to nearest 10", "50 - 30 = 20", "Add back 2 extra", "20 + 2 = 22"] },
    { problem: "100 - 63", steps: ["Work in parts", "100 - 60 = 40", "40 - 3 = 37"] },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-bold mb-2 text-blue-400 text-center">SUBTRACTION STRATEGIES</h3>
        <p className="text-sm text-neutral-400 text-center">Tap a problem to see the strategy!</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {examples.map((ex, i) => (
          <div
            key={i}
            className="tech-card-glow text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => setSelectedExample(ex)}
          >
            <div className="font-bold text-lg text-neutral-800">{ex.problem}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedExample && (
          <StepByStepModal
            problem={selectedExample.problem}
            steps={selectedExample.steps}
            onClose={() => setSelectedExample(null)}
          />
        )}
      </AnimatePresence>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-bold mb-2 text-red-400 text-center">REMEMBER</h4>
        <p className="text-sm text-neutral-600">
          Subtraction tells you the "gap" or "difference" between two numbers.<br/>
          Think: "How far apart are these numbers?"
        </p>
      </div>
    </div>
  );
}

function VariablesContent() {
  const [selectedExample, setSelectedExample] = useState<{ equation: string; steps: string[] } | null>(null);

  const examples = [
    { equation: "x + 2 = 5", steps: ["What plus 2 equals 5?", "Do the opposite: 5 - 2", "x = 3"] },
    { equation: "x - 4 = 10", steps: ["What minus 4 equals 10?", "Do the opposite: 10 + 4", "x = 14"] },
    { equation: "3 × x = 12", steps: ["3 times what equals 12?", "Do the opposite: 12 ÷ 3", "x = 4"] },
    { equation: "x ÷ 2 = 6", steps: ["What divided by 2 equals 6?", "Do the opposite: 6 × 2", "x = 12"] },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-bold mb-2 text-purple-400 text-center">SOLVING FOR X</h3>
        <p className="text-sm text-neutral-400 text-center">Tap an equation to solve it step by step!</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {examples.map((ex, i) => (
          <div
            key={i}
            className="tech-card-glow text-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => setSelectedExample(ex)}
          >
            <div className="font-bold text-lg text-neutral-800">{ex.equation}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedExample && (
          <StepByStepModal
            problem={selectedExample.equation}
            steps={selectedExample.steps}
            onClose={() => setSelectedExample(null)}
          />
        )}
      </AnimatePresence>

      <div className="tech-card mt-6">
        <h4 className="text-md font-bold mb-3 text-amber-600 text-center">REMEMBER</h4>
        <div className="space-y-2 text-sm text-neutral-600">
          <p>To find x, do the <span className="font-bold">opposite</span> operation:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Addition and Subtraction</li>
            <li>Multiplication and Division</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StrategyGuide() {
  const { state } = useGameState();
  const [activeTab, setActiveTab] = useState<TabType>("multiplication");

  const renderContent = () => {
    switch (activeTab) {
      case "multiplication":
        return <MultiplicationGrid />;
      case "division":
        return <DivisionContent />;
      case "addition":
        return <AdditionContent />;
      case "subtraction":
        return <SubtractionContent />;
      case "variables":
        return <VariablesContent />;
    }
  };

  return (
    <GameLayout lockViewport backHref="/garage">
      <div className="strategy-view bg-white flex-1 overflow-y-auto p-4 md:p-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-lg md:text-3xl font-bold tracking-tight text-black">RACE STRATEGY & DATA</h1>
            <p className="text-xs text-neutral-400">Your complete math reference guide</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 min-h-11 rounded-lg text-xs md:text-base transition-all w-full",
                  activeTab === tab.id
                    ? "bg-black text-white shadow-lg shadow-black/20"
                    : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-black"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            {renderContent()}
          </div>

        </div>
      </div>


      <style>{`
        .strategy-view {
          font-family: Oxanium, sans-serif;
        }
        
        .tech-card {
          background: linear-gradient(135deg, rgba(245, 245, 245, 0.9), rgba(250, 250, 250, 0.95));
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 16px;
        }

        .tech-card-glow {
          background: linear-gradient(135deg, rgba(245, 245, 245, 0.9), rgba(250, 250, 250, 0.95));
          border: 1px solid rgba(100, 100, 255, 0.3);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 0 15px rgba(100, 100, 255, 0.08), inset 0 0 30px rgba(100, 100, 255, 0.02);
          transition: all 0.3s ease;
        }

        .tech-card-glow:hover {
          border-color: rgba(100, 100, 255, 0.5);
          box-shadow: 0 0 25px rgba(100, 100, 255, 0.15), inset 0 0 30px rgba(100, 100, 255, 0.03);
        }
      `}</style>
    </GameLayout>
  );
}
