import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { PHASE_DISPLAY } from '@/constants/phases';
import type { CoachingTip } from '@/types/subscription';
import type { CyclePhaseType } from '@/types/cycle';

interface Props {
  tip: CoachingTip;
  phase: CyclePhaseType;
  onAction?: (tip: CoachingTip) => void;
}

export function HormoneCoachingCard({ tip, phase, onAction }: Props) {
  const display = PHASE_DISPLAY[phase];

  return (
    <View style={[styles.card, { borderLeftColor: display.color }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{display.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.phaseLabel}>{display.label} phase tip</Text>
          <Text style={[styles.headline, { color: display.color }]}>{tip.headline}</Text>
        </View>
        <MaterialCommunityIcons name="lightbulb-outline" size={22} color={display.color} />
      </View>

      <Text style={styles.body}>{tip.body}</Text>

      {onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: display.colorLight }]}
          onPress={() => onAction(tip)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { color: display.color }]}>{tip.actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={display.color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderLeftWidth: 4,
    gap: AppSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  phaseLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textTransform: 'capitalize',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
  },
  body: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
    lineHeight: 22,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  actionLabel: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
  },
});
