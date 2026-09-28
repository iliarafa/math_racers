import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The five F1 start lights on the countdown screen. `lit` of them (0–5) glow red; the
 * countdown effect that counts them up stays with the page.
 */
export function StartLights({ lit }: { lit: number }) {
  return (
    <div className="bg-black rounded-xl p-4 md:p-6 shadow-2xl border-4 border-zinc-800">
      <div className="flex gap-2 md:gap-3 justify-center">
        {[1, 2, 3, 4, 5].map((light) => (
          <motion.div
            key={light}
            initial={{ opacity: 0.3 }}
            animate={{
              opacity: lit >= light ? 1 : 0.3,
              scale: lit >= light ? 1 : 0.95
            }}
            className={cn(
              "w-10 h-10 md:w-16 md:h-16 rounded-full transition-all duration-100 border-2 md:border-4",
              lit >= light
                ? "bg-red-600 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] md:shadow-[0_0_30px_rgba(220,38,38,0.8)]"
                : "bg-zinc-800 border-zinc-700"
            )}
          />
        ))}
      </div>
    </div>
  );
}
