import type { FastingProtocol } from '@/types/fasting';
import type { LevelInfo, LevelThreshold } from '@/types/gamification';
import { calculateXpReward } from '@/services/fasting/fastingEngine';

export const HYDRATION_GOAL_XP = 20;
export const STREAK_BONUS_7   = 100;
export const STREAK_BONUS_30  = 500;
export const CYCLE_LOG_XP     = 15;
export const SYMPTOM_LOG_XP   = 10;

// Streak multipliers applied to base XP
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.75;
  if (streakDays >= 7)  return 1.5;
  if (streakDays >= 3)  return 1.25;
  return 1.0;
}

const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0,     title: 'Novice' },
  { level: 2, xpRequired: 500,   title: 'Beginner' },
  { level: 3, xpRequired: 1500,  title: 'Consistent' },
  { level: 4, xpRequired: 3000,  title: 'Dedicated' },
  { level: 5, xpRequired: 6000,  title: 'Disciplined' },
  { level: 6, xpRequired: 12000, title: 'Advanced' },
  { level: 7, xpRequired: 25000, title: 'Expert' },
  { level: 8, xpRequired: 50000, title: 'Master' },
];

export function calcFastXp(protocol: FastingProtocol, completed: boolean, streakDays = 0): number {
  if (!completed) return 0;
  const base = calculateXpReward(protocol);
  const multiplier = getStreakMultiplier(streakDays);
  return Math.round(base * multiplier);
}

export function calcStreakBonusXp(newStreak: number): number {
  if (newStreak === 30) return STREAK_BONUS_30;
  if (newStreak === 7)  return STREAK_BONUS_7;
  return 0;
}

export function calcLevelFromXp(xpTotal: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xpTotal >= LEVEL_THRESHOLDS[i].xpRequired) return LEVEL_THRESHOLDS[i].level;
  }
  return 1;
}

export function getLevelTitle(level: number): string {
  return LEVEL_THRESHOLDS.find(t => t.level === level)?.title ?? 'Novice';
}

export function getXpForNextLevel(currentLevel: number): number | null {
  return LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1)?.xpRequired ?? null;
}

export function calcXpProgress(xpTotal: number): LevelInfo {
  const level = calcLevelFromXp(xpTotal);
  const title = getLevelTitle(level);
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level);
  const currentLevelXp = currentThreshold?.xpRequired ?? 0;
  const nextLevelXp = getXpForNextLevel(level);
  if (nextLevelXp === null) {
    return { level, title, currentLevelXp, nextLevelXp: currentLevelXp, progress: 1 };
  }
  const range = nextLevelXp - currentLevelXp;
  const earned = xpTotal - currentLevelXp;
  const progress = range > 0 ? Math.min(1, earned / range) : 1;
  return { level, title, currentLevelXp, nextLevelXp, progress };
}
