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
  const [isPremium, setIsPremium] = useState(true); // TODO: revert to () => !isNativePlatform()
  const [isLoading, setIsLoading] = useState(true);
  const [priceString, setPriceString] = useState<string | null>(null);

  // TODO: revert this useEffect to restore purchase checking
  useEffect(() => {
    setIsLoading(false);
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
