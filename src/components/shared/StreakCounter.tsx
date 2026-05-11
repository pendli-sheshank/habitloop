import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { useUserStore } from '@/stores/user/useUserStore';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { StreakAggregate } from '@/types/auth';

const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  2: 'Consistent',
  3: 'Committed',
  4: 'HabitLoop Pro',
};

export function StreakCounter() {
  const user = useUserStore(s => s.user);
  const completionResult = useFastingStore(s => s.lastCompletionResult);
  const clearCompletionResult = useFastingStore(s => s.clearCompletionResult);
  const [streak, setStreak] = useState<StreakAggregate | null>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'aggregates', 'streak');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setStreak(snap.data() as StreakAggregate);
        }
      },
      (err) => console.error('[StreakCounter] snapshot error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!completionResult) return;
    const timer = setTimeout(() => clearCompletionResult(), 5000);
    return () => clearTimeout(timer);
  }, [completionResult, clearCompletionResult]);

  if (!streak) return null;

  const levelTitle = LEVEL_TITLES[streak.level] ?? 'Beginner';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak.currentStreakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak.xpTotal}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>Lv.{streak.level}</Text>
          <Text style={styles.statLabel}>{levelTitle}</Text>
        </View>
      </View>

      {streak.longestStreakDays > 0 && (
        <Text style={styles.longestStreak}>
          Longest streak: {streak.longestStreakDays} days
        </Text>
      )}

      {completionResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>
            +{completionResult.xpEarned} XP
            {completionResult.bonusXp > 0 && ` (+${completionResult.bonusXp} streak bonus!)`}
          </Text>
          <Text style={styles.resultStreak}>
            {completionResult.newStreak} day streak
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  statValue: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.primary,
  },
  statLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  longestStreak: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  resultBanner: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  resultText: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
    color: AppColors.primary,
  },
  resultStreak: {
    fontSize: AppFontSize.sm,
    color: AppColors.dark,
  },
});
