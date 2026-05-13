import { useMemo } from 'react';
import { useCycleStore } from '@/stores/cycle/useCycleStore';
import {
  getCurrentPhaseFromISO,
  getDayOfCycle,
  getFastingRecommendation,
  shouldWarnForProtocol,
} from '@/services/cycle/cycleEngine';
import type { CyclePhaseType, PhaseRecommendation } from '@/types/cycle';
import type { FastingProtocol } from '@/types/fasting';

export interface CyclePhaseResult {
  phase: CyclePhaseType | null;           // null when no period date set
  dayOfCycle: number | null;
  recommendation: PhaseRecommendation | null;
  isTracking: boolean;                    // true when lastPeriodStart is set
  warnForProtocol: (protocol: FastingProtocol) => boolean;
}

export function useCyclePhase(): CyclePhaseResult {
  const lastPeriodStart = useCycleStore(s => s.lastPeriodStart);
  const avgCycleLength  = useCycleStore(s => s.avgCycleLength);
  const avgPeriodLength = useCycleStore(s => s.avgPeriodLength);

  return useMemo<CyclePhaseResult>(() => {
    if (!lastPeriodStart) {
      return {
        phase: null,
        dayOfCycle: null,
        recommendation: null,
        isTracking: false,
        warnForProtocol: () => false,
      };
    }

    const phase = getCurrentPhaseFromISO(lastPeriodStart, avgCycleLength, avgPeriodLength);
    const dayOfCycle = getDayOfCycle(lastPeriodStart, avgCycleLength);
    const recommendation = getFastingRecommendation(phase);

    return {
      phase,
      dayOfCycle,
      recommendation,
      isTracking: true,
      warnForProtocol: (protocol: FastingProtocol) => shouldWarnForProtocol(phase, protocol),
    };
  }, [lastPeriodStart, avgCycleLength, avgPeriodLength]);
}
