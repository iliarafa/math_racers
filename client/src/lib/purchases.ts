import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_IOS = 'appl_GNdLSBXrzRMRwqgDoydsQNCUXmb';
const ENTITLEMENT_ID = 'premium';
const LOCAL_STORAGE_KEY = 'math-racer-premium';
const DEV_LOCK_KEY = 'math-racer-dev-lock';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initializePurchases(appUserId?: string): Promise<void> {
  console.log('[RC] Platform:', Capacitor.getPlatform(), 'isNative:', isNativePlatform());
  if (!isNativePlatform()) return;

  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY_IOS,
    appUserID: appUserId ?? undefined,
  });
  console.log('[RC] ✅ Configured successfully');
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
    console.log('[RC] Customer entitlements:', JSON.stringify(customerInfo.entitlements));
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    console.log('[RC] isPremium:', isPremium);
    localStorage.setItem(LOCAL_STORAGE_KEY, isPremium ? 'true' : 'false');
    return isPremium;
  } catch (e) {
    console.error('[RC] ❌ checkPremiumStatus failed:', e);
    // On native error, default to locked (false) so paywall is testable
    return false;
  }
}

export async function purchasePremium(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    console.log('[RC] Offerings:', JSON.stringify(offerings));
    const pkg = offerings.current?.availablePackages[0];
    if (!pkg) {
      console.warn('[RC] ⚠️ No packages available');
      return false;
    }
    console.log('[RC] Purchasing package:', pkg.identifier, pkg.product.priceString);

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const isPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    console.log('[RC] Purchase result - isPremium:', isPremium);
    if (isPremium) {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    }
    return isPremium;
  } catch (e) {
    console.error('[RC] ❌ Purchase failed:', e);
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
  } catch (e) {
    console.error('[RC] ❌ restorePurchases failed:', e);
    return false;
  }
}

export interface PriceResult {
  price: string | null;
  diagnostics: string;
}

export async function getPremiumPrice(): Promise<PriceResult> {
  if (!isNativePlatform()) return { price: null, diagnostics: 'web platform' };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();

    const allIds = offerings.all ? Object.keys(offerings.all) : [];
    const currentId = offerings.current?.identifier ?? 'none';
    const pkgCount = offerings.current?.availablePackages?.length ?? 0;
    const pkg = offerings.current?.availablePackages[0];

    const diag = `offerings=[${allIds.join(',')}] current=${currentId} pkgs=${pkgCount}`;
    console.log('[RC] Offerings detail:', diag);

    if (pkg) {
      console.log('[RC] Price:', pkg.product.priceString);
      return { price: pkg.product.priceString, diagnostics: diag };
    }

    return { price: null, diagnostics: diag };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[RC] ❌ getPremiumPrice failed:', e);
    return { price: null, diagnostics: `error: ${msg}` };
  }
}
