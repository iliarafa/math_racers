import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench } from "lucide-react";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins}>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 py-12">
        
        <div className="space-y-6 max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full bg-secondary text-xs font-medium uppercase tracking-wider text-muted-foreground">
            2025 Season
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-primary">
            Math Racers
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Solve math problems to race. <br/>
            Every mistake costs a grid position.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link href="/game" className="flex-1">
            <button className="w-full bg-primary text-primary-foreground hover:opacity-90 h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all">
              <Play className="w-5 h-5" />
              Start Race
            </button>
          </Link>

          <Link href="/garage" className="flex-1">
            <button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all">
              <Wrench className="w-5 h-5" />
              Garage
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center pt-8 border-t border-border w-full max-w-md">
           <div>
             <div className="text-3xl font-bold">{state.coins}</div>
             <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Pit Coins</div>
           </div>
           <div>
             <div className="text-3xl font-bold">{state.streak}</div>
             <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Best Streak</div>
           </div>
        </div>

      </div>
    </GameLayout>
  );
}
