import { createContext, useCallback, type ReactNode } from 'react';

export interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  priceString: string | null;
}

// App is free for everyone — paywall fully disabled.
export const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: true,
  isLoading: false,
  purchase: async () => true,
  restore: async () => true,
  priceString: null,
});

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const purchase = useCallback(async (): Promise<boolean> => true, []);
  const restore = useCallback(async (): Promise<boolean> => true, []);

  return (
    <PurchaseContext.Provider
      value={{ isPremium: true, isLoading: false, purchase, restore, priceString: null }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}
