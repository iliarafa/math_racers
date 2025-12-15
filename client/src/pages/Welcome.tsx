import { motion } from "framer-motion";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState } from "@/lib/gameLogic";
import { Play, Wrench, Trophy } from "lucide-react";
import generatedCar from "@assets/generated_images/top_down_view_of_a_red_f1_race_car_vector_illustration.png";

export default function Welcome() {
  const { state } = useGameState();

  return (
    <GameLayout coins={state.coins}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-accent text-lg font-bold tracking-[0.2em] uppercase">Rookie Driver Detected</h2>
            <h1 className="font-racing text-5xl md:text-7xl lg:text-8xl leading-none text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
              GRAND PRIX <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">MATH RACER</span>
            </h1>
            <p className="text-xl text-neutral-400 max-w-lg mx-auto leading-relaxed">
              Welcome to the pit lane! Your team needs your <span className="text-white font-bold">math skills</span> to fuel the car and win the Championship Cup!
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-md mx-auto w-full">
             <Link href="/game">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-primary hover:bg-red-500 text-white font-racing text-2xl py-6 px-8 rounded-xl shadow-[0_6px_0_rgb(153,27,27)] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center gap-3 border-2 border-white/10"
              >
                <Play className="w-8 h-8 fill-current" />
                START ENGINE
              </motion.button>
            </Link>

            <Link href="/garage">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-racing text-xl py-6 px-8 rounded-xl shadow-[0_6px_0_rgb(38,38,38)] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center gap-3 border-2 border-neutral-600"
              >
                <Wrench className="w-6 h-6" />
                GARAGE
              </motion.button>
            </Link>
          </div>

          <div className="pt-12 relative h-48 flex items-center justify-center">
             <motion.img 
               src={generatedCar} 
               alt="F1 Car"
               className="w-32 md:w-48 drop-shadow-2xl absolute"
               animate={{ 
                 y: [0, -5, 0],
               }}
               transition={{ 
                 repeat: Infinity, 
                 duration: 2,
                 ease: "easeInOut"
               }}
             />
             <div className="absolute bottom-0 w-64 h-4 bg-black/50 blur-xl rounded-full"></div>
          </div>

        </motion.div>
      </div>
    </GameLayout>
  );
}
