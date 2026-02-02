import { useState, Fragment } from "react";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { ChevronLeft, Grid3X3, Divide, Plus, Minus, Variable } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <h3 className="text-lg font-mono font-bold mb-2 text-red-400">MULTIPLICATION DATA MATRIX</h3>
        <p className="text-sm text-neutral-400 mb-4">Hover over any cell to highlight the row and column factors.</p>
      </div>
      
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid-container font-mono text-xs md:text-base" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(32px, 1fr))', gap: '2px', minWidth: '340px' }}>
          <div className="grid-header-corner bg-neutral-800 p-1.5 md:p-2 text-center font-bold text-neutral-500">×</div>
          {numbers.map(n => (
            <div 
              key={`header-${n}`} 
              className={cn(
                "grid-header bg-red-900/60 p-1.5 md:p-2 text-center font-bold text-red-300 transition-colors",
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
                  "grid-header bg-red-900/60 p-1.5 md:p-2 text-center font-bold text-red-300 transition-colors",
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
                      "p-1.5 md:p-2 text-center transition-all cursor-pointer border border-neutral-700",
                      isIntersection 
                        ? "bg-yellow-500 text-black font-bold scale-110 z-10 shadow-lg shadow-yellow-500/50" 
                        : isHighlighted 
                          ? "bg-neutral-700 text-white" 
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
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
  const factFamilies = [
    { mult1: "3 × 4 = 12", mult2: "4 × 3 = 12", div1: "12 ÷ 4 = 3", div2: "12 ÷ 3 = 4" },
    { mult1: "5 × 6 = 30", mult2: "6 × 5 = 30", div1: "30 ÷ 6 = 5", div2: "30 ÷ 5 = 6" },
    { mult1: "7 × 8 = 56", mult2: "8 × 7 = 56", div1: "56 ÷ 8 = 7", div2: "56 ÷ 7 = 8" },
    { mult1: "9 × 4 = 36", mult2: "4 × 9 = 36", div1: "36 ÷ 4 = 9", div2: "36 ÷ 9 = 4" },
    { mult1: "6 × 7 = 42", mult2: "7 × 6 = 42", div1: "42 ÷ 7 = 6", div2: "42 ÷ 6 = 7" },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-mono font-bold mb-2 text-blue-400">PIT STOP STRATEGY: FACT FAMILIES</h3>
        <p className="text-sm text-neutral-400">Division is the reverse of multiplication. If you know one, you know the other!</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {factFamilies.map((family, i) => (
          <div key={i} className="tech-card-glow">
            <div className="text-xs text-neutral-500 mb-2 font-mono">FACT FAMILY #{i + 1}</div>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div className="text-green-400">{family.mult1}</div>
              <div className="text-green-400">{family.mult2}</div>
              <div className="text-yellow-400">{family.div1}</div>
              <div className="text-yellow-400">{family.div2}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-mono font-bold mb-2 text-purple-400">QUICK TIP</h4>
        <p className="text-sm text-neutral-300">
          Think of division as "How many times does this number fit into that number?"<br/>
          Example: 12 ÷ 4 = ? means "How many 4s fit into 12?" Answer: 3
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
        <h3 className="text-lg font-mono font-bold mb-2 text-green-400">OVERTAKE MANEUVERS: NUMBER BONDS</h3>
        <p className="text-sm text-neutral-400">Master these number pairs to add faster than your rivals!</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {numberBonds.map((bond, i) => (
          <div key={i} className="tech-card-glow">
            <div className="text-center mb-3">
              <span className="text-2xl font-bold font-mono text-white bg-green-600 px-4 py-1 rounded">{bond.target}</span>
            </div>
            <div className="space-y-1">
              {bond.pairs.map(([a, b], j) => (
                <div key={j} className="flex justify-center items-center gap-2 text-sm font-mono">
                  <span className="text-blue-300 w-8 text-right">{a}</span>
                  <span className="text-neutral-500">+</span>
                  <span className="text-orange-300 w-8">{b}</span>
                  <span className="text-neutral-500">=</span>
                  <span className="text-green-400">{bond.target}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-mono font-bold mb-2 text-cyan-400">STRATEGY NOTES</h4>
        <ul className="text-sm text-neutral-300 space-y-1 list-disc list-inside">
          <li>Break big numbers into friendly pairs</li>
          <li>Add 9 by adding 10, then subtract 1</li>
          <li>Double numbers are easy: 6 + 6 = 12, so 6 + 7 = 13</li>
        </ul>
      </div>
    </div>
  );
}

function SubtractionContent() {
  const examples = [
    { problem: "15 - 7", strategy: "Count up from 7: 7 → 10 (3 steps), 10 → 15 (5 steps). Total: 8" },
    { problem: "23 - 9", strategy: "Subtract 10, add 1 back: 23 - 10 = 13, then 13 + 1 = 14" },
    { problem: "50 - 28", strategy: "Round: 50 - 30 = 20, but you subtracted 2 extra, so 20 + 2 = 22" },
    { problem: "100 - 63", strategy: "Work in parts: 100 - 60 = 40, then 40 - 3 = 37" },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-mono font-bold mb-2 text-orange-400">GAP ANALYSIS: SUBTRACTION STRATEGIES</h3>
        <p className="text-sm text-neutral-400">Calculate the gap between positions like a race engineer!</p>
      </div>
      
      <div className="grid gap-4">
        {examples.map((ex, i) => (
          <div key={i} className="tech-card-glow flex flex-col md:flex-row md:items-center gap-4">
            <div className="text-xl font-mono font-bold text-white bg-orange-600 px-4 py-2 rounded text-center min-w-[120px]">
              {ex.problem}
            </div>
            <div className="flex-1">
              <div className="text-xs text-neutral-500 mb-1 font-mono">STRATEGY</div>
              <div className="text-sm text-neutral-300">{ex.strategy}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-mono font-bold mb-2 text-pink-400">REMEMBER</h4>
        <p className="text-sm text-neutral-300">
          Subtraction tells you the "gap" or "difference" between two numbers.<br/>
          Think: "How far apart are these numbers?"
        </p>
      </div>
    </div>
  );
}

function VariablesContent() {
  const examples = [
    { equation: "x + 2 = 5", solution: "x = 3", explanation: "What number plus 2 equals 5? The mystery number is 3!" },
    { equation: "x - 4 = 10", solution: "x = 14", explanation: "What number minus 4 equals 10? It must be 14!" },
    { equation: "3 × x = 12", solution: "x = 4", explanation: "3 times what number equals 12? The answer is 4!" },
    { equation: "x ÷ 2 = 6", solution: "x = 12", explanation: "What number divided by 2 equals 6? It's 12!" },
  ];

  return (
    <div className="space-y-4">
      <div className="tech-card">
        <h3 className="text-lg font-mono font-bold mb-2 text-purple-400">THE X-FACTOR: SOLVING FOR UNKNOWNS</h3>
        <p className="text-sm text-neutral-400">
          The letter "x" (or any letter) is just a <span className="text-yellow-400">mystery number</span> waiting to be discovered!
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {examples.map((ex, i) => (
          <div key={i} className="tech-card-glow">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-lg font-mono font-bold text-white bg-purple-600 px-3 py-1 rounded">
                {ex.equation}
              </div>
              <div className="text-lg font-mono font-bold text-green-400">
                → {ex.solution}
              </div>
            </div>
            <p className="text-sm text-neutral-300">{ex.explanation}</p>
          </div>
        ))}
      </div>
      
      <div className="tech-card mt-6">
        <h4 className="text-md font-mono font-bold mb-3 text-yellow-400">RACE ENGINEER TIP</h4>
        <div className="space-y-2 text-sm text-neutral-300">
          <p>Think of <span className="text-purple-400 font-mono">x</span> like a missing piece in a puzzle:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>The equation is a balance scale - both sides must be equal</li>
            <li>To find x, do the opposite operation</li>
            <li>If x + 2 = 5, do 5 - 2 to find x</li>
            <li>If 3 × x = 12, do 12 ÷ 3 to find x</li>
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
    <GameLayout coins={state.coins} darkBackground lockViewport>
      <div className="strategy-view bg-black flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/garage">
              <button 
                className="min-w-11 min-h-11 flex items-center justify-center -ml-2 hover:bg-neutral-800 rounded-full transition-colors text-white" 
                data-testid="button-back-to-garage"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white font-mono">RACE STRATEGY & DATA</h1>
              <p className="text-xs text-neutral-400">Your complete math reference guide</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 min-h-11 min-w-11 rounded-lg font-mono text-xs md:text-sm transition-all",
                  activeTab === tab.id
                    ? "bg-white text-black shadow-lg shadow-white/20"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
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

          <div className="pt-6 border-t border-neutral-800">
            <Link href="/garage">
              <button 
                className="flex items-center gap-2 px-4 min-h-11 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors font-mono text-sm"
                data-testid="button-return-garage"
              >
                <ChevronLeft className="w-4 h-4" />
                Return to Garage
              </button>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .strategy-view {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        
        .tech-card {
          background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
        }
        
        .tech-card-glow {
          background: linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.95));
          border: 1px solid rgba(100, 100, 255, 0.3);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 0 15px rgba(100, 100, 255, 0.1), inset 0 0 30px rgba(100, 100, 255, 0.03);
          transition: all 0.3s ease;
        }
        
        .tech-card-glow:hover {
          border-color: rgba(100, 100, 255, 0.5);
          box-shadow: 0 0 25px rgba(100, 100, 255, 0.2), inset 0 0 30px rgba(100, 100, 255, 0.05);
        }
      `}</style>
    </GameLayout>
  );
}
