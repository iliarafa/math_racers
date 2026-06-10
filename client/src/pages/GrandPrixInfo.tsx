import { GameLayout } from "@/components/layout/GameLayout";
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import { getGrandPrixHistory, PodiumEntry, QualiEntry } from "@/lib/grandPrixHistory";

const RACE_POS_LABELS = ['P1', 'P2', 'P3'] as const;
const QUALI_POS_LABELS = ['POLE', '2ND', '3RD'] as const;

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-white/10">
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{label}</span>
      <span className="text-sm text-white text-right" style={{ fontFamily: 'Oxanium, sans-serif' }}>
        {value}
      </span>
    </div>
  );
}

function ResultTable({
  title,
  posLabels,
  rows,
}: {
  title: string;
  posLabels: readonly string[];
  rows: readonly (PodiumEntry | QualiEntry)[];
}) {
  return (
    <section className="mt-8">
      <h2
        className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3"
        style={{ fontFamily: 'Oxanium, sans-serif' }}
      >
        {title}
      </h2>
      <div>
        <div className="grid grid-cols-[3rem_1fr_6rem_5.5rem] gap-2 px-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-mono">
          <span>Pos</span>
          <span>Driver</span>
          <span>Team</span>
          <span className="text-right">Time</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_1fr_6rem_5.5rem] gap-2 px-2 py-2 text-sm border-b border-white/5"
          >
            <span className="text-white/60 font-mono text-xs leading-5">{posLabels[i]}</span>
            <span className="text-white">{row.name}</span>
            <span className="text-white/60 text-xs leading-5">{row.team}</span>
            <span className="text-white/80 font-mono text-xs text-right leading-5">
              {row.time ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function GrandPrixInfo() {
  const gp = CURRENT_GRAND_PRIX;
  const history = getGrandPrixHistory(gp.circuitId);

  return (
    <GameLayout hideGarageButton lockViewport backHref="/game" darkBackground>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
        <div className="max-w-2xl md:max-w-3xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-6">
            <div
              className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
            >
              {`Round ${gp.round}`}
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1
                className="text-3xl md:text-4xl font-bold tracking-wider text-white"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                {gp.name}
              </h1>
              <img
                src={gp.flagImage}
                alt={`${gp.country} flag`}
                className="h-6 w-9 object-cover rounded-sm"
              />
            </div>
            {history && (
              <p
                className="text-sm text-white/60 uppercase tracking-widest"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                {history.officialName}
              </p>
            )}
          </div>

          {/* Track Map */}
          <div className="flex items-center justify-center py-4 md:py-8 mb-4">
            {history?.detailMapImage ? (
              <img
                src={history.detailMapImage}
                alt={`${gp.name} detailed circuit map`}
                className="h-48 md:h-72 object-contain"
                style={{ maxWidth: '560px' }}
              />
            ) : (
              <img
                src={gp.trackImage}
                alt={`${gp.name} circuit map`}
                className="h-40 md:h-64 object-contain"
                style={{ maxWidth: '420px', filter: 'invert(1)' }}
              />
            )}
          </div>

          {history ? (
            <>
              {/* Facts grid */}
              <section className="mt-2">
                <h2
                  className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  Circuit Facts
                </h2>
                <div className="rounded-lg bg-white/5 px-4 py-2">
                  <FactRow label="First Held" value={String(history.firstHeld)} />
                  <FactRow label="Length" value={history.trackLength} />
                  <FactRow label="Race Laps" value={String(history.laps)} />
                  <FactRow
                    label="Lap Record"
                    value={`${history.lapRecord.time} — ${history.lapRecord.driver} (${history.lapRecord.year})`}
                  />
                  <FactRow
                    label="Most Wins"
                    value={`${history.mostWins.driver} (${history.mostWins.count})`}
                  />
                </div>
              </section>

              {/* Last year results */}
              <ResultTable
                title={`${history.lastYear.season} Race Podium`}
                posLabels={RACE_POS_LABELS}
                rows={history.lastYear.race}
              />
              <ResultTable
                title={`${history.lastYear.season} Qualifying Top 3`}
                posLabels={QUALI_POS_LABELS}
                rows={history.lastYear.quali}
              />

              {/* History summary */}
              <section className="mt-10">
                <h2
                  className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  About the Circuit
                </h2>
                <p
                  className="text-sm leading-relaxed text-white/70"
                  style={{ fontFamily: 'Oxanium, sans-serif' }}
                >
                  {history.summary}
                </p>
              </section>
            </>
          ) : (
            <div className="rounded-lg bg-white/5 px-6 py-8 text-center">
              <p
                className="text-sm text-white/60"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
              >
                Detailed information for this circuit is coming soon.
              </p>
            </div>
          )}

        </div>
      </div>
    </GameLayout>
  );
}
