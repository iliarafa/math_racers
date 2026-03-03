import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import heroImage from "@assets/hero_tight_post.png";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  } catch (e) {}
};

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout hideHeader lockViewport>
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-16 px-4 overflow-hidden">
        
        <div className="space-y-12 max-w-2xl flex flex-col items-center">
          <img 
            src={logoImage} 
            alt="Math Racer" 
            className="w-auto max-w-[80%] md:max-w-[55%]"
            data-testid="img-logo"
          />
          <img
            src={heroImage}
            alt="Math Racers"
            className="w-auto max-w-[85%] md:max-w-[65%]"
            style={{ filter: 'saturate(0.8) brightness(0.92)' }}
            data-testid="img-hero"
          />
        </div>

        <div className="flex flex-col items-center gap-8 md:gap-12 w-full max-w-md">
          <Link href="/garage">
            <button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              className="w-48 py-4 bg-white text-black text-2xl font-bold uppercase tracking-wider rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors md:w-60 md:py-5 md:text-3xl"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
              data-testid="button-garage"
            >
              GARAGE
            </button>
          </Link>

          <Link href="/game">
            <button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              className="w-48 py-4 bg-red-600 text-white text-2xl font-bold uppercase tracking-wider rounded-2xl cursor-pointer hover:bg-red-700 transition-colors md:w-60 md:py-5 md:text-3xl"
              style={{ fontFamily: 'Oxanium, sans-serif' }}
              data-testid="button-start-race"
            >
              RACE
            </button>
          </Link>
        </div>

        

      </div>
    </GameLayout>
  );
}
