import { Link } from "wouter";
import { Trophy, Wrench, Flag, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/1Asset_3@2x_1767902844976.png";

interface GameLayoutProps {
  children: React.ReactNode;
  coins: number;
  trackName?: string;
  hideHeader?: boolean;
}

export function GameLayout({ children, coins, trackName, hideHeader = false }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {!hideHeader && (
        <header className="border-b border-border py-3 px-3 md:py-4 md:px-6 flex justify-between items-center bg-white sticky top-0 z-50">
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
            <Link href="/garage">
              <button className="flex items-center gap-2 text-sm font-medium hover:bg-secondary px-2 md:px-3 py-2 rounded-md transition-colors">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Garage</span>
              </button>
            </Link>
            
            <div className="flex items-center gap-1.5 md:gap-2 font-mono text-sm bg-secondary px-2 md:px-3 py-1.5 rounded-md">
              <Trophy className="w-3 h-3" />
              <span>{coins}</span>
            </div>
          </div>
        </header>
      )}
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6">
        {children}
      </main>
    </div>
  );
}
