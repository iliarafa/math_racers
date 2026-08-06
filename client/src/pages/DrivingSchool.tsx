import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, Delete, Lock, RotateCcw } from "lucide-react";
import { GameLayout } from "@/components/layout/GameLayout";
import { cn } from "@/lib/utils";
import { getAudioContext, playCarouselClick } from "@/lib/uiSound";
import { useGameState } from "@/lib/gameLogic";
import {
  DRIVING_SCHOOL_STAGES,
  CARDS_PER_STAGE,
  buildStageDeck,
  gradeFlashcard,
  isStageUnlocked,
  loadHighestClearedStage,
  saveHighestClearedStage,
  type CardColor,
  type DrivingSchoolStage,
  type FlashcardItem,
} from "@/lib/drivingSchool";

type Screen = 'stages' | 'session' | 'cleared';

const COLOR_DOT: Record<CardColor, string> = {
  pending: 'bg-white/20',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
};

/** Lit card face while a graded answer flashes. */
const CARD_LIT: Record<Exclude<CardColor, 'pending'>, string> = {
  purple: 'bg-purple-500 border-purple-600',
  green: 'bg-green-500 border-green-600',
  red: 'bg-red-500 border-red-600',
};

/** One distinct F1-flavored sound per grade: purple = DRS chirp, green = ding, red = penalty buzzer. */
function playGradeSound(color: Exclude<CardColor, 'pending'>) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (color === 'purple') {
      // Rising sweep with a blip on top — fastest-lap reward.
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(600, now);
      sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
      sweepGain.gain.setValueAtTime(0.0001, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      sweep.start(now);
      sweep.stop(now + 0.2);

      const blip = ctx.createOscillator();
      const blipGain = ctx.createGain();
      blip.connect(blipGain);
      blipGain.connect(ctx.destination);
      blip.type = 'sine';
      blip.frequency.value = 1319;
      blipGain.gain.setValueAtTime(0.0001, now);
      blipGain.gain.setValueAtTime(0.1, now + 0.18);
      blipGain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);
      blip.start(now + 0.18);
      blip.stop(now + 0.34);
    } else if (color === 'green') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Two detuned low squares — stewards' buzzer.
      for (const freq of [196, 208]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    }
  } catch {
    /* ignore */
  }
}

export default function DrivingSchool() {
  const { state } = useGameState();
  const [, setLocation] = useLocation();
  const [highestCleared, setHighestCleared] = useState(() => loadHighestClearedStage());
  const [screen, setScreen] = useState<Screen>('stages');
  const [stage, setStage] = useState<DrivingSchoolStage | null>(null);
  const [deck, setDeck] = useState<FlashcardItem[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [passLabel, setPassLabel] = useState<'PASS 1' | 'RE-DRILL'>('PASS 1');
  const questionStartRef = useRef(Date.now());

  const currentIndex = queue[queuePos];
  const current = currentIndex !== undefined ? deck[currentIndex] : null;
  const purpleCount = deck.filter((c) => c.color === 'purple').length;

  useEffect(() => {
    if (screen === 'session' && current) {
      questionStartRef.current = Date.now();
      setAnswer('');
      setFeedback('idle');
    }
  }, [screen, currentIndex, current?.id]);

  const startStage = (s: DrivingSchoolStage) => {
    if (!isStageUnlocked(s.id, highestCleared)) return;
    if (state.soundEnabled) playCarouselClick();
    const nextDeck = buildStageDeck(s);
    setStage(s);
    setDeck(nextDeck);
    setQueue(nextDeck.map((_, i) => i));
    setQueuePos(0);
    setPassLabel('PASS 1');
    setScreen('session');
  };

  const advanceAfterGrade = (nextDeck: FlashcardItem[]) => {
    const nextPos = queuePos + 1;
    if (nextPos < queue.length) {
      setDeck(nextDeck);
      setQueuePos(nextPos);
      return;
    }
    // End of pass — re-drill non-purple or clear
    const redo = nextDeck
      .map((card, i) => ({ card, i }))
      .filter(({ card }) => card.color !== 'purple')
      .map(({ i }) => i);

    if (redo.length === 0) {
      setDeck(nextDeck);
      if (stage) {
        saveHighestClearedStage(stage.id);
        setHighestCleared(loadHighestClearedStage());
      }
      setScreen('cleared');
      return;
    }

    setDeck(nextDeck);
    setQueue(redo);
    setQueuePos(0);
    setPassLabel('RE-DRILL');
  };

  const submitAnswer = () => {
    if (!current || !stage || feedback !== 'idle') return;
    const val = parseInt(answer, 10);
    if (Number.isNaN(val)) return;

    const responseTime = Date.now() - questionStartRef.current;
    const correct = val === current.question.answer;
    const color = gradeFlashcard(correct, responseTime, current.question.botTime);
    if (state.soundEnabled) playGradeSound(color);

    const nextDeck = deck.map((card, i) =>
      i === currentIndex ? { ...card, color } : card,
    );
    setFeedback(correct ? 'correct' : 'incorrect');
    setDeck(nextDeck);

    window.setTimeout(() => {
      setFeedback('idle');
      setAnswer('');
      advanceAfterGrade(nextDeck);
    }, 550);
  };

  // Keyboard for desktop
  useEffect(() => {
    if (screen !== 'session' || feedback !== 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setAnswer((a) => a + e.key);
      } else if (e.key === 'Backspace') {
        setAnswer((a) => a.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Intentionally re-bind when the active card / feedback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, feedback, currentIndex, answer, deck, queue, queuePos, stage]);

  if (screen === 'cleared' && stage) {
    return (
      <GameLayout trackName="Driving School" lockViewport hideGarageButton centerHeader backHref="/hub">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-sm uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'Oxanium, sans-serif' }}>
            Stage {stage.id} cleared
          </div>
          <div className="text-4xl font-bold text-purple-500" style={{ fontFamily: 'Oxanium, sans-serif' }}>
            ALL PURPLE
          </div>
          <p className="text-muted-foreground text-center text-sm max-w-sm">
            {stage.title} — every card was purple. Next stage unlocked.
          </p>
          <div className="grid gap-3 w-full max-w-xs">
            {stage.id < DRIVING_SCHOOL_STAGES.length && (
              <button
                type="button"
                onClick={() => {
                  const next = DRIVING_SCHOOL_STAGES.find((s) => s.id === stage.id + 1);
                  if (next) startStage(next);
                }}
                className="w-full h-12 rounded-lg bg-purple-600 text-white font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Oxanium, sans-serif' }}
                data-testid="button-next-stage"
              >
                Next stage
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setScreen('stages');
                setStage(null);
              }}
              className="w-full h-12 rounded-lg bg-secondary text-secondary-foreground font-medium"
              data-testid="button-back-stages"
            >
              Back to stages
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (screen === 'session' && stage && current) {
    return (
      <GameLayout
        trackName={stage.title}
        lockViewport
        hideGarageButton
        centerHeader
        backHref="/hub"
      >
        <div className="flex-1 flex flex-col min-h-0 w-full max-w-md md:max-w-xl mx-auto px-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground pt-2" style={{ fontFamily: 'Oxanium, sans-serif' }}>
            <button
              type="button"
              onClick={() => {
                setScreen('stages');
                setStage(null);
              }}
              className="hover:text-foreground"
              data-testid="button-abort-session"
            >
              Exit
            </button>
            <span>{passLabel}</span>
            <span className="text-purple-500 font-bold">{purpleCount}/{CARDS_PER_STAGE} purple</span>
          </div>

          {/* Progress dots */}
          <div className="flex flex-wrap gap-1.5 justify-center py-3">
            {deck.map((card) => (
              <div
                key={card.id}
                className={cn('w-2.5 h-2.5 rounded-full', COLOR_DOT[card.color])}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            {/* The flashcard: fixed-size framed card; the whole face lights up with the grade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.12 }}
                className="w-full max-w-xs"
              >
                {(() => {
                  const lit = feedback !== 'idle' && current.color !== 'pending';
                  return (
                    <motion.div
                      animate={lit ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        'aspect-[4/3] w-full rounded-none border-2 shadow-lg flex flex-col items-center justify-center gap-2 transition-colors duration-150',
                        lit ? cn(CARD_LIT[current.color as Exclude<CardColor, 'pending'>], 'text-white') : 'bg-card border-border',
                      )}
                      data-testid="flashcard-card"
                    >
                      <div className="text-5xl sm:text-6xl font-bold tracking-tight" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                        {current.question.display}
                      </div>
                      <div
                        className={cn(
                          'text-4xl sm:text-5xl font-bold min-h-[1.2em]',
                          lit ? 'text-white/90' : 'text-muted-foreground/40',
                        )}
                        data-testid="flashcard-answer"
                      >
                        {answer || '0'}
                      </div>
                      {/* Reserved label slot — identical height lit or idle so the card never resizes */}
                      <div className="h-5 flex items-center justify-center">
                        {lit && (
                          <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                            {current.color}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 pb-6 pt-2">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                disabled={feedback !== 'idle'}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (feedback === 'idle') setAnswer((a) => a + String(num));
                }}
                className="h-14 sm:h-16 rounded-xl bg-secondary text-2xl font-bold active:scale-95 disabled:opacity-50"
                data-testid={`ds-keypad-${num}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={feedback !== 'idle'}
              onPointerDown={(e) => {
                e.preventDefault();
                if (feedback === 'idle') setAnswer((a) => a.slice(0, -1));
              }}
              className="h-14 sm:h-16 rounded-xl bg-muted flex items-center justify-center active:scale-95 disabled:opacity-50"
              data-testid="ds-keypad-delete"
            >
              <Delete className="w-6 h-6" />
            </button>
            <button
              type="button"
              disabled={feedback !== 'idle'}
              onPointerDown={(e) => {
                e.preventDefault();
                if (feedback === 'idle') setAnswer((a) => a + '0');
              }}
              className="h-14 sm:h-16 rounded-xl bg-secondary text-2xl font-bold active:scale-95 disabled:opacity-50"
              data-testid="ds-keypad-0"
            >
              0
            </button>
            <button
              type="button"
              disabled={feedback !== 'idle' || !answer}
              onPointerDown={(e) => {
                e.preventDefault();
                submitAnswer();
              }}
              className="h-14 sm:h-16 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 disabled:opacity-50"
              data-testid="ds-keypad-submit"
            >
              <Check className="w-7 h-7" />
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // Stage select
  return (
    <GameLayout trackName="Flashcards" lockViewport hideGarageButton centerHeader backHref="/hub">
      <div className="flex-1 flex flex-col px-4 pb-8 overflow-y-auto">
        <div className="text-center py-4">
          <h2 className="text-xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Oxanium, sans-serif' }}>
            Flashcards
          </h2>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
            All purple to clear · 20 cards
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-md md:max-w-lg mx-auto w-full">
          {DRIVING_SCHOOL_STAGES.map((s) => {
            const unlocked = isStageUnlocked(s.id, highestCleared);
            const cleared = highestCleared >= s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!unlocked}
                onClick={() => startStage(s)}
                className={cn(
                  'w-full text-left rounded-xl border px-4 py-3 transition-all',
                  unlocked
                    ? 'bg-secondary/80 border-border hover:bg-secondary active:scale-[0.99]'
                    : 'bg-muted/40 border-border/50 opacity-50 cursor-not-allowed',
                )}
                data-testid={`stage-${s.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {s.subtitle}
                      {cleared && <span className="ml-2 text-purple-600">Cleared</span>}
                    </div>
                    <div className="font-bold" style={{ fontFamily: 'Oxanium, sans-serif' }}>
                      {s.title}
                    </div>
                  </div>
                  {!unlocked ? (
                    <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : cleared ? (
                    <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                  ) : (
                    <RotateCcw className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLocation('/hub')}
          className="mt-6 mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Paddock
        </button>
      </div>
    </GameLayout>
  );
}
