/**
 * Thin wrapper over Firebase Analytics.
 * Lazy-loaded so the app still runs in Expo Go and environments without
 * the native Firebase module configured.
 */

// Minimal interface for the Firebase Analytics methods we use.
interface FirebaseAnalytics {
  logEvent(name: string, params?: Record<string, unknown>): Promise<void>;
  logScreenView(params: { screen_name: string; screen_class: string }): Promise<void>;
  logPurchase(params: {
    currency: string;
    value: number;
    items: Array<{ item_id: string; item_name: string }>;
  }): Promise<void>;
}

type AnalyticsModule = () => FirebaseAnalytics;

let analyticsFactory: AnalyticsModule | null = null;

async function getAnalytics(): Promise<FirebaseAnalytics | null> {
  if (!analyticsFactory) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      analyticsFactory = (require('@react-native-firebase/analytics') as { default: AnalyticsModule }).default;
    } catch {
      return null;
    }
  }
  return analyticsFactory();
}

export async function logFastingComplete(params: {
  protocol: string;
  durationMinutes: number;
  streakDays: number;
}): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics.logEvent('fasting_complete', params);
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
    await analytics.logEvent('group_check_in', params);
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
    await analytics.logPurchase({
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
    await analytics.logEvent('paywall_view', { feature });
  } catch {
    // Non-fatal
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  const analytics = await getAnalytics();
  if (!analytics) return;
  try {
    await analytics.logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {
    // Non-fatal
  }
}
