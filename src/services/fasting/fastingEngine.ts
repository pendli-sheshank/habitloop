import type { FastingProtocol, FastingStage, FastingStageId } from '@/types/fasting';
import { AppColors } from '@/constants/theme';

const HOUR_MS = 3_600_000;

const STAGE_THRESHOLDS: { maxHours: number; id: FastingStageId; label: string; color: string }[] = [
  { maxHours: 4,  id: 'fed',              label: 'Fed State',       color: AppColors.gray },
  { maxHours: 12, id: 'early-fast',       label: 'Early Fast',      color: AppColors.primaryLight },
  { maxHours: 14, id: 'metabolic-shift',  label: 'Metabolic Shift', color: AppColors.primaryMid },
  { maxHours: Infinity, id: 'fat-burning', label: 'Fat Burning',    color: AppColors.primary },
];

const PROTOCOL_HOURS: Record<string, number> = {
  '12:12': 12,
  '14:10': 14,
  '16:8':  16,
};

const XP_REWARDS: Record<string, number> = {
  '12:12': 30,
  '14:10': 50,
  '16:8':  80,
};

export function getProtocolDurationMs(protocol: FastingProtocol, customHours?: number): number {
  if (protocol === 'custom') {
    return (customHours ?? 16) * HOUR_MS;
  }
  return (PROTOCOL_HOURS[protocol] ?? 16) * HOUR_MS;
}

export function getFastingStage(elapsedMs: number): FastingStage {
  const elapsedHours = elapsedMs / HOUR_MS;
  for (const threshold of STAGE_THRESHOLDS) {
    if (elapsedHours < threshold.maxHours) {
      return { id: threshold.id, label: threshold.label, color: threshold.color };
    }
  }
  return STAGE_THRESHOLDS[STAGE_THRESHOLDS.length - 1];
}

export function calculateElapsedMs(startTime: number, now?: number): number {
  return Math.max(0, (now ?? Date.now()) - startTime);
}

export function calculateRemainingMs(startTime: number, targetDurationMs: number, now?: number): number {
  const elapsed = calculateElapsedMs(startTime, now);
  return Math.max(0, targetDurationMs - elapsed);
}

export function calculateEatingWindowEnd(startTime: number, targetDurationMs: number): number {
  return startTime + targetDurationMs;
}

export function isFastComplete(startTime: number, targetDurationMs: number, now?: number): boolean {
  return calculateRemainingMs(startTime, targetDurationMs, now) === 0;
}

export function calculateProgress(startTime: number, targetDurationMs: number, now?: number): number {
  if (targetDurationMs === 0) return 1;
  const elapsed = calculateElapsedMs(startTime, now);
  return Math.min(1, elapsed / targetDurationMs);
}

export function calculateXpReward(protocol: FastingProtocol): number {
  return XP_REWARDS[protocol] ?? 80;
}
