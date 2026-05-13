/**
 * RevenueCat subscription service.
 *
 * react-native-purchases is lazy-loaded so the app still runs in Expo Go and
 * on simulators without a StoreKit/Play Billing environment. Every exported
 * function returns a safe free-tier default when the SDK is unavailable.
 */

import type { SubscriptionState, SubscriptionStatus } from '@/types/subscription';

const ENTITLEMENT_PRO = 'pro';

let Purchases: typeof import('react-native-purchases').default | null = null;

async function getPurchases() {
  if (!Purchases) {
    try {
      const mod = await import('react-native-purchases');
      Purchases = mod.default;
    } catch {
      return null;
    }
  }
  return Purchases;
}

const FREE_STATE: SubscriptionState = {
  tier: 'free',
  status: 'unknown',
  expiresAt: null,
  rcCustomerId: null,
};

/** Configure RevenueCat with the user's ID. Call once after sign-in. */
export async function initializeRevenueCat(
  apiKey: string,
  userId: string,
): Promise<void> {
  const P = await getPurchases();
  if (!P) return;

  try {
    P.configure({ apiKey, appUserID: userId });
  } catch (e) {
    console.error('[subscriptionService] configure failed:', e);
  }
}

/** Derive SubscriptionState from the current RevenueCat customer info. */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const P = await getPurchases();
  if (!P) return FREE_STATE;

  try {
    const info = await P.getCustomerInfo();
    const entitlement = info.entitlements.active[ENTITLEMENT_PRO];

    if (!entitlement) {
      return {
        tier: 'free',
        status: 'unknown',
        expiresAt: null,
        rcCustomerId: info.originalAppUserId,
      };
    }

    const status: SubscriptionStatus = entitlement.isActive
      ? 'active'
      : 'expired';

    return {
      tier: entitlement.isActive ? 'pro' : 'free',
      status,
      expiresAt: entitlement.expirationDate ?? null,
      rcCustomerId: info.originalAppUserId,
    };
  } catch (e) {
    console.error('[subscriptionService] getCustomerInfo failed:', e);
    return FREE_STATE;
  }
}

/**
 * Purchase a RevenueCat package by product identifier.
 * Returns the updated subscription state, or the current free state on error.
 */
export async function purchaseProduct(
  productId: string,
): Promise<SubscriptionState> {
  const P = await getPurchases();
  if (!P) return FREE_STATE;

  try {
    const offerings = await P.getOfferings();
    const current = offerings.current;
    if (!current) throw new Error('No current offering');

    const pkg = current.availablePackages.find(
      p => p.product.identifier === productId,
    );
    if (!pkg) throw new Error(`Product ${productId} not found in offering`);

    await P.purchasePackage(pkg);
    return getSubscriptionState();
  } catch (e: unknown) {
    // User cancelled purchase — not an error worth logging loudly
    if (
      e instanceof Error &&
      'userCancelled' in (e as Record<string, unknown>) &&
      (e as Record<string, unknown>).userCancelled === true
    ) {
      return getSubscriptionState();
    }
    console.error('[subscriptionService] purchaseProduct failed:', e);
    return getSubscriptionState();
  }
}

/** Restore previous purchases. Returns updated subscription state. */
export async function restorePurchases(): Promise<SubscriptionState> {
  const P = await getPurchases();
  if (!P) return FREE_STATE;

  try {
    await P.restorePurchases();
    return getSubscriptionState();
  } catch (e) {
    console.error('[subscriptionService] restorePurchases failed:', e);
    return getSubscriptionState();
  }
}
