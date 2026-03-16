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
  backgroundColor: '#FFFFFF',
  border: '1px solid #E9ECEF',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: '20px 24px',
  width: '100%',
  textAlign: 'left' as const,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const hubTitleStyle: React.CSSProperties = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: '1.3rem',
  fontWeight: 'bold',
  color: '#212529',
};

const hubSubStyle: React.CSSProperties = {
  fontFamily: 'Oxanium, sans-serif',
  fontSize: '0.8rem',
  color: '#6C757D',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginTop: '4px',
};

export default function Hub() {
  const { state } = useGameState();

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Logo */}
      <div className="flex justify-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: '16px' }}>
        <Link href="/">
          <img
            src={logoImage}
            alt="F1 Math Racer"
            className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
          />
        </Link>
      </div>

      {/* Hub Cards */}
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="flex flex-col w-full max-w-sm gap-5">
          {/* Solo */}
          <Link href="/game">
            <motion.button
              onClick={() => { if (state.soundEnabled) playClickSound(); }}
              whileTap={{ scale: 0.98 }}
              style={hubCardStyle}
            >
              <span className="block" style={hubTitleStyle}>SOLO</span>
              <span className="block" style={hubSubStyle}>RACE AGAINST THE AI</span>
            </motion.button>
          </Link>

          {/* Multiplayer (disabled) */}
          <div style={{ ...hubCardStyle, opacity: 0.5, cursor: 'default' }}>
            <span className="block" style={hubTitleStyle}>MULTIPLAYER</span>
            <span className="block" style={hubSubStyle}>COMING SOON</span>
          </div>

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
