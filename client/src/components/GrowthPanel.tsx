import { countMastered, summarizeByOperation, type FactStats } from "@/lib/factMastery";

const OPERATIONS = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Variables'];
const OXANIUM = { fontFamily: 'Oxanium, sans-serif' } as const;

/** Mastered vs still-learning facts per operation, from GameState.factStats. */
export function GrowthPanel({ factStats }: { factStats: FactStats }) {
  const summary = summarizeByOperation(factStats);
  const rows = OPERATIONS.filter((op) => summary[op]).map((op) => ({ op, ...summary[op] }));
  if (rows.length === 0) {
    return (
      <p className="text-sm text-white/40 font-mono" data-testid="growth-empty">
        Race to start tracking the facts you know.
      </p>
    );
  }
  return (
    <div className="space-y-4" data-testid="growth-panel">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl text-white" style={OXANIUM} data-testid="growth-mastered">{countMastered(factStats)}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/40">facts mastered</span>
      </div>
      {rows.map(({ op, mastered, learning }) => {
        const total = mastered + learning;
        const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return (
          <div key={op} data-testid={`growth-${op}`}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/80">{op}</span>
              <span className="text-white/40 font-mono">{mastered}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
              <div className="h-full bg-amber-400/70" style={{ width: `${100 - pct}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-white/40">Green facts are quick and reliable; amber ones are still being learned.</p>
    </div>
  );
}
