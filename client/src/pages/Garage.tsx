import { Link } from "wouter";
import { GameLayout } from "@/components/layout/GameLayout";
import { useGameState, SHOP_ITEMS } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { Lock, Check, ChevronLeft } from "lucide-react";

export default function Garage() {
  const { state, buyItem, equipItem } = useGameState();

  const liveries = SHOP_ITEMS.filter(i => i.type === 'livery');
  const tires = SHOP_ITEMS.filter(i => i.type === 'tires');

  return (
    <GameLayout coins={state.coins}>
      <div className="space-y-8">
        
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Garage</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Simple Inventory List - Liveries */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-2">
               <h2 className="font-semibold">Team Colors</h2>
               <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{liveries.length} items</span>
            </div>
            
            <div className="grid gap-3">
              {liveries.map(item => {
                const isUnlocked = state.unlockedItems.includes(item.id);
                const isEquipped = state.equippedLivery === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => isUnlocked ? equipItem(item.id, 'livery') : buyItem(item.id, item.cost)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-all text-left",
                      isEquipped ? "border-primary ring-1 ring-primary" : "border-border hover:border-gray-300",
                      !isUnlocked && "opacity-70"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-6 h-6 rounded-full border border-black/10", item.color)}></div>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        {!isUnlocked && <div className="text-xs text-muted-foreground">{item.cost} Coins</div>}
                      </div>
                    </div>

                    <div>
                      {isEquipped ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : isUnlocked ? (
                        <div className="text-xs font-medium text-muted-foreground">Select</div>
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Tires */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-2">
               <h2 className="font-semibold">Compounds</h2>
               <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{tires.length} items</span>
            </div>

             <div className="grid gap-3">
              {tires.map(item => {
                const isUnlocked = state.unlockedItems.includes(item.id);
                const isEquipped = state.equippedTires === item.id;

                return (
                   <button
                    key={item.id}
                    onClick={() => isUnlocked ? equipItem(item.id, 'tires') : buyItem(item.id, item.cost)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-all text-left",
                      isEquipped ? "border-primary ring-1 ring-primary" : "border-border hover:border-gray-300",
                      !isUnlocked && "opacity-70"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-6 h-6 rounded-full border-4 bg-neutral-900", item.color)}></div>
                       <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        {!isUnlocked && <div className="text-xs text-muted-foreground">{item.cost} Coins</div>}
                      </div>
                    </div>

                    <div>
                      {isEquipped ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : isUnlocked ? (
                        <div className="text-xs font-medium text-muted-foreground">Select</div>
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

        </div>
      </div>
    </GameLayout>
  );
}
