import { getCoachingTipsForPhase } from '@/constants/coaching';
import type { CoachingTip } from '@/types/subscription';
import type { CyclePhaseType } from '@/types/cycle';

export function getHormoneCoachingTips(
  phase: CyclePhaseType,
  count?: number,
): CoachingTip[] {
  return getCoachingTipsForPhase(phase, count);
}

export function getDailyCoachingTip(phase: CyclePhaseType, dayKey: string): CoachingTip {
  const tips = getCoachingTipsForPhase(phase);
  // Deterministic daily rotation — no randomness so the same tip shows all day
  const index = dayKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % tips.length;
  return tips[index];
}
