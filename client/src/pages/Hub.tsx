import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGameState } from "@/lib/gameLogic";
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

const hubCardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  padding: '16px 20px',
  width: '100%',
  textAlign: 'left' as const,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const hubTitleStyle: React.CSSProperties = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: window.innerWidth >= 768 ? '1.4rem' : '1.15rem',
  fontWeight: 'bold',
  color: '#FFFFFF',
};

const hubSubStyle: React.CSSProperties = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.65)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginTop: '4px',
};

export default function Hub() {
  const { state } = useGameState();

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">

      {/* Logo */}
      <div className="flex justify-center relative z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: '16px' }}>
        <Link href="/">
          <img
            src={logoImage}
            alt="F1 Math Racer"
            className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
          />
        </Link>
      </div>

      {/* Title */}
      <div className="relative z-10 mt-4 md:mt-10 mb-6 md:mb-10 flex justify-center">
        <h2
          className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
        >
          Paddock
        </h2>
      </div>

      {/* Hub Cards */}
      <div className="relative z-10 flex flex-col items-center px-6 overflow-y-auto flex-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="flex flex-col w-full max-w-sm md:max-w-lg gap-4">
          {/* Solo */}
          <Link href="/game">
            <motion.button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              whileTap={{ scale: 0.98 }}
              style={hubCardStyle}
            >
              <span className="block" style={hubTitleStyle}>SINGLE PLAYER</span>
              <span className="block" style={hubSubStyle}>RACE AGAINST THE AI</span>
            </motion.button>
          </Link>

          {/* Multiplayer */}
          <Link href="/multiplayer">
            <motion.button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              whileTap={{ scale: 0.98 }}
              style={hubCardStyle}
            >
              <span className="block" style={hubTitleStyle}>MULTIPLAYER</span>
              <span className="block" style={hubSubStyle}>1v1 ONLINE RACING</span>
            </motion.button>
          </Link>

          {/* Garage */}
          <Link href="/garage">
            <motion.button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              whileTap={{ scale: 0.98 }}
              style={hubCardStyle}
            >
              <span className="block" style={hubTitleStyle}>GARAGE</span>
              <span className="block" style={hubSubStyle}>SETTINGS & STATS</span>
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}
