import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { useUserStore } from '@/stores/user/useUserStore';
import {
  calculateElapsedMs,
  calculateRemainingMs,
  calculateProgress,
  getFastingStage,
  getProtocolDurationMs,
  isFastComplete,
} from '@/services/fasting/fastingEngine';
import { recordFastCompletion } from '@/services/fasting/streakEngine';
import { AppColors, AppSpacing, AppFontSize } from '@/constants/theme';
import type { FastSession } from '@/types/fasting';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface Props {
  onFastComplete?: () => void;
}

export function FastingTimer({ onFastComplete }: Props) {
  const { activeFast, startFast, completeFast, cancelFast } = useFastingStore();
  const user = useUserStore(s => s.user);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeFast) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeFast]);

  if (!activeFast) {
    return (
      <View style={styles.container}>
        <Text style={styles.idle}>No active fast</Text>
        <Button
          mode="contained"
          buttonColor={AppColors.primary}
          onPress={() => startFast('16:8', getProtocolDurationMs('16:8'))}
          style={styles.button}
        >
          Start 16:8 Fast
        </Button>
      </View>
    );
  }

  const { startTime, targetDurationMs, protocol } = activeFast;
  const elapsed = calculateElapsedMs(startTime, now);
  const remaining = calculateRemainingMs(startTime, targetDurationMs, now);
  const progress = calculateProgress(startTime, targetDurationMs, now);
  const stage = getFastingStage(elapsed);
  const complete = isFastComplete(startTime, targetDurationMs, now);

  async function handleComplete() {
    if (!user || !activeFast) return;
    try {
      const now = Date.now();
      const session: FastSession = {
        id: '',
        userId: user.uid,
        startTime: activeFast.startTime,
        endTime: now,
        targetDurationMs: activeFast.targetDurationMs,
        protocol: activeFast.protocol,
        completed: true,
        xpEarned: 0,
        cyclePhaseAtStart: null,
        createdAt: now,
      };
      const result = await recordFastCompletion(user.uid, session);
      completeFast(result);
    } catch (e) {
      console.error('[FastingTimer] Failed to record completion:', e);
      completeFast({ xpEarned: 0, bonusXp: 0, newStreak: 0, longestStreak: 0 });
    }
    onFastComplete?.();
  }

  function handleCancel() {
    cancelFast();
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.stageLabel, { color: stage.color }]}>{stage.label}</Text>
      <Text style={styles.timer}>{formatTime(remaining)}</Text>
      <Text style={styles.elapsed}>Elapsed: {formatTime(elapsed)}</Text>
      <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      <Text style={styles.protocol}>{protocol}</Text>

      {complete ? (
        <Button
          mode="contained"
          buttonColor={AppColors.accent}
          onPress={handleComplete}
          style={styles.button}
        >
          Complete Fast
        </Button>
      ) : (
        <Button
          mode="outlined"
          textColor={AppColors.danger}
          onPress={handleCancel}
          style={styles.button}
        >
          End Early
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: AppSpacing.md,
    padding: AppSpacing.lg,
  },
  idle: {
    fontSize: AppFontSize.lg,
    color: AppColors.textMuted,
  },
  stageLabel: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
  },
  timer: {
    fontSize: AppFontSize.display,
    fontWeight: '700',
    color: AppColors.dark,
    fontVariant: ['tabular-nums'],
  },
  elapsed: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  progress: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
    color: AppColors.primary,
  },
  protocol: {
    fontSize: AppFontSize.sm,
    color: AppColors.gray,
  },
  button: {
    marginTop: AppSpacing.sm,
  },
});
