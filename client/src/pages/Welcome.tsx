import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench } from "lucide-react";
import heroImage from "@assets/IMG_0303_1767485122191.jpeg";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins} hideHeader>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 md:space-y-12 py-8 md:py-12 px-4">
        
        <div className="space-y-6 max-w-2xl flex flex-col items-center">
          <img 
            src={logoImage} 
            alt="Math Racer" 
            className="w-auto max-w-[80%]"
            data-testid="img-logo"
          />
          <img 
            src={heroImage} 
            alt="Math Racers" 
            className="w-auto max-w-[65%]"
            data-testid="img-hero"
          />
          <p className="text-xl text-muted-foreground max-w-lg text-center">
            Race by solving math.
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/game" className="flex-1">
              <button 
                className="w-full bg-white h-14 rounded-lg font-medium text-lg flex items-center justify-start pl-6 gap-2 transition-all text-black hover:text-red-500"
                data-testid="button-start-race"
              >
                <Play className="w-5 h-5" />
                Race
              </button>
            </Link>

            <Link href="/garage" className="flex-1">
              <button className="w-full h-14 rounded-lg font-medium text-lg flex items-center justify-start pl-6 gap-2 transition-all bg-white text-black hover:text-purple-500" data-testid="button-garage">
                <Wrench className="w-5 h-5" />
                Garage
              </button>
            </Link>
          </div>
        </div>

        

      </div>
    </GameLayout>
  );
}
