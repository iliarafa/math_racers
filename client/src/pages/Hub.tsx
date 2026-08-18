import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useGameState, RACE_LENGTH } from "@/lib/gameLogic";
import { usePurchase } from "@/hooks/use-purchase";
import { playCarouselClick } from "@/lib/uiSound";
import { CURRENT_GRAND_PRIX } from "@/lib/currentGrandPrix";
import { getLicenceStatus } from "@/lib/drivingSchoolLicence";
import { DrivingSchoolWhatsNew } from "@/components/DrivingSchoolWhatsNew";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import logoWhiteImage from "@assets/logo-white.svg";
import schoolBgImage from "@assets/driving-school-bg.jpg";

const hubCardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '12px',
  padding: '16px 20px',
  width: '100%',
  textAlign: 'left' as const,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

/** Glass card with a red leading edge — primary without competing with the briefing banner. */
const quickRaceCardStyle: React.CSSProperties = {
  ...hubCardStyle,
  borderLeft: '3px solid #e10600',
  paddingLeft: '17px',
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
  href?: string;
  title: string;
  subtitle: string;
  note?: string;
  /** Small pill on the title row (licence path step / completed marker). */
  badge?: { label: string; color: string };
  testId: string;
  soundEnabled: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
}

function HubCard({ href, title, subtitle, note, badge, testId, soundEnabled, onClick, style, titleStyle }: HubCardProps) {
  const handleClick = () => {
    if (soundEnabled) playCarouselClick();
    onClick?.();
  };

  const button = (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      style={{ ...hubCardStyle, ...style }}
      data-testid={testId}
      type="button"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="block" style={{ ...hubTitleStyle, ...titleStyle }}>{title}</span>
        {badge && (
          <span
            style={{
              fontFamily: 'Oxanium, sans-serif',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: badge.color,
              border: `1px solid ${badge.color}`,
              borderRadius: '6px',
              padding: '2px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {badge.label}
          </span>
        )}
      </span>
      <span className="block" style={hubSubStyle}>{subtitle}</span>
      {note && (
        <span className="block" style={{ ...hubSubStyle, fontSize: '0.65rem', color: '#999', marginTop: '6px' }}>
          {note}
        </span>
      )}
    </motion.button>
  );

  if (href) {
    return <Link href={href}>{button}</Link>;
  }
  return button;
}

/** Sector station on the school track rail: done ✓ / current number / upcoming dashed. */
function TrackNode({ state, num }: { state: 'done' | 'current' | 'upcoming'; num: number }) {
  const base: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Oxanium, sans-serif',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  };
  if (state === 'done') {
    return <div style={{ ...base, backgroundColor: '#a855f7', color: '#ffffff' }}>✓</div>;
  }
  if (state === 'current') {
    return <div style={{ ...base, backgroundColor: '#ffcc00', color: '#141216' }}>{num}</div>;
  }
  return (
    <div
      style={{
        ...base,
        backgroundColor: 'rgba(0,0,0,0.35)',
        border: '2px dashed rgba(255,255,255,0.35)',
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      {num}
    </div>
  );
}

type HubView = 'paddock' | 'weekend' | 'school';

/**
 * The Paddock — multi-level mode menu.
 *
 * Menu A: Weekend Briefing, RACE NOW (quick race), RACE WEEKEND, DRIVING SCHOOL, Garage.
 * RACE WEEKEND: Free Practice, Grand Prix.
 * DRIVING SCHOOL: Flashcards, Reaction Test, Lane Racer.
 */
export default function Hub() {
  const { state } = useGameState();
  const { isPremium } = usePurchase();
  const [view, setView] = useState<HubView>(() => {
    try {
      return new URLSearchParams(window.location.search).get('school') === '1' ? 'school' : 'paddock';
    } catch {
      return 'paddock';
    }
  });

  const title =
    view === 'weekend' ? 'Race Weekend' : view === 'school' ? 'Driving School' : 'Paddock';

  // Driving School drops the background video (App.tsx PersistentVideo listens).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hubSchoolViewChange', { detail: { school: view === 'school' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('hubSchoolViewChange', { detail: { school: false } }));
    };
  }, [view]);

  // Licence path: flashcards → reaction → lane racer. Grand Prix waits on complete.
  const licence = getLicenceStatus();
  const licenceSteps = [licence.flashcards, licence.reaction, licence.laneRacer];
  const currentStep = licenceSteps.findIndex((done) => !done);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">

      {/* Driving School backdrop: hand-drawn kerb art over black (video is hidden on this view) */}
      {view === 'school' && (
        <div className="absolute inset-0 z-0 bg-black">
          <img
            src={schoolBgImage}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-55"
          />
        </div>
      )}

      {/* Logo */}
      <div className="flex justify-center relative z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: '16px' }}>
        <Link href="/">
          <img
            src={view === 'school' ? logoWhiteImage : logoImage}
            alt="F1 Math Racer"
            className="h-8 md:h-12 object-contain cursor-pointer hover:opacity-70 transition-opacity"
          />
        </Link>
      </div>

      {/* Title + back on drill-ins */}
      <div className="relative z-10 mt-2 md:mt-8 mb-5 md:mb-8 flex flex-col justify-center items-center">
        {view !== 'paddock' && (
          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) playCarouselClick();
              setView('paddock');
            }}
            className="absolute left-4 top-0 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white transition-colors"
            aria-label="Back to paddock"
            data-testid="button-hub-back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h2
          className="text-2xl md:text-3xl font-semibold uppercase tracking-wider text-white"
          style={{ fontFamily: 'Oxanium, sans-serif' }}
        >
          {title}
        </h2>
        {view === 'school' && (
          <p
            className="mt-1.5 text-center text-[9px] uppercase tracking-[0.16em] text-white/45 whitespace-nowrap"
            style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 300 }}
            data-testid="school-caption"
          >
            Complete to earn your superlicence
          </p>
        )}
      </div>

      {/* Modes */}
      <div className="relative z-10 flex flex-col items-center px-6 overflow-y-auto flex-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div className="flex flex-col w-full max-w-sm md:max-w-lg gap-4">

          {view === 'paddock' && (
            <>
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
                href="/game/quick-race"
                title="RACE NOW"
                subtitle={`${CURRENT_GRAND_PRIX.circuitName} · ${RACE_LENGTH} LAPS`}
                testId="link-quick-race"
                soundEnabled={state.soundEnabled}
                style={quickRaceCardStyle}
                titleStyle={{ color: '#e10600' }}
              />

              <HubCard
                title="DRIVING SCHOOL"
                subtitle="FLASHCARDS · REACTION · ARCADE"
                badge={licence.complete ? { label: 'completed', color: '#19c37d' } : undefined}
                testId="link-driving-school"
                soundEnabled={state.soundEnabled}
                onClick={() => setView('school')}
              />

              <HubCard
                title="RACE WEEKEND"
                subtitle="PRACTICE · QUALIFY · RACE"
                testId="link-race-weekend"
                soundEnabled={state.soundEnabled}
                onClick={() => setView('weekend')}
              />

              <HubCard
                href="/garage"
                title="GARAGE"
                subtitle="SETTINGS & STATS"
                testId="link-garage"
                soundEnabled={state.soundEnabled}
              />
            </>
          )}

          {view === 'weekend' && (
            <>
              <HubCard
                href="/game/free-practice"
                title="FREE PRACTICE"
                subtitle={CURRENT_GRAND_PRIX.circuitName}
                testId="link-free-practice"
                soundEnabled={state.soundEnabled}
              />

              <HubCard
                href={licence.complete ? "/game/grand-prix" : undefined}
                title="GRAND PRIX"
                subtitle={`ROUND ${CURRENT_GRAND_PRIX.round}`}
                note={licence.complete ? (isPremium ? undefined : 'Full version') : 'Graduate Driving School'}
                badge={licence.complete ? undefined : { label: 'locked', color: '#ffcc00' }}
                testId="link-grand-prix"
                soundEnabled={state.soundEnabled}
                onClick={licence.complete ? undefined : () => setView('school')}
              />
            </>
          )}

          {view === 'school' && (
            <div className="relative">
              {/* Track rail: ribbon + dashed centerline, from sector 1 down to the finish flag */}
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 24,
                  bottom: 16,
                  width: 12,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 19,
                  top: 24,
                  bottom: 16,
                  width: 0,
                  borderLeft: '2px dashed rgba(255,255,255,0.35)',
                }}
              />

              {(
                [
                  { href: '/driving-school', title: 'FLASHCARDS', goal: '10 STAGES', testId: 'link-flashcards' },
                  { href: '/reaction', title: 'REACTION TEST', goal: 'UNDER 0.33S', testId: 'link-reaction-test' },
                  { href: '/lane-racer', title: 'LANE RACER', goal: 'BEAT THE INSTRUCTOR', testId: 'link-lane-racer' },
                ] as const
              ).map((row, i) => {
                const nodeState = licenceSteps[i] ? 'done' : i === currentStep ? 'current' : 'upcoming';
                return (
                  <div key={row.href} className="relative flex items-center gap-3 mb-4">
                    <div className="w-10 flex justify-center shrink-0 z-[1]">
                      <TrackNode state={nodeState} num={i + 1} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <HubCard
                        href={row.href}
                        title={row.title}
                        subtitle={`SECTOR ${i + 1} · ${row.goal}`}
                        testId={row.testId}
                        soundEnabled={state.soundEnabled}
                        style={nodeState === 'current' ? { border: '1px solid #ffcc00' } : undefined}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Finish line */}
              <div className="relative flex items-center gap-3">
                <div className="w-10 flex justify-center shrink-0 z-[1]">
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: 'repeating-conic-gradient(#ffffff 0% 25%, #141216 0% 50%) 0 0 / 13px 13px',
                    }}
                  />
                </div>
                <span
                  className="text-xs uppercase tracking-[0.14em]"
                  style={{
                    fontFamily: 'Oxanium, sans-serif',
                    color: licence.complete ? '#19c37d' : 'rgba(255,255,255,0.5)',
                    fontWeight: licence.complete ? 'bold' : 'normal',
                  }}
                  data-testid="school-finish-label"
                >
                  {licence.complete ? 'School completed' : 'Finish line'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {view === "paddock" && (
        <DrivingSchoolWhatsNew
          soundEnabled={state.soundEnabled}
          onOpenSchool={() => setView("school")}
        />
      )}
    </div>
  );
}
