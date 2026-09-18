import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { TrophyTier, TrophyUpgrade } from "@/lib/trophies";
import { TIER_COLORS } from "@/components/RewardStrip";

interface TrophySplashProps {
  tier: TrophyTier;
  status: Exclude<TrophyUpgrade['status'], 'unchanged'>;
  /** Circuit name as shown on the card, e.g. 'BAKU'. */
  name: string;
  round: number;
  /** Called when the player chooses to see the race result instead. */
  onClose: () => void;
}

const TIER_BLURB: Record<TrophyTier, string> = {
  bronze: 'You finished the Grand Prix. The trophy is in the cabinet.',
  silver: 'You beat the bot on Race Day. Silver goes in the cabinet.',
  gold: 'Pole position and the win. A perfect weekend, and gold in the cabinet.',
};

/**
 * Celebration shown from the Race Day finish screen when the weekend trophy is
 * new or upgraded. Same visual language as SuperlicenceSplash.
 */
export function TrophySplash({ tier, status, name, round, onClose }: TrophySplashProps) {
  const [, setLocation] = useLocation();
  const color = TIER_COLORS[tier];

  useEffect(() => {
    const burst = (x: number, angle: number) =>
      confetti({
        particleCount: 90,
        spread: 65,
        startVelocity: 48,
        angle,
        origin: { x, y: 0.75 },
        colors: [color, "#ffffff", "#e10600"],
        zIndex: 90,
      });
    burst(0.15, 60);
    burst(0.85, 120);
    const again = window.setTimeout(() => {
      burst(0.3, 75);
      burst(0.7, 105);
    }, 500);
    return () => window.clearTimeout(again);
  }, [color]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center text-white"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #2a1508 0%, #0a0a0c 60%)" }}
      data-testid="trophy-splash"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="flex flex-col items-center"
      >
        <div
          className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          Round {round} · {name}
        </div>
        <h1
          className="mt-4 text-5xl sm:text-6xl font-bold uppercase tracking-[0.16em]"
          style={{ fontFamily: "Oxanium, sans-serif", color, textShadow: `0 0 40px ${color}59` }}
        >
          {tier}
        </h1>
        <div
          className="mt-3 text-lg font-bold uppercase tracking-[0.4em] text-white"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          {status === 'upgraded' ? 'Trophy upgraded' : 'Trophy earned'}
        </div>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-white/70">{TIER_BLURB[tier]}</p>
        <button
          type="button"
          onClick={() => setLocation("/trophies")}
          className="mt-10 h-14 w-full max-w-xs rounded-xl text-black font-bold uppercase tracking-wider text-lg active:scale-[0.98] transition"
          style={{ fontFamily: "Oxanium, sans-serif", backgroundColor: color }}
          data-testid="trophy-go-cabinet"
        >
          Open the cabinet
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-12 w-full max-w-xs rounded-xl bg-white/10 text-white/80 font-bold uppercase tracking-wider hover:bg-white/15 transition"
          style={{ fontFamily: "Oxanium, sans-serif" }}
          data-testid="trophy-secondary"
        >
          See race result
        </button>
      </motion.div>
    </div>
  );
}
