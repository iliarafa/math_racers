import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGameState } from "@/lib/gameLogic";
import { usePurchase } from "@/hooks/use-purchase";
import { playCarouselClick } from "@/lib/uiSound";
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

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

interface HubCardProps {
  href: string;
  title: string;
  subtitle: string;
  note?: string;
  testId: string;
  soundEnabled: boolean;
}

function HubCard({ href, title, subtitle, note, testId, soundEnabled }: HubCardProps) {
  return (
    <Link href={href}>
      <motion.button
        onClick={() => { if (soundEnabled) playCarouselClick(); }}
        whileTap={{ scale: 0.98 }}
        style={hubCardStyle}
        data-testid={testId}
      >
        <span className="block" style={hubTitleStyle}>{title}</span>
        <span className="block" style={hubSubStyle}>{subtitle}</span>
        {note && (
          <span className="block" style={{ ...hubSubStyle, fontSize: '0.65rem', color: '#999', marginTop: '6px' }}>
            {note}
          </span>
        )}
      </motion.button>
    </Link>
  );
}

/**
 * The Paddock — the app's only mode menu.
 *
 * This used to be one of two near-identical list screens: Paddock offered Single Player /
 * Multiplayer / Garage, and Game's `mode_select` then offered Free Practice / Lane Racer /
 * Grand Prix in the same glass cards. They are one screen now, so every mode is two taps
 * from its Start button.
 */
export default function Hub() {
  const { state } = useGameState();
  const { isPremium } = usePurchase();

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
      <div className="relative z-10 mt-2 md:mt-8 mb-5 md:mb-8 flex justify-center">
        <h2
          className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
        >
          Paddock
        </h2>
      </div>

      {/* Modes */}
      <div className="relative z-10 flex flex-col items-center px-6 overflow-y-auto flex-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="flex flex-col w-full max-w-sm md:max-w-lg gap-4">

          {/* Weekend Briefing */}
          <Link
            href="/grand-prix"
            onClick={() => { if (state.soundEnabled) playCarouselClick(); }}
            data-testid="link-weekend-briefing"
            style={{
              background: CURRENT_GRAND_PRIX.gradient,
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#1a1a1a',
              boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
              textDecoration: 'none',
            }}
          >
            <img
              src={CURRENT_GRAND_PRIX.flagImage}
              alt={`${CURRENT_GRAND_PRIX.country} flag`}
              style={{
                width: 30,
                height: 22,
                borderRadius: 3,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 0 0 0.5px rgba(255,255,255,0.3)',
              }}
            />
            <div style={{ flex: 1, lineHeight: 1.1, fontFamily: 'Oxanium, sans-serif' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', fontWeight: 800, opacity: 0.85 }}>
                WEEKEND BRIEFING
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.06em', marginTop: '2px' }}>
                {CURRENT_GRAND_PRIX.name}
              </div>
            </div>
          </Link>

          <HubCard
            href="/game/free-practice"
            title="FREE PRACTICE"
            subtitle={CURRENT_GRAND_PRIX.circuitName}
            testId="link-free-practice"
            soundEnabled={state.soundEnabled}
          />

          <HubCard
            href="/game/grand-prix"
            title="GRAND PRIX"
            subtitle={`ROUND ${CURRENT_GRAND_PRIX.round}`}
            note={isPremium ? undefined : 'Full version'}
            testId="link-grand-prix"
            soundEnabled={state.soundEnabled}
          />

          <HubCard
            href="/lane-racer"
            title="LANE RACER"
            subtitle="ARCADE MODE"
            testId="link-lane-racer"
            soundEnabled={state.soundEnabled}
          />

          <HubCard
            href="/multiplayer"
            title="MULTIPLAYER"
            subtitle="1v1 ONLINE RACING"
            testId="link-multiplayer"
            soundEnabled={state.soundEnabled}
          />

          <HubCard
            href="/garage"
            title="GARAGE"
            subtitle="SETTINGS & STATS"
            testId="link-garage"
            soundEnabled={state.soundEnabled}
          />
        </div>
      </div>
    </div>
  );
}
