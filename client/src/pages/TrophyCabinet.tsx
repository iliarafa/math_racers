import { useEffect } from "react";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import { BADGES, SEASON_ROUNDS, seasonSlots, type Trophy } from "@/lib/trophies";
import { BadgeTile } from "@/components/BadgeTile";
import { DailyStreakCard } from "@/components/DailyStreakCard";
import { GrowthPanel } from "@/components/GrowthPanel";
import { TIER_COLORS } from "@/components/RewardStrip";
import { cn } from "@/lib/utils";

const OXANIUM = { fontFamily: 'Oxanium, sans-serif' } as const;

function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3 pb-2">
      <h2 className="text-xs font-bold tracking-widest uppercase text-white/40">{children}</h2>
      {aside && <span className="text-xs text-white/40 font-mono">{aside}</span>}
    </div>
  );
}

function TrophyTile({ round, trophy, current }: { round: number; trophy?: Trophy; current: boolean }) {
  if (!trophy) {
    return (
      <div
        className={cn(
          'aspect-square rounded-md flex flex-col items-center justify-center',
          current ? 'border border-dashed border-white/40 bg-white/5' : 'bg-white/5'
        )}
        style={OXANIUM}
        data-testid={`trophy-slot-${round}`}
      >
        <span className="text-[10px] text-white/30">R{round}</span>
        {current && <span className="mt-0.5 text-[7px] uppercase tracking-widest text-white/50">This week</span>}
      </div>
    );
  }
  const color = TIER_COLORS[trophy.tier];
  return (
    <div
      className="aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 px-0.5"
      style={{ ...OXANIUM, backgroundColor: `${color}26`, border: `1px solid ${color}80` }}
      title={`${trophy.name} · ${trophy.tier} · ${trophy.operation}`}
      data-testid={`trophy-slot-${round}`}
      data-tier={trophy.tier}
    >
      <span className="text-[9px] leading-none" style={{ color }}>R{trophy.round}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-white leading-tight text-center">{trophy.name}</span>
      <span className="text-[8px] uppercase tracking-widest" style={{ color }}>{trophy.tier}</span>
    </div>
  );
}

/** The trophy cabinet: the daily streak, this season's weekends, badges and fact growth. Opening it marks rewards seen. */
export default function TrophyCabinet() {
  const { state, markRewardsSeen } = useGameState();
  useEffect(() => {
    markRewardsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const season = CURRENT_GRAND_PRIX.season;
  const slots = seasonSlots(state.trophies, season, SEASON_ROUNDS);
  const raced = slots.filter((s) => s.trophy).length;
  const earlier = state.trophies
    .filter((t) => t.season !== season)
    .sort((a, b) => b.season - a.season || b.round - a.round);

  return (
    <GameLayout hideGarageButton lockViewport backHref="/garage" darkBackground menuFrame>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-12">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-white text-center mb-6" style={OXANIUM}>
          TROPHIES
        </h1>
        <div className="max-w-2xl md:max-w-4xl mx-auto space-y-8">
          <section>
            <SectionTitle aside={state.dailyStreak.best > 0 ? `best ${state.dailyStreak.best}` : undefined}>Daily streak</SectionTitle>
            <DailyStreakCard streak={state.dailyStreak} earnedBadges={state.earnedBadges} />
          </section>

          <section>
            <SectionTitle aside={`${raced}/${SEASON_ROUNDS} weekends`}>{`Season ${season}`}</SectionTitle>
            <div className="grid grid-cols-6 gap-2" data-testid="season-grid">
              {slots.map((slot) => (
                <TrophyTile key={slot.round} round={slot.round} trophy={slot.trophy} current={slot.round === CURRENT_GRAND_PRIX.round} />
              ))}
            </div>
            <p className="mt-3 text-[10px] text-white/40">
              Finish a Grand Prix Race Day for bronze, beat the bot for silver, take pole and the win for gold.
            </p>
          </section>

          {earlier.length > 0 && (
            <section>
              <SectionTitle>Earlier seasons</SectionTitle>
              <div className="grid grid-cols-6 gap-2">
                {earlier.map((t) => (
                  <TrophyTile key={t.id} round={t.round} trophy={t} current={false} />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle aside={`${state.earnedBadges.length}/${BADGES.length}`}>Badges</SectionTitle>
            <div className="flex flex-wrap gap-3">
              {BADGES.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} earned={state.earnedBadges.includes(badge.id)} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Growth</SectionTitle>
            <GrowthPanel factStats={state.factStats} />
          </section>
        </div>
      </div>
    </GameLayout>
  );
}
