import { create } from 'zustand';
import type { Gender, OnboardingData } from '@/types/auth';
import type { FastingProtocol } from '@/types/fasting';

interface OnboardingState {
  displayName: string;
  gender: Gender;
  weightKg: number;
  activityLevel: 'low' | 'moderate' | 'high';
  defaultProtocol: FastingProtocol;
  lastPeriodStart: string | null;
  notificationsEnabled: boolean;

  setDisplayName: (name: string) => void;
  setGender: (gender: Gender) => void;
  setBodyStats: (weightKg: number, activityLevel: 'low' | 'moderate' | 'high') => void;
  setProtocol: (protocol: FastingProtocol) => void;
  setCycleAndNotifications: (lastPeriodStart: string | null, notificationsEnabled: boolean) => void;
  toOnboardingData: () => OnboardingData;
  reset: () => void;
}

function calculateWaterGoalMl(weightKg: number, activityLevel: 'low' | 'moderate' | 'high'): number {
  const base = weightKg * 33;
  const activityBonus = activityLevel === 'high' ? 600 : activityLevel === 'moderate' ? 300 : 0;
  return Math.round((base + activityBonus) / 50) * 50;
}

const initialState = {
  displayName: '',
  gender: 'female' as Gender,
  weightKg: 0,
  activityLevel: 'moderate' as const,
  defaultProtocol: '16:8' as FastingProtocol,
  lastPeriodStart: null,
  notificationsEnabled: false,
};

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  ...initialState,

  setDisplayName: (displayName) => set({ displayName }),
  setGender: (gender) => set({ gender }),
  setBodyStats: (weightKg, activityLevel) => set({ weightKg, activityLevel }),
  setProtocol: (defaultProtocol) => set({ defaultProtocol }),
  setCycleAndNotifications: (lastPeriodStart, notificationsEnabled) =>
    set({ lastPeriodStart, notificationsEnabled }),

  toOnboardingData: (): OnboardingData => {
    const s = get();
    return {
      displayName: s.displayName,
      gender: s.gender,
      weightKg: s.weightKg,
      activityLevel: s.activityLevel,
      defaultProtocol: s.defaultProtocol,
      calculatedWaterGoalMl: calculateWaterGoalMl(s.weightKg, s.activityLevel),
      lastPeriodStart: s.gender === 'female' ? s.lastPeriodStart : null,
      notificationsEnabled: s.notificationsEnabled,
    };
  },

  reset: () => set(initialState),
}));
