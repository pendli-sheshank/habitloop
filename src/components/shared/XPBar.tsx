import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useUserStore } from '@/stores/user/useUserStore';
import { calcXpProgress } from '@/services/fasting/xpEngine';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

export function XPBar() {
  const streakAggregate = useUserStore(s => s.streakAggregate);

  if (!streakAggregate) return null;

  const { level, title, currentLevelXp, nextLevelXp, progress } = calcXpProgress(
    streakAggregate.xpTotal,
  );

  const isMaxLevel = currentLevelXp === nextLevelXp;
  const xpIntoLevel = streakAggregate.xpTotal - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelLabel}>Lv.{level} {title}</Text>
        <Text style={styles.xpLabel}>
          {isMaxLevel ? `${streakAggregate.xpTotal} XP` : `${xpIntoLevel} / ${xpNeeded} XP`}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {isMaxLevel && (
        <Text style={styles.maxLabel}>Max level reached</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.dark,
  },
  xpLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  trackOuter: {
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: AppRadius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.full,
  },
  maxLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.accent,
    textAlign: 'right',
  },
});
