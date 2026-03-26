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
    <Link href="/hub" className="contents">
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-white overflow-hidden cursor-pointer"
        style={{ fontFamily: 'Oxanium, sans-serif' }}
        onClick={() => { if (state.soundEnabled) playClickSound(); }}
      >
        <div className="flex flex-col items-center" style={{ marginTop: '5vh' }}>
          <img
            src={logoImage}
            alt="Math Racer"
            className="w-[65%] max-w-[380px] md:max-w-[520px] mb-8"
            data-testid="img-logo"
          />
          <img
            src={heroImage}
            alt="Math Racers"
            className="w-[65%] max-w-[380px] md:max-w-[520px]"
            style={{ filter: 'saturate(0.8) brightness(0.92)' }}
            data-testid="img-hero"
          />
          <span
            className="mt-10 text-sm uppercase tracking-[0.2em] text-gray-400 animate-pulse"
            data-testid="button-start"
          >
            Tap to start
          </span>
        </div>
      </div>
    </Link>
  );
}
