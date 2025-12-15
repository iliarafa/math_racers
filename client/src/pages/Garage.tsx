import { motion } from "framer-motion";
import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, SHOP_ITEMS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Lock, Check, ChevronLeft } from "lucide-react";
import generatedCar from "@assets/generated_images/red_f1_car_facing_right_on_black_background.png";
import generatedHelmet from "@assets/generated_images/racing_helmet_icon.png";

export default function Garage() {
  const { state, buyItem, equipItem } = useGameState();

  const liveries = SHOP_ITEMS.filter(i => i.type === 'livery');
  const tires = SHOP_ITEMS.filter(i => i.type === 'tires');

  return (
    <GameLayout coins={state.coins}>
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <button className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            </Link>
            <h1 className="font-racing text-4xl text-white">TEAM GARAGE</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Visualizer Panel */}
            <div className="bg-neutral-800 rounded-3xl p-8 border border-neutral-700 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group">
              <div className="absolute inset-0 bg-checkered opacity-5"></div>
              
              <div className="relative z-10 text-center space-y-2 mb-8">
                 <h2 className="text-neutral-400 font-mono text-sm tracking-widest uppercase">Current Configuration</h2>
                 <div className="text-2xl font-racing text-white">
                   {SHOP_ITEMS.find(i => i.id === state.equippedLivery)?.name}
                 </div>
              </div>

              <motion.img 
                key={state.equippedLivery} // Force re-render animation
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={generatedCar} 
                alt="Your Car"
                className={cn(
                   "w-48 drop-shadow-2xl transition-all duration-500 mix-blend-screen",
                   state.equippedLivery === 'blue-livery' && "hue-rotate-180",
                   state.equippedLivery === 'orange-livery' && "hue-rotate-30",
                   state.equippedLivery === 'silver-livery' && "grayscale contrast-125",
                )}
              />
              
              {/* Tire Indicator (Visual only for now since we can't easily change tires on the raster image without separate layers, 
                  but we can show a UI badge) */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                 <div className={cn("w-3 h-3 rounded-full border-2", 
                    state.equippedTires === 'soft-tires' ? 'border-red-500' : 
                    state.equippedTires === 'medium-tires' ? 'border-yellow-400' : 'border-white'
                 )}></div>
                 <span className="text-xs text-white font-mono">{SHOP_ITEMS.find(i => i.id === state.equippedTires)?.name.split(' ')[0]} Compound</span>
              </div>
            </div>

            {/* Shop Items */}
            <div className="space-y-8">
              
              {/* Liveries Section */}
              <section className="space-y-4">
                <h3 className="font-racing text-2xl text-accent flex items-center gap-2">
                  CAR LIVERIES <span className="text-sm font-mono text-neutral-500 font-normal">(Team Colors)</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {liveries.map(item => {
                    const isUnlocked = state.unlockedItems.includes(item.id);
                    const isEquipped = state.equippedLivery === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => isUnlocked ? equipItem(item.id, 'livery') : buyItem(item.id, item.cost)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                          isEquipped ? "border-primary bg-primary/10" : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-500"
                        )}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={cn("w-8 h-8 rounded-full shadow-inner", item.color)}></div>
                          <div className="text-left">
                            <div className="font-bold text-white">{item.name}</div>
                            {!isUnlocked && <div className="text-xs text-accent font-mono">{item.cost} Coins</div>}
                          </div>
                        </div>

                        <div className="relative z-10">
                          {isEquipped ? (
                            <div className="flex items-center gap-1 text-primary text-sm font-bold uppercase">
                              <Check className="w-4 h-4" /> Equipped
                            </div>
                          ) : isUnlocked ? (
                            <div className="text-neutral-400 text-sm font-mono uppercase">Select</div>
                          ) : (
                            <Lock className="w-5 h-5 text-neutral-600" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Tires Section */}
               <section className="space-y-4">
                <h3 className="font-racing text-2xl text-accent flex items-center gap-2">
                  TIRE COMPOUND <span className="text-sm font-mono text-neutral-500 font-normal">(Visual Only)</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {tires.map(item => {
                    const isUnlocked = state.unlockedItems.includes(item.id);
                    const isEquipped = state.equippedTires === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => isUnlocked ? equipItem(item.id, 'tires') : buyItem(item.id, item.cost)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                          isEquipped ? "border-primary bg-primary/10" : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-500"
                        )}
                      >
                         <div className="flex items-center gap-4 relative z-10">
                          <div className={cn("w-8 h-8 rounded-full border-4 bg-neutral-900", item.color)}></div>
                          <div className="text-left">
                            <div className="font-bold text-white">{item.name}</div>
                            {!isUnlocked && <div className="text-xs text-accent font-mono">{item.cost} Coins</div>}
                          </div>
                        </div>

                        <div className="relative z-10">
                          {isEquipped ? (
                            <div className="flex items-center gap-1 text-primary text-sm font-bold uppercase">
                              <Check className="w-4 h-4" /> Equipped
                            </div>
                          ) : isUnlocked ? (
                            <div className="text-neutral-400 text-sm font-mono uppercase">Select</div>
                          ) : (
                            <Lock className="w-5 h-5 text-neutral-600" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
