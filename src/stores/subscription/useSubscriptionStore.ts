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

const DEFAULT: Pick<SubscriptionStore, 'tier' | 'status' | 'expiresAt' | 'rcCustomerId' | 'isPremium'> = {
  tier: 'free',
  status: 'unknown',
  expiresAt: null,
  rcCustomerId: null,
  isPremium: false,
};

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT,

      canAccess: (feature: PremiumFeature) => {
        if (get().isPremium) return true;
        // Free tier has no access to any premium feature
        return !PRO_FEATURES.includes(feature);
      },

      setSubscriptionState: (state: SubscriptionState) =>
        set({
          tier: state.tier,
          status: state.status,
          expiresAt: state.expiresAt,
          rcCustomerId: state.rcCustomerId,
          isPremium: state.tier === 'pro' && state.status === 'active',
        }),

      clearSubscription: () => set({ ...DEFAULT }),
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
