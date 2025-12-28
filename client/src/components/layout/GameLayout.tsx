import { Link } from "wouter";
import { Trophy, Wrench, Flag, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameLayoutProps {
  children: React.ReactNode;
  coins: number;
  trackName?: string;
}

export function GameLayout({ children, coins, trackName }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Minimal Header */}
      <header className="border-b border-border py-4 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/">
            <h1 className="text-xl font-bold tracking-tight cursor-pointer hover:opacity-70 transition-opacity">MATH RACERS / F1 EDITION</h1>
          </Link>
          
          {trackName && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              <Flag className="w-3 h-3" />
              <span>{trackName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/garage">
            <button className="flex items-center gap-2 text-sm font-medium hover:bg-secondary px-3 py-2 rounded-md transition-colors">
              <Wrench className="w-4 h-4" />
              Garage
            </button>
          </Link>
          
          <div className="flex items-center gap-2 font-mono text-sm bg-secondary px-3 py-1.5 rounded-md">
            <Trophy className="w-3 h-3" />
            <span>{coins}</span>
          </div>
        </div>
      </header>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6">
        {children}
      </main>
    </div>
  );
}
