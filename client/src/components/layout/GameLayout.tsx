import { Link } from "wouter";
import { Trophy, Wrench, Flag, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/Screenshot_2026-01-08_at_10.44.48_AM_1767888534040.png";

interface GameLayoutProps {
  children: React.ReactNode;
  coins: number;
  trackName?: string;
}

export function GameLayout({ children, coins, trackName }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6">
        {children}
      </main>
    </div>
  );
}
