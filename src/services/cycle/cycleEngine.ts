import { differenceInDays, parseISO, isValid } from 'date-fns';
import { CyclePhase } from '@/types/cycle';
import type { CyclePhaseType, PhaseRecommendation } from '@/types/cycle';
import type { FastingProtocol } from '@/types/fasting';

/**
 * Derives the current cycle phase from the last period start date.
 * Falls back to manual day-range math if Cyclia is unavailable.
 * Day 1 = first day of period.
 */
export function getCurrentPhase(
  lastPeriodStart: Date,
  avgCycleLength: number,
  avgPeriodLength = 5,
): CyclePhaseType {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(lastPeriodStart);
  start.setHours(0, 0, 0, 0);

  // dayOfCycle is 1-based (day 1 = first day of period)
  let dayOfCycle = differenceInDays(today, start) + 1;

  // Wrap around if we've gone past the average cycle length
  if (dayOfCycle > avgCycleLength) {
    dayOfCycle = ((dayOfCycle - 1) % avgCycleLength) + 1;
  }

  if (dayOfCycle < 1) return CyclePhase.MENSTRUATION;
  if (dayOfCycle <= avgPeriodLength) return CyclePhase.MENSTRUATION;
  if (dayOfCycle <= 13) return CyclePhase.FOLLICULAR;
  if (dayOfCycle <= 16) return CyclePhase.OVULATION;
  return CyclePhase.LUTEAL;
}

/**
 * Parses an ISO date string and returns the current cycle phase.
 * Convenience wrapper used by hooks and stores.
 */
export function getCurrentPhaseFromISO(
  lastPeriodStartISO: string,
  avgCycleLength = 28,
  avgPeriodLength = 5,
): CyclePhaseType {
  try {
    const parsed = parseISO(lastPeriodStartISO);
    if (!isValid(parsed)) return CyclePhase.FOLLICULAR;
    return getCurrentPhase(parsed, avgCycleLength, avgPeriodLength);
  } catch {
    return CyclePhase.FOLLICULAR;
  }
}

/**
 * Returns the day of cycle (1-based) given a last period start ISO string.
 * Returns null if the date is invalid.
 */
export function getDayOfCycle(lastPeriodStartISO: string, avgCycleLength = 28): number | null {
  try {
    const start = parseISO(lastPeriodStartISO);
    if (!isValid(start)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    let day = differenceInDays(today, start) + 1;
    if (day > avgCycleLength) {
      day = ((day - 1) % avgCycleLength) + 1;
    }
    return day < 1 ? 1 : day;
  } catch {
    return null;
  }
}

const RECOMMENDATIONS: Record<CyclePhaseType, PhaseRecommendation> = {
  menstruation: {
    phase:               CyclePhase.MENSTRUATION,
    recommendedProtocol: '12:12',
    warningLevel:        'avoid',
    message:             'Your body needs extra care. Stick to a gentle 12:12 and prioritise recovery.',
  },
  follicular: {
    phase:               CyclePhase.FOLLICULAR,
    recommendedProtocol: '16:8',
    warningLevel:        'none',
    message:             'Oestrogen is rising — great window for fasting. 16:8 is well tolerated.',
  },
  ovulation: {
    phase:               CyclePhase.OVULATION,
    recommendedProtocol: '16:8',
    warningLevel:        'none',
    message:             'Peak energy phase. Any protocol works well right now.',
  },
  luteal: {
    phase:               CyclePhase.LUTEAL,
    recommendedProtocol: '14:10',
    warningLevel:        'caution',
    message:             'Appetite increases are normal. Shorter windows reduce hormonal stress.',
  },
};

export function getFastingRecommendation(phase: CyclePhaseType): PhaseRecommendation {
  return RECOMMENDATIONS[phase];
}

/**
 * Returns true when the selected protocol is stricter than the phase recommendation,
 * meaning a warning banner should be shown.
 */
export function shouldWarnForProtocol(
  phase: CyclePhaseType,
  selectedProtocol: FastingProtocol,
): boolean {
  const FAST_HOURS: Record<string, number> = {
    '12:12': 12,
    '14:10': 14,
    '16:8':  16,
    'custom': 16,
  };
  const recommended = RECOMMENDATIONS[phase].recommendedProtocol;
  return FAST_HOURS[selectedProtocol] > FAST_HOURS[recommended];
}

/**
 * Computes the average cycle length from an array of period-start ISO dates.
 * Requires at least 2 dates to produce a result; returns 28 as the default.
 */
export function computeAvgCycleLength(periodStartDates: string[]): number {
  if (periodStartDates.length < 2) return 28;

  const sorted = [...periodStartDates]
    .map(d => parseISO(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalDays += differenceInDays(sorted[i], sorted[i - 1]);
  }
  const avg = Math.round(totalDays / (sorted.length - 1));
  // Clamp to a plausible range
  return Math.min(Math.max(avg, 21), 45);
}
