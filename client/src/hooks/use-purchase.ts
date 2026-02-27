import { useContext } from 'react';
import { PurchaseContext, type PurchaseContextType } from '@/contexts/PurchaseContext';

export function usePurchase(): PurchaseContextType {
  return useContext(PurchaseContext);
}
