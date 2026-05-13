import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { PhaseRecommendation } from '@/types/cycle';
import type { FastingProtocol } from '@/types/fasting';

interface Props {
  recommendation: PhaseRecommendation;
  selectedProtocol: FastingProtocol;
}

const BANNER_CONFIG = {
  caution: {
    bg:         '#FEF3C7',
    border:     AppColors.warning,
    icon:       'alert' as const,
    iconColor:  AppColors.warning,
    textColor:  '#92400E',
  },
  avoid: {
    bg:         '#FEE2E2',
    border:     AppColors.danger,
    icon:       'alert-circle' as const,
    iconColor:  AppColors.danger,
    textColor:  '#991B1B',
  },
};

export function FastingWarningBanner({ recommendation, selectedProtocol }: Props) {
  const { warningLevel, recommendedProtocol, phase } = recommendation;

  if (warningLevel === 'none') return null;

  const config = BANNER_CONFIG[warningLevel];

  const message =
    warningLevel === 'avoid'
      ? `${selectedProtocol} fasting is not recommended during menstruation. Switch to ${recommendedProtocol} to support recovery.`
      : `${selectedProtocol} may increase hormonal stress during the ${phase} phase. ${recommendedProtocol} is gentler right now.`;

  return (
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <MaterialCommunityIcons name={config.icon} size={20} color={config.iconColor} />
      <Text style={[styles.text, { color: config.textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
  },
  text: {
    flex: 1,
    fontSize: AppFontSize.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
});
