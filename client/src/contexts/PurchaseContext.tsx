import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  initializePurchases,
  checkPremiumStatus,
  purchasePremium,
  restorePurchases,
  getPremiumPrice,
} from '@/lib/purchases';

export interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  priceString: string | null;
}

export const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: true,
  isLoading: true,
  purchase: async () => false,
  restore: async () => false,
  priceString: null,
});

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Read playerId from game state for RevenueCat user identification
        const raw = localStorage.getItem('f1-math-racer-state');
        const playerId = raw ? JSON.parse(raw).playerId : undefined;

        await initializePurchases(playerId);
        const status = await checkPremiumStatus();
        setIsPremium(status);

        const price = await getPremiumPrice();
        setPriceString(price);
      } catch {
        // On error, default to unlocked so users aren't stuck
        setIsPremium(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const purchase = useCallback(async (): Promise<boolean> => {
    const success = await purchasePremium();
    if (success) setIsPremium(true);
    return success;
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await restorePurchases();
    setIsPremium(success);
    return success;
  }, []);

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchase, restore, priceString }}>
      {children}
    </PurchaseContext.Provider>
  );
}
