import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Wraps an index around both ends of a list. */
function getWrappedIndex(current: number, offset: number, length: number): number {
  return ((current + offset) % length + length) % length;
}

interface SetupDrumProps {
  length: number;
  currentIndex: number;
  /** Receives the already-wrapped next index. */
  onIndexChange: (next: number) => void;
  renderItem: (index: number) => React.ReactNode;
  testIdPrefix: string;
  ariaLabelPrev?: string;
  ariaLabelNext?: string;
  itemHeight?: number;
  chevronSize?: number;
}

/**
 * One-item stepper: chevrons, horizontal swipe, and arrow keys move through a list.
 *
 * Dark surfaces only — the chevrons are hardcoded `text-white/35`. Multiplayer's setup
 * card is light themed, so adopting this there means parameterizing that first.
 */
export function SetupDrum({
  length,
  currentIndex,
  onIndexChange,
  renderItem,
  testIdPrefix,
  ariaLabelPrev = 'Previous',
  ariaLabelNext = 'Next',
  itemHeight = 80,
  chevronSize = 14,
}: SetupDrumProps) {
  const swipeStartXRef = useRef<number | null>(null);
  const itemH = itemHeight;

  const step = (offset: number) => onIndexChange(getWrappedIndex(currentIndex, offset, length));

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      swipeStartXRef.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (swipeStartXRef.current === null) return;
      const diff = swipeStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 30) {
        step(diff > 0 ? 1 : -1);
      }
      swipeStartXRef.current = null;
    },
    onTouchCancel: () => {
      swipeStartXRef.current = null;
    },
  };

  return (
    <div
      className="w-full flex items-center justify-center gap-2 outline-none focus:outline-none"
      // `pan-y` (not `none`) so a vertical drag starting on the drum still scrolls the
      // page. Swipe detection is JS touch-event based, so this doesn't disable it.
      style={{ height: itemH, overflow: 'hidden', touchAction: 'pan-y', position: 'relative' }}
      {...swipeHandlers}
      tabIndex={0}
      data-testid={`${testIdPrefix}-drum`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          step(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          step(1);
        }
      }}
      aria-label={`Selection ${currentIndex + 1} of ${length}`}
    >
      <button
        type="button"
        className="shrink-0 p-1 text-white/35 outline-none focus:outline-none focus-visible:outline-none"
        aria-label={ariaLabelPrev}
        onClick={() => step(-1)}
        data-testid={`${testIdPrefix}-prev`}
      >
        <ChevronLeft size={chevronSize} />
      </button>

      <motion.div
        key={`${testIdPrefix}-${currentIndex}`}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className="w-auto min-w-[5rem] flex items-center justify-center"
        style={{ height: itemH }}
        aria-current={true}
        data-testid={`${testIdPrefix}-slot-0`}
      >
        {renderItem(currentIndex)}
      </motion.div>

      <button
        type="button"
        className="shrink-0 p-1 text-white/35 outline-none focus:outline-none focus-visible:outline-none"
        aria-label={ariaLabelNext}
        onClick={() => step(1)}
        data-testid={`${testIdPrefix}-next`}
      >
        <ChevronRight size={chevronSize} />
      </button>
    </div>
  );
}
