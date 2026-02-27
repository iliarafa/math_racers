import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_IOS = 'appl_YOUR_REVENUECAT_API_KEY_HERE';
const ENTITLEMENT_ID = 'premium';
const LOCAL_STORAGE_KEY = 'math-racer-premium';
const DEV_LOCK_KEY = 'math-racer-dev-lock';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initializePurchases(appUserId?: string): Promise<void> {
  if (!isNativePlatform()) return;

  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY_IOS,
    appUserID: appUserId ?? undefined,
  });
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (!isNativePlatform()) {
    // Web: all features unlocked unless dev lock is active
    const devLock = localStorage.getItem(DEV_LOCK_KEY);
    return devLock !== 'true';
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    localStorage.setItem(LOCAL_STORAGE_KEY, isPremium ? 'true' : 'false');
    return isPremium;
  } catch {
    // Offline fallback: use cached value
    return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
  }
}

export async function purchasePremium(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    if (!pkg) return false;

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    if (isPremium) {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    }
    return isPremium;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    localStorage.setItem(LOCAL_STORAGE_KEY, isPremium ? 'true' : 'false');
    return isPremium;
  } catch {
    return false;
  }
}

export async function getPremiumPrice(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    return pkg?.product.priceString ?? null;
  } catch {
    return null;
  }
}
