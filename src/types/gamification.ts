import type { FastingProtocol } from '@/types/fasting';

export interface XpAwardResult {
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  newXpTotal: number;
  newLevel: number;
  leveledUp: boolean;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0–1 fraction toward next level
}

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string;
}

export type BadgeId =
  | 'first-fast'
  | 'hydration-hero'
  | 'streak-starter'
  | 'cycle-logger'
  | 'protocol-explorer';

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  description: string;
}

export type XpActionType =
  | 'fast-complete'
  | 'hydration-goal'
  | 'streak-bonus-7'
  | 'streak-bonus-30'
  | 'cycle-log'
  | 'symptom-log';

export interface XpEvent {
  action: XpActionType;
  xp: number;
  protocol?: FastingProtocol;
  timestamp: number; // Unix ms
}
