import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionState, SubscriptionTier, PremiumFeature } from '@/types/subscription';

// Features available at each tier
const PRO_FEATURES: PremiumFeature[] = [
  'ai-meals',
  'hormone-coaching',
  'unlimited-groups',
  'advanced-hydration',
];

interface SubscriptionStore {
  tier: SubscriptionTier;
  status: SubscriptionState['status'];
  expiresAt: string | null;
  rcCustomerId: string | null;

  // Derived helpers
  isPremium: boolean;
  canAccess: (feature: PremiumFeature) => boolean;

  // Actions
  setSubscriptionState: (state: SubscriptionState) => void;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      tier: 'pro' as SubscriptionTier,
      status: 'active' as SubscriptionState['status'],
      expiresAt: null,
      rcCustomerId: null,
      isPremium: true,

      canAccess: (_feature: PremiumFeature) => true,

      setSubscriptionState: (state: SubscriptionState) =>
        set({
          tier: state.tier,
          status: state.status,
          expiresAt: state.expiresAt,
          rcCustomerId: state.rcCustomerId,
          // Always keep isPremium true regardless of subscription state
          isPremium: true,
        }),

      clearSubscription: () =>
        set({
          tier: 'pro',
          status: 'active',
          expiresAt: null,
          rcCustomerId: null,
          isPremium: true,
        }),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tier: state.tier,
        status: state.status,
        expiresAt: state.expiresAt,
        rcCustomerId: state.rcCustomerId,
        isPremium: state.isPremium,
      }),
    }
  )
);
