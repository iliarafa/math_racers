import { SetupDrum } from './SetupDrum';

export const SETUP_SECTION_TITLE_CLASS =
  'mb-1 md:mb-1.5 text-center text-sm font-bold uppercase tracking-widest text-white/90';

type SetupDrumProps = React.ComponentProps<typeof SetupDrum>;

interface SetupDrumRowProps extends SetupDrumProps {
  /** Shown above the drum, e.g. LEVEL / VIEW / WEATHER. */
  title: string;
}

/**
 * A titled drum — the setup-screen unit. Use `SetupDrum` directly when a drum needs
 * no title (Lane Racer's track hero).
 */
export function SetupDrumRow({ title, ...drumProps }: SetupDrumRowProps) {
  return (
    <div className="flex flex-col items-center">
      <span className={SETUP_SECTION_TITLE_CLASS} style={{ fontFamily: 'Oxanium, sans-serif' }}>
        {title}
      </span>
      <SetupDrum {...drumProps} />
    </div>
  );
}
