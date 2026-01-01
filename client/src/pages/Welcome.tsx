import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench, Zap } from "lucide-react";
import heroImage from "@assets/IMG_0301_1767311075554.png";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins}>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 md:space-y-12 py-8 md:py-12 px-4">
        
        <div className="space-y-6 max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-muted-foreground bg-[#ffffff]">
            2025 Season
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter" style={{ color: 'var(--team-color)' }}>
            Math Racers
          </h1>
          <img 
            src={heroImage} 
            alt="Math Racers" 
            className="w-full max-w-xs mx-auto rounded-lg shadow-lg"
            data-testid="img-hero"
          />
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Solve math problems to race. <br/>
            Every mistake costs a grid position.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/game" className="flex-1">
              <button 
                className="w-full bg-white hover:opacity-90 h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all"
                style={{ color: 'var(--team-color)' }}
                data-testid="button-start-race"
              >
                <Play className="w-5 h-5" />
                Start Race
              </button>
            </Link>

            <Link href="/garage" className="flex-1">
              <button className="w-full text-secondary-foreground hover:bg-secondary/80 h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all bg-[#ffffffcc]" data-testid="button-garage">
                <Wrench className="w-5 h-5" />
                Garage
              </button>
            </Link>
          </div>

          <Link href="/reaction">
            <button className="w-full h-12 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all bg-white text-black hover:text-green-500" data-testid="button-reflex-training">
              <Zap className="w-5 h-5" />
              Reflex Training
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
