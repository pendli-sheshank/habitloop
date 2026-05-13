import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { BadgeId } from '@/types/gamification';

interface Props {
  badgeId: BadgeId;
  earned?: boolean;
}

const BADGE_META: Record<BadgeId, { emoji: string; label: string }> = {
  'first-fast':        { emoji: '⚡', label: 'First Fast' },
  'hydration-hero':    { emoji: '💧', label: 'Hydration Hero' },
  'streak-starter':    { emoji: '🔥', label: 'Streak Starter' },
  'cycle-logger':      { emoji: '🌸', label: 'Cycle Logger' },
  'protocol-explorer': { emoji: '🧪', label: 'Explorer' },
};

export function BadgeChip({ badgeId, earned = true }: Props) {
  const meta = BADGE_META[badgeId];
  if (!meta) return null;

  return (
    <View style={[styles.chip, !earned && styles.chipUnearned]}>
      <Text style={[styles.emoji, !earned && styles.dimmed]}>{meta.emoji}</Text>
      <Text style={[styles.label, !earned && styles.dimmed]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  chipUnearned: {
    backgroundColor: AppColors.surfaceAlt,
  },
  emoji: {
    fontSize: AppFontSize.md,
  },
  label: {
    fontSize: AppFontSize.xs,
    fontWeight: '600',
    color: AppColors.primary,
  },
  dimmed: {
    opacity: 0.4,
    color: AppColors.textMuted,
  },
});
