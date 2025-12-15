import { motion } from "framer-motion";
import { Link } from "wouter";
import { Trophy, Wrench, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import generatedCar from "@assets/generated_images/top_down_view_of_a_red_f1_race_car_vector_illustration.png";

interface GameLayoutProps {
  children: React.ReactNode;
  coins: number;
  trackName?: string;
}

export function GameLayout({ children, coins, trackName }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-900 text-white font-mono relative overflow-hidden flex flex-col">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`, 
             backgroundSize: '20px 20px' 
           }}>
      </div>

      {/* Top Bar / HUD */}
      <header className="relative z-10 bg-neutral-900/90 border-b-4 border-primary p-4 flex justify-between items-center shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="cursor-pointer group">
              <h1 className="font-racing text-2xl md:text-3xl italic tracking-wider text-white group-hover:text-primary transition-colors">
                F1 <span className="text-primary group-hover:text-white transition-colors">RACER</span>
              </h1>
            </div>
          </Link>
          {trackName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-neutral-800 border border-neutral-700">
              <Flag className="w-4 h-4 text-accent" />
              <span className="text-sm uppercase tracking-widest text-neutral-400">{trackName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/garage">
            <button className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 px-4 py-2 rounded-full transition-all active:scale-95 group">
              <Wrench className="w-4 h-4 text-neutral-400 group-hover:text-white" />
              <span className="text-sm font-bold">Garage</span>
            </button>
          </Link>
          
          <div className="flex items-center gap-2 bg-neutral-950 border border-accent/30 px-5 py-2 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            <Trophy className="w-5 h-5 text-accent animate-pulse" />
            <span className="font-racing text-xl text-accent tabular-nums">{coins}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col">
        {children}
      </main>

      {/* Decorative Moving Asphalt Lines (Speed effect) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
         <div className="absolute top-0 left-[20%] w-1 h-full bg-white animate-drive" style={{ animationDuration: '0.5s' }}></div>
         <div className="absolute top-0 right-[20%] w-1 h-full bg-white animate-drive" style={{ animationDuration: '0.6s' }}></div>
      </div>
    </div>
  );
}
