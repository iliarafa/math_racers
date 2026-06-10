import { useState } from "react";
import { GameLayout } from "@/components/layout/GameLayout";
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import { getGrandPrixHistory, PodiumEntry, QualiEntry } from "@/lib/grandPrixHistory";

const COLLAPSED_ROWS = 3;

const TEAM_COLORS: Record<string, string> = {
  'McLaren':       '#FF8000',
  'Ferrari':       '#E8002D',
  'Mercedes':      '#27F4D2',
  'Red Bull':      '#4781D7',
  'Racing Bulls':  '#6692FF',
  'Alpine':        '#00A1E8',
  'Aston Martin':  '#229971',
  'Williams':      '#64C4FF',
  'Kick Sauber':   '#52E252',
  'Haas':          '#B6BABD',
};
const FALLBACK_TEAM_COLOR = 'rgba(255,255,255,0.6)';
const teamColor = (team: string) => TEAM_COLORS[team] ?? FALLBACK_TEAM_COLOR;

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{label}</span>
      <span className="text-sm text-white text-right" style={{ fontFamily: 'Oxanium, sans-serif' }}>
        {value}
      </span>
    </div>
  );
}

function ResultTable({
  title,
  rows,
}: {
  title: string;
  rows: readonly (PodiumEntry | QualiEntry)[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = rows.length > COLLAPSED_ROWS;
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <section className="mt-8">
      <h2
        className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3"
        style={{ fontFamily: 'Oxanium, sans-serif' }}
      >
        {title}
      </h2>
      <div className="rounded-lg bg-black px-4 py-2">
        <div className="grid grid-cols-[3rem_1fr_6rem_5.5rem] gap-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-mono">
          <span>Pos</span>
          <span>Driver</span>
          <span>Team</span>
          <span className="text-right">Time</span>
        </div>
        {visibleRows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_1fr_6rem_5.5rem] gap-2 py-3 text-sm"
          >
            <span className="text-white/60 font-mono text-xs leading-5">{`P${i + 1}`}</span>
            <span className="text-white">{row.name}</span>
            <span className="text-xs leading-5" style={{ color: teamColor(row.team) }}>{row.team}</span>
            <span className="text-white/80 font-mono text-xs text-right leading-5">
              {row.time ?? '—'}
            </span>
          </div>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="w-full mt-2 py-3 text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-white/80 transition-colors border-t border-white/10"
            style={{ fontFamily: 'Oxanium, sans-serif' }}
          >
            {expanded ? 'Show less' : `Show all (${rows.length})`}
          </button>
        )}
      </div>
    </section>
  );
}

export default function GrandPrixInfo() {
  const gp = CURRENT_GRAND_PRIX;
  const history = getGrandPrixHistory(gp.circuitId);

  return (
    <GameLayout hideLogo hideGarageButton lockViewport backHref="/game" darkBackground>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
        <div className="max-w-2xl md:max-w-3xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-8">
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
                <div className="rounded-lg bg-black px-4 py-2">
                  <FactRow label="First Held" value={String(history.firstHeld)} />
                  <FactRow label="Length" value={history.trackLength} />
                  <FactRow label="Race Laps" value={String(history.laps)} />
                  <FactRow
                    label="Lap Record"
                    value={`${history.lapRecord.time} — ${history.lapRecord.driver} (${history.lapRecord.year})`}
                  />
                  <FactRow
                    label="Most Wins"
                    value={`${history.mostWins.driver} — ${history.mostWins.count} wins`}
                  />
                </div>
              </section>

              {/* Last year results */}
              <ResultTable
                title={`${history.lastYear.season} Race Results`}
                rows={history.lastYear.race}
              />
              <ResultTable
                title={`${history.lastYear.season} Qualifying Results`}
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
