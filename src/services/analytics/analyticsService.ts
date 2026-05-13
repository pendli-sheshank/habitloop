/**
 * Thin wrapper over Firebase Analytics.
 * Lazy-loaded so the app still runs in Expo Go and environments without
 * the native Firebase module configured.
 */

let analyticsModule: typeof import('@react-native-firebase/analytics').default | null = null;

async function getAnalytics() {
  if (!analyticsModule) {
    try {
      const mod = await import('@react-native-firebase/analytics');
      analyticsModule = mod.default;
    } catch {
      return null;
    }
  }
  return analyticsModule;
}

export async function logFastingComplete(params: {
  protocol: string;
  durationMinutes: number;
  streakDays: number;
}): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logEvent('fasting_complete', params);
  } catch {
    // Non-fatal
  }
}

export async function logCheckIn(params: {
  groupId: string;
  challengeDay: number;
}): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logEvent('group_check_in', params);
  } catch {
    // Non-fatal
  }
}

export async function logPurchase(params: {
  productId: string;
  billingPeriod: 'monthly' | 'annual';
  priceUSD: number;
}): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logPurchase({
      currency: 'USD',
      value: params.priceUSD,
      items: [{ item_id: params.productId, item_name: params.billingPeriod }],
    });
  } catch {
    // Non-fatal
  }
}

export async function logPaywallView(feature: string): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logEvent('paywall_view', { feature });
  } catch {
    // Non-fatal
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {
    // Non-fatal
  }
}
