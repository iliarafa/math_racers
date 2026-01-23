import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import heroImage from "@assets/haas_1768869383652.png";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import garageButtonImage from "@assets/1Asset_4@2x_1768068802390.png";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins} hideHeader lockViewport>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 px-4 overflow-hidden">
        
        <div className="space-y-6 max-w-2xl flex flex-col items-center">
          <img 
            src={logoImage} 
            alt="Math Racer" 
            className="w-auto max-w-[80%]"
            data-testid="img-logo"
          />
          <p
            className="text-black text-xl md:text-2xl tracking-wider uppercase mt-2"
            style={{ fontFamily: 'Formula1' }}
            data-testid="img-tagline"
          >
            NO RISK. FULL MATH.
          </p>
          <img
            src={heroImage}
            alt="Math Racers"
            className="w-auto max-w-[85%]"
            data-testid="img-hero"
          />
        </div>

        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          <Link href="/game">
            <button
              className="px-16 py-4 bg-red-600 text-white text-2xl font-bold uppercase tracking-wider rounded-2xl cursor-pointer hover:bg-red-700 transition-colors"
              style={{ fontFamily: 'Formula1' }}
              data-testid="button-start-race"
            >
              RACE
            </button>
          </Link>

          <Link href="/garage">
            <img 
              src={garageButtonImage} 
              alt="Garage" 
              className="h-[4.9rem] w-auto cursor-pointer hover:opacity-80 transition-opacity"
              data-testid="button-garage"
            />
          </Link>
        </div>

        

      </div>
    </GameLayout>
  );
}
