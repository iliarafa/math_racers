import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench, Users } from "lucide-react";
import heroImage from "@assets/IMG_0303_1767485122191.jpeg";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import taglineImage from "@assets/1Asset_5@2x_1768002946873.png";

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
          <img 
            src={taglineImage} 
            alt="No Risk. Full Math." 
            className="w-auto max-w-[50%]"
            data-testid="img-tagline"
          />
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/game" className="flex-1">
              <button 
                className="w-full bg-white h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all text-black hover:text-red-500"
                data-testid="button-start-race"
              >
                <Play className="w-5 h-5" />
                <span className="w-16 text-left">Race</span>
              </button>
            </Link>

            <Link href="/multiplayer" className="flex-1">
              <button className="w-full h-14 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all bg-white text-black hover:text-blue-500" data-testid="button-multiplayer">
                <Users className="w-5 h-5" />
                <span className="w-16 text-left">1v1</span>
              </button>
            </Link>
          </div>
          
          <Link href="/garage" className="w-full">
            <button className="w-full h-12 rounded-lg font-medium text-base flex items-center justify-center gap-2 transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80" data-testid="button-garage">
              <Wrench className="w-4 h-4" />
              Garage
            </button>
          </Link>
        </div>

        

      </div>
    </GameLayout>
  );
}
