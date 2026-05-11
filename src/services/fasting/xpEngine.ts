import type { FastingProtocol } from '@/types/fasting';
import type { LevelInfo, LevelThreshold } from '@/types/gamification';

const XP_TABLE: Record<FastingProtocol, number> = {
  '12:12': 30,
  '14:10': 50,
  '16:8': 80,
  'custom': 60,
};

export const HYDRATION_GOAL_XP = 20;
export const STREAK_BONUS_7 = 100;
export const STREAK_BONUS_30 = 500;
export const CYCLE_LOG_XP = 15;
export const SYMPTOM_LOG_XP = 10;

const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, title: 'Beginner' },
  { level: 2, xpRequired: 500, title: 'Consistent' },
  { level: 3, xpRequired: 1500, title: 'Committed' },
  { level: 4, xpRequired: 5000, title: 'HabitLoop Pro' },
];

export function calcFastXp(protocol: FastingProtocol, completed: boolean): number {
  return completed ? (XP_TABLE[protocol] ?? 60) : 0;
}

export function calcStreakBonusXp(newStreak: number): number {
  if (newStreak === 30) return STREAK_BONUS_30;
  if (newStreak === 7) return STREAK_BONUS_7;
  return 0;
}

export function calcLevelFromXp(xpTotal: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xpTotal >= LEVEL_THRESHOLDS[i].xpRequired) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

export function getLevelTitle(level: number): string {
  const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  return threshold?.title ?? 'Beginner';
}

export function getXpForNextLevel(currentLevel: number): number | null {
  const next = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return next?.xpRequired ?? null;
}

export function calcXpProgress(xpTotal: number): LevelInfo {
  const level = calcLevelFromXp(xpTotal);
  const title = getLevelTitle(level);

  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
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
