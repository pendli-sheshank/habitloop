export type AuthStatus =
  | 'unknown'
  | 'unauthenticated'
  | 'needs-onboarding'
  | 'authenticated';

export type Gender = 'male' | 'female' | 'other';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'email' | 'google';
  createdAt: number; // Unix ms
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  provider: 'email' | 'google';
  onboardingComplete: boolean;
  createdAt: number; // Unix ms (mapped from Firestore Timestamp)
  lastActiveAt: number; // Unix ms
  expoPushToken: string | null;
}

import type { FastingProtocol } from './fasting';

export interface UserSettings {
  defaultProtocol: FastingProtocol;
  gender: Gender;
  weightKg: number;
  activityLevel: 'low' | 'moderate' | 'high';
  calculatedWaterGoalMl: number;
  notifications: {
    fastingReminders: boolean;
    hydrationReminders: boolean;
    socialNudges: boolean;
  };
  cycle: {
    lastPeriodStart: string | null; // ISO date
    avgCycleLength: number;
    avgPeriodLength: number;
  };
  privacy: {
    shareActivityWithGroup: boolean;
    anonymousInLeaderboard: boolean;
  };
}

export interface OnboardingData {
  displayName: string;
  gender: Gender;
  weightKg: number;
  activityLevel: 'low' | 'moderate' | 'high';
  defaultProtocol: FastingProtocol;
  calculatedWaterGoalMl: number;
  lastPeriodStart: string | null; // ISO date, null if skipped
  notificationsEnabled: boolean;
}

export interface TodayAggregate {
  date: string;
  waterMl: number;
  waterGoalMl: number;
  waterGoalMet: boolean;
  fastCompleted: boolean;
  fastProtocol: string | null;
}

export interface StreakAggregate {
  currentStreakDays: number;
  longestStreakDays: number;
  lastStreakDate: string | null;
  xpTotal: number;
  level: number;
  badgeIds: string[];
}

export interface DeleteAccountState {
  isDeleting: boolean;
  error: string | null;
}
