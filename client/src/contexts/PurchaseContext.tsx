import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  initializePurchases,
  checkPremiumStatus,
  purchasePremium,
  restorePurchases,
  getPremiumPrice,
  isNativePlatform,
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
  const [isPremium, setIsPremium] = useState(() => !isNativePlatform());
  const [isLoading, setIsLoading] = useState(true);
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const raw = localStorage.getItem('f1-math-racer-state');
        const playerId = raw ? JSON.parse(raw).playerId : undefined;

        await initializePurchases(playerId);
        const status = await checkPremiumStatus();
        setIsPremium(status);

        const { price } = await getPremiumPrice();
        setPriceString(price);
      } catch {
        // On native, default to locked so paywall can be tested
        // On web, default to unlocked so dev isn't blocked
        setIsPremium(!isNativePlatform());
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
