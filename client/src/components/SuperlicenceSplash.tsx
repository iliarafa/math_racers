import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { markSuperlicenceCelebrated } from "@/lib/drivingSchoolLicence";

interface SuperlicenceSplashProps {
  /** Called when the player chooses to stay (secondary button). The splash marks itself seen. */
  onClose: () => void;
  /** Secondary button label — "Back to Paddock" on the Hub, "See race result" on Lane Racer. */
  secondaryLabel?: string;
}

/**
 * One-time celebration shown the moment Driving School is complete: Grand Prix is now open.
 * Shown from the Lane Racer result (the licence path's last sector) and, as a fallback for
 * out-of-order completion, on the next Hub visit. `markSuperlicenceCelebrated` keeps it to once.
 */
export function SuperlicenceSplash({ onClose, secondaryLabel = "Back to Paddock" }: SuperlicenceSplashProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    markSuperlicenceCelebrated();
    const burst = (x: number, angle: number) =>
      confetti({
        particleCount: 90,
        spread: 65,
        startVelocity: 48,
        angle,
        origin: { x, y: 0.75 },
        colors: ["#ffcc00", "#ffffff", "#e10600", "#a855f7"],
        zIndex: 90,
      });
    burst(0.15, 60);
    burst(0.85, 120);
    const again = window.setTimeout(() => {
      burst(0.3, 75);
      burst(0.7, 105);
    }, 500);
    return () => window.clearTimeout(again);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center text-white"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #2a1508 0%, #0a0a0c 60%)" }}
      data-testid="superlicence-splash"
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
          Driving School · Graduated
        </div>
        <h1
          className="mt-4 text-5xl sm:text-6xl font-bold uppercase tracking-[0.16em] text-[#ffcc00]"
          style={{ fontFamily: "Oxanium, sans-serif", textShadow: "0 0 40px rgba(255,204,0,0.35)" }}
        >
          Superlicence
        </h1>
        <div
          className="mt-3 text-lg font-bold uppercase tracking-[0.4em] text-white"
          style={{ fontFamily: "Oxanium, sans-serif" }}
        >
          Granted
        </div>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-white/70">
          You cleared the flashcards, beat the lights and out-raced the instructor. The Grand Prix
          weekend is open.
        </p>
        <button
          type="button"
          onClick={() => setLocation("/game/grand-prix")}
          className="mt-10 h-14 w-full max-w-xs rounded-xl bg-[#ffcc00] text-black font-bold uppercase tracking-wider text-lg hover:bg-yellow-300 active:scale-[0.98] transition"
          style={{ fontFamily: "Oxanium, sans-serif" }}
          data-testid="superlicence-go-gp"
        >
          Go to Grand Prix
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-12 w-full max-w-xs rounded-xl bg-white/10 text-white/80 font-bold uppercase tracking-wider hover:bg-white/15 transition"
          style={{ fontFamily: "Oxanium, sans-serif" }}
          data-testid="superlicence-secondary"
        >
          {secondaryLabel}
        </button>
      </motion.div>
    </div>
  );
}
