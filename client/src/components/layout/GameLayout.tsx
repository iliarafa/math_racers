import { Link } from "wouter";
import { Wrench, Flag, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

interface GameLayoutProps {
  children: React.ReactNode;
  trackName?: string;
  hideHeader?: boolean;
  lockViewport?: boolean;
  darkBackground?: boolean;
  hideGarageButton?: boolean;
  centerHeader?: boolean;
  headerRight?: React.ReactNode;
  headerAfterLogo?: React.ReactNode;
  backHref?: string;
}

export function GameLayout({ children, trackName, hideHeader = false, lockViewport = false, darkBackground = false, hideGarageButton = false, centerHeader = false, headerRight, headerAfterLogo, backHref }: GameLayoutProps) {
  return (
    <div className={cn(
      "text-foreground flex flex-col",
      lockViewport ? "h-screen overflow-hidden" : "min-h-screen",
      darkBackground ? "bg-black" : "bg-background"
    )} style={{ 
      fontFamily: 'Oxanium, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      {!hideHeader && (
        <header className={cn("py-3 px-3 md:py-4 md:px-6 flex items-center sticky top-0 z-50 bg-[#ffffff]", centerHeader ? "justify-center relative" : "justify-between", !hideGarageButton && "border-b border-border")}>
          {backHref && centerHeader && (
            <Link href={backHref}>
              <button className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-gray-500 hover:text-black transition-colors">
                <ChevronLeft size={24} />
              </button>
            </Link>
          )}
          <div className="flex items-center gap-4 md:gap-6">
            {backHref && !centerHeader && (
              <Link href={backHref}>
                <button className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-black transition-colors">
                  <ChevronLeft size={24} />
                </button>
              </Link>
            )}
            <Link href="/">
              <img
                src={logoImage}
                alt="Math Racer"
                className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-70 transition-opacity"
              />
            </Link>
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
                  <button className="flex items-center justify-center gap-2 text-sm font-medium hover:bg-secondary min-w-11 min-h-11 px-3 rounded-md transition-colors">
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
        "flex-1 flex flex-col max-w-5xl md:max-w-6xl mx-auto w-full min-h-0",
        lockViewport ? "p-0" : "p-6 md:p-10",
        darkBackground && "bg-black"
      )}>
        {children}
      </main>
    </div>
  );
}
