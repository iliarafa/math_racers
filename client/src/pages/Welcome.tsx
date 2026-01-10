import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import heroImage from "@assets/IMG_0303_1767485122191.jpeg";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import taglineImage from "@assets/1Asset_5@2x_1768002946873.png";
import raceButtonImage from "@assets/1Asset_6@2x_1768068792225.png";
import garageButtonImage from "@assets/1Asset_4@2x_1768068802390.png";

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

        <div className="flex gap-4 w-full max-w-md justify-center">
          <Link href="/game">
            <img 
              src={raceButtonImage} 
              alt="Race" 
              className="h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              data-testid="button-start-race"
            />
          </Link>

          <Link href="/garage">
            <img 
              src={garageButtonImage} 
              alt="Garage" 
              className="h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              data-testid="button-garage"
            />
          </Link>
        </div>

        

      </div>
    </GameLayout>
  );
}
