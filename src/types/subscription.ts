export type SubscriptionTier = 'free' | 'pro';

export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'grace_period'
  | 'unknown';

/** Identifiers for each premium-gated feature. */
export type PremiumFeature =
  | 'ai-meals'
  | 'hormone-coaching'
  | 'unlimited-groups'
  | 'advanced-hydration';

export type BillingPeriod = 'monthly' | 'annual';

export interface SubscriptionProduct {
  id: string;
  billingPeriod: BillingPeriod;
  /** Localised price string returned by RevenueCat, e.g. "$9.99/mo" */
  priceString: string;
  /** Raw price in the app's currency (used for annual savings math) */
  priceUSD: number;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  /** ISO date string of subscription expiry, null when free tier */
  expiresAt: string | null;
  /** RevenueCat customer ID — set after first purchase/restore */
  rcCustomerId: string | null;
}

export interface MealSuggestion {
  title: string;
  description: string;
  /** Approximate prep time in minutes */
  prepMinutes: number;
  tags: string[];
}

export interface MealSuggestionSet {
  breakingFastMeal: MealSuggestion;
  eatingWindowMeal: MealSuggestion;
  snackIdea: MealSuggestion;
  /** ISO date key (YYYY-MM-DD) when this set was generated */
  generatedOn: string;
  /** Fasting protocol the suggestions are tailored to */
  protocol: string;
  /** Cycle phase context used for generation */
  cyclePhase: string;
}

export interface CoachingTip {
  id: string;
  phase: string;
  headline: string;
  body: string;
  actionLabel: string;
}
