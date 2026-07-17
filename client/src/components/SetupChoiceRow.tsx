import { cn } from '@/lib/utils';
import { SETUP_INACTIVE_TEXT } from '@/lib/gameLogic';

export type SetupChoiceOption = {
  id: string;
  text: string;
};

interface SetupChoiceRowProps {
  label: string;
  left: SetupChoiceOption;
  right: SetupChoiceOption;
  value: string;
  onChange: (id: string) => void;
  variant?: 'dark' | 'light';
  /** Per-option active color; defaults to green */
  activeColors?: Record<string, string>;
  leftTestId?: string;
  rightTestId?: string;
  className?: string;
}

const DEFAULT_ACTIVE = '#22c55e';

export function SetupChoiceRow({
  label,
  left,
  right,
  value,
  onChange,
  variant = 'dark',
  activeColors,
  leftTestId,
  rightTestId,
  className,
}: SetupChoiceRowProps) {
  const labelClass =
    variant === 'light' ? 'text-gray-500' : 'text-white/50';
  const inactiveColor =
    variant === 'light' ? 'rgba(0,0,0,0.35)' : SETUP_INACTIVE_TEXT;

  const optionStyle = (id: string, active: boolean) => ({
    fontFamily: 'Oxanium, sans-serif',
    color: active
      ? (activeColors?.[id] ?? DEFAULT_ACTIVE)
      : inactiveColor,
    background: 'transparent' as const,
    opacity: active ? 1 : 0.45,
  });

  return (
    <div className={cn('grid grid-cols-3 items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onChange(left.id)}
        className="px-2 py-2 text-sm font-bold uppercase tracking-wider text-left sm:text-center transition-all"
        style={optionStyle(left.id, value === left.id)}
        data-testid={leftTestId}
      >
        {left.text}
      </button>
      <div
        className={cn(
          'text-sm uppercase tracking-wider text-center font-medium pointer-events-none',
          labelClass
        )}
        style={{ fontFamily: 'Oxanium, sans-serif' }}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={() => onChange(right.id)}
        className="px-2 py-2 text-sm font-bold uppercase tracking-wider text-right sm:text-center transition-all"
        style={optionStyle(right.id, value === right.id)}
        data-testid={rightTestId}
      >
        {right.text}
      </button>
    </div>
  );
}
