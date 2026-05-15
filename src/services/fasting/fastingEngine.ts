import type { FastingProtocol, FastingStage, BodyStateId } from '@/types/fasting';
import { AppColors } from '@/constants/theme';

const HOUR_MS = 3_600_000;

// Hours for each protocol
export const PROTOCOL_HOURS: Record<FastingProtocol, number> = {
  'circadian': 13,
  '15:9':      15,
  '16:8':      16,
  '18:6':      18,
  '20:4':      20,
  'omad':      23,
  '24h':       24,
  '36h':       36,
  '48h':       48,
  '72h':       72,
  '120h':      120,
  '168h':      168,
};

// Body-state thresholds (elapsed hours → state)
const BODY_STATE_THRESHOLDS: Array<{
  minHours: number;
  id: BodyStateId;
  label: string;
  description: string;
  color: string;
}> = [
  { minHours: 0,   id: 'fed',             label: 'Fed State',       description: 'Body running on glucose from your last meal',       color: AppColors.gray },
  { minHours: 4,   id: 'early-fast',      label: 'Early Fast',      description: 'Glycogen stores depleting, insulin falling',         color: AppColors.primaryMid },
  { minHours: 12,  id: 'metabolic-shift', label: 'Metabolic Shift', description: 'Liver glycogen nearly depleted, fat mobilising',    color: '#7C3AED' },
  { minHours: 16,  id: 'fat-burning',     label: 'Fat Burning',     description: 'Primary fuel switches to fatty acids',              color: AppColors.warning },
  { minHours: 24,  id: 'ketosis',         label: 'Ketosis',         description: 'Ketone bodies rising, brain running on ketones',    color: '#EA580C' },
  { minHours: 36,  id: 'deep-ketosis',    label: 'Deep Ketosis',    description: 'Autophagy accelerating, growth hormone elevated',  color: '#DC2626' },
  { minHours: 48,  id: 'autophagy',       label: 'Autophagy Peak',  description: 'Peak cellular repair and immune regeneration',      color: '#9F1239' },
  { minHours: 72,  id: 'reset',           label: 'Metabolic Reset', description: 'Deep cellular renewal, stem cell activation',       color: '#581C87' },
];

export function getProtocolDurationMs(protocol: FastingProtocol): number {
  return (PROTOCOL_HOURS[protocol] ?? 16) * HOUR_MS;
}

export function getFastingStage(elapsedMs: number): FastingStage {
  const elapsedHours = elapsedMs / HOUR_MS;
  let best = BODY_STATE_THRESHOLDS[0];
  for (const threshold of BODY_STATE_THRESHOLDS) {
    if (elapsedHours >= threshold.minHours) best = threshold;
    else break;
  }
  return { id: best.id, label: best.label, description: best.description, color: best.color };
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
  const hours = PROTOCOL_HOURS[protocol] ?? 16;
  // Base: 5 XP per hour, scaled with bonus for extended fasts
  if (hours <= 16) return Math.round(hours * 5);
  if (hours <= 24) return Math.round(hours * 6);
  if (hours <= 48) return Math.round(hours * 8);
  return Math.round(hours * 12);
}

export function needsElectrolytes(protocol: FastingProtocol): boolean {
  const hours = PROTOCOL_HOURS[protocol] ?? 0;
  return hours >= 36;
}

export function needsMedicalSupervision(protocol: FastingProtocol): boolean {
  const hours = PROTOCOL_HOURS[protocol] ?? 0;
  return hours >= 120;
}
