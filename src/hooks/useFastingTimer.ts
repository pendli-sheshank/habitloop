import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import {
  calculateElapsedMs,
  calculateRemainingMs,
  calculateProgress,
  isFastComplete,
  getFastingStage,
} from '@/services/fasting/fastingEngine';
import type { FastingStage } from '@/types/fasting';

interface FastingTimerState {
  elapsedMs: number;
  remainingMs: number;
  overtimeMs: number;
  progress: number;
  stage: FastingStage;
  isActive: boolean;
  isComplete: boolean;
}

const IDLE_STAGE: FastingStage = { id: 'fed', label: 'Not Fasting', description: 'No active fast', color: '#6B7280' };

export function useFastingTimer(): FastingTimerState {
  const activeFast = useFastingStore(s => s.activeFast);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const tick = useCallback(() => {
    if (!activeFast) {
      setElapsedMs(0);
      setRemainingMs(0);
      return;
    }
    const now = Date.now();
    setElapsedMs(calculateElapsedMs(activeFast.startTime, now));
    setRemainingMs(calculateRemainingMs(activeFast.startTime, activeFast.targetDurationMs, now));
  }, [activeFast]);

  useEffect(() => {
    if (!activeFast) {
      setElapsedMs(0);
      setRemainingMs(0);
      return;
    }

    tick();
    const interval = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [activeFast, tick]);

  const progress = activeFast
    ? calculateProgress(activeFast.startTime, activeFast.targetDurationMs)
    : 0;

  const isComplete = activeFast
    ? isFastComplete(activeFast.startTime, activeFast.targetDurationMs)
    : false;

  const overtimeMs = (activeFast && isComplete)
    ? Math.max(0, elapsedMs - activeFast.targetDurationMs)
    : 0;

  const stage = activeFast
    ? getFastingStage(elapsedMs)
    : IDLE_STAGE;

  return {
    elapsedMs,
    remainingMs,
    overtimeMs,
    progress,
    stage,
    isActive: !!activeFast,
    isComplete,
  };
}
