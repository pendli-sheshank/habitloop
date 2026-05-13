import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { PHASE_DISPLAY } from '@/constants/phases';
import type { PhaseRecommendation, CyclePhaseType } from '@/types/cycle';

interface Props {
  phase: CyclePhaseType;
  dayOfCycle: number;
  recommendation: PhaseRecommendation;
}

const WARNING_LABEL: Record<PhaseRecommendation['warningLevel'], string | null> = {
  none:    null,
  caution: 'Caution',
  avoid:   'Recovery Mode',
};

const WARNING_COLORS: Record<PhaseRecommendation['warningLevel'], string> = {
  none:    AppColors.accent,
  caution: AppColors.warning,
  avoid:   AppColors.danger,
};

export function PhaseCard({ phase, dayOfCycle, recommendation }: Props) {
  const display = PHASE_DISPLAY[phase];
  const badgeLabel = WARNING_LABEL[recommendation.warningLevel];
  const badgeColor = WARNING_COLORS[recommendation.warningLevel];

  return (
    <View style={[styles.card, { backgroundColor: display.colorLight }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{display.emoji}</Text>
          <View>
            <Text style={[styles.phaseName, { color: display.color }]}>{display.label}</Text>
            <Text style={styles.dayLabel}>Day {dayOfCycle} · {display.dayRange}</Text>
          </View>
        </View>

        {badgeLabel && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </View>

      <Text style={styles.message}>{recommendation.message}</Text>

      <View style={styles.protocolRow}>
        <Text style={styles.protocolLabel}>Recommended</Text>
        <View style={[styles.protocolBadge, { borderColor: display.color }]}>
          <Text style={[styles.protocolText, { color: display.color }]}>
            {recommendation.recommendedProtocol}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    flex: 1,
  },
  emoji: {
    fontSize: 36,
  },
  phaseName: {
    fontSize: AppFontSize.xl,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  badge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: AppFontSize.xs,
    color: AppColors.surface,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
    lineHeight: 22,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  protocolLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  protocolBadge: {
    borderRadius: AppRadius.sm,
    borderWidth: 1.5,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  protocolText: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
  },
});
