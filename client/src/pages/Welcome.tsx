import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench, Zap } from "lucide-react";
import heroImage from "@assets/IMG_0303_1767485122191.jpeg";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins}>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 md:space-y-12 py-8 md:py-12 px-4">
        
        <div className="space-y-6 max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider text-muted-foreground bg-[#ffffff]">2026 Season</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter" style={{ color: '#E10600' }}>
            Math Racers
          </h1>
          <img 
            src={heroImage} 
            alt="Math Racers" 
            className="w-auto max-w-[65%] mx-auto"
            data-testid="img-hero"
          />
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Race by solving math.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/game" className="flex-1">
              <button 
                className="w-[85%] mx-auto hover:bg-neutral-800 h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all bg-[#ffffff] text-[#000000]"
                data-testid="button-start-race"
              >
                <Play className="w-5 h-5" />
                Race Now
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

        

      </div>
    </GameLayout>
  );
}
