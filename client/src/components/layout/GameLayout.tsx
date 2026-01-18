import { Link } from "wouter";
import { Trophy, Wrench, Flag, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

interface GameLayoutProps {
  children: React.ReactNode;
  coins: number;
  trackName?: string;
  hideHeader?: boolean;
  lockViewport?: boolean;
  darkBackground?: boolean;
  hideGarageButton?: boolean;
}

export function GameLayout({ children, coins, trackName, hideHeader = false, lockViewport = false, darkBackground = false, hideGarageButton = false }: GameLayoutProps) {
  return (
    <div className={cn(
      "text-foreground flex flex-col",
      lockViewport ? "h-screen overflow-hidden" : "min-h-screen",
      darkBackground ? "bg-black" : "bg-background"
    )} style={{ fontFamily: 'Formula1, sans-serif' }}>
      {!hideHeader && (
        <header className="border-b border-border py-3 px-3 md:py-4 md:px-6 flex justify-between items-center sticky top-0 z-50 bg-[#6e6e6e]">
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/">
              <img 
                src={logoImage} 
                alt="Math Racer" 
                className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-70 transition-opacity"
              />
            </Link>
            
            {trackName && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                <Flag className="w-3 h-3" />
                <span>{trackName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {!hideGarageButton && (
              <Link href="/garage">
                <button className="flex items-center justify-center gap-2 text-sm font-medium hover:bg-secondary min-w-11 min-h-11 px-3 rounded-md transition-colors">
                  <Wrench className="w-5 h-5" />
                  <span className="hidden sm:inline">Garage</span>
                </button>
              </Link>
            )}
            
            <div className="flex items-center gap-1.5 md:gap-2 text-sm px-2 md:px-3 py-1.5 rounded-md bg-[#ffffff]" style={{ fontFamily: 'Formula1' }}>
              <Trophy className="w-3 h-3" />
              <span>{coins}</span>
            </div>
          </div>
        </header>
      )}
      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col max-w-5xl mx-auto w-full min-h-0",
        lockViewport ? "p-0" : "p-6",
        darkBackground && "bg-black"
      )}>
        {children}
      </main>
    </div>
  );
}
