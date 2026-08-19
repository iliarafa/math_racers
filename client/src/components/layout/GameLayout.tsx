import { Link } from "wouter";
import { Wrench, Flag, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";
import logoWhiteImage from "@assets/logo-white.svg";

interface GameLayoutProps {
  children: React.ReactNode;
  trackName?: string;
  hideHeader?: boolean;
  hideLogo?: boolean;
  lockViewport?: boolean;
  darkBackground?: boolean;
  /** Full-bleed art behind a dark page. Header goes translucent so the image shows through. */
  backdropSrc?: string;
  hideGarageButton?: boolean;
  centerHeader?: boolean;
  headerRight?: React.ReactNode;
  headerAfterLogo?: React.ReactNode;
  backHref?: string;
  /** When set, the back chevron calls this instead of navigating to backHref. */
  onBack?: () => void;
}

export function GameLayout({ children, trackName, hideHeader = false, hideLogo = false, lockViewport = false, darkBackground = false, backdropSrc, hideGarageButton = false, centerHeader = false, headerRight, headerAfterLogo, backHref, onBack }: GameLayoutProps) {
  const backChevron = (className: string) =>
    onBack ? (
      <button onClick={onBack} className={className} data-testid="button-back">
        <ChevronLeft size={24} />
      </button>
    ) : backHref ? (
      <Link href={backHref}>
        <button className={className} data-testid="button-back">
          <ChevronLeft size={24} />
        </button>
      </Link>
    ) : null;

  const overlayChrome = Boolean(backdropSrc);

  return (
    <div className={cn(
      "text-foreground flex flex-col",
      lockViewport ? "h-screen overflow-hidden" : "min-h-screen",
      overlayChrome ? "relative bg-black" : darkBackground ? "bg-neutral-800" : "bg-background"
    )} style={{ 
      fontFamily: 'Oxanium, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      {backdropSrc && (
        <img
          src={backdropSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-55"
        />
      )}
      {!hideHeader && (
        <header className={cn("py-3 px-3 md:py-4 md:px-6 flex items-center sticky top-0 z-50", overlayChrome ? "bg-transparent" : darkBackground ? "bg-neutral-800/80 backdrop-blur-sm" : "bg-[#ffffff]", centerHeader ? "justify-center relative" : "justify-between", !hideGarageButton && !overlayChrome && (darkBackground ? "border-b border-white/10" : "border-b border-border"))}>
          {centerHeader && backChevron(cn("absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 transition-colors", darkBackground ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-black"))}
          <div className="flex items-center gap-4 md:gap-6">
            {!centerHeader && backChevron(cn("flex items-center justify-center w-10 h-10 transition-colors", darkBackground ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-black"))}
            {!hideLogo && (
              <Link href="/">
                <img
                  src={darkBackground ? logoWhiteImage : logoImage}
                  alt="Math Racer"
                  className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-70 transition-opacity"
                />
              </Link>
            )}
            {headerAfterLogo}
            {trackName && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                <Flag className="w-3 h-3" />
                <span>{trackName}</span>
              </div>
            )}
          </div>

          {!centerHeader && (
            <div className="flex items-center gap-2 md:gap-4">
              {headerRight ? headerRight : !hideGarageButton && (
                <Link href="/garage">
                  <button className={cn("flex items-center justify-center gap-2 text-sm font-medium min-w-11 min-h-11 px-3 rounded-md transition-colors", darkBackground ? "text-white/60 hover:text-white hover:bg-white/10" : "hover:bg-secondary")}>
                    <Wrench className="w-5 h-5" />
                    <span className="hidden sm:inline">Garage</span>
                  </button>
                </Link>
              )}
            </div>
          )}
        </header>
      )}
      {/* Main Content Area */}
      <main className={cn(
        "relative z-10 flex-1 flex flex-col max-w-5xl md:max-w-6xl mx-auto w-full min-h-0",
        lockViewport ? "p-0" : "p-6 md:p-10",
        darkBackground && !overlayChrome && "bg-neutral-800"
      )}>
        {children}
      </main>
    </div>
  );
}
