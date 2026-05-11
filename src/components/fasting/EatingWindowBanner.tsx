import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { formatTimeOfDay } from '@/utils/formatters';

interface Props {
  /** Unix ms when the eating window opens (fast end time) */
  eatingWindowStart: number;
  isComplete: boolean;
}

export function EatingWindowBanner({ eatingWindowStart, isComplete }: Props) {
  if (isComplete) {
    return (
      <View style={[styles.container, styles.completeContainer]}>
        <MaterialCommunityIcons name="check-circle" size={20} color={AppColors.accent} />
        <Text style={[styles.text, styles.completeText]}>
          Fast complete! Eating window is open.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="food-apple-outline" size={20} color={AppColors.primary} />
      <Text style={styles.text}>
        Eating window opens at {formatTimeOfDay(eatingWindowStart)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  completeContainer: {
    backgroundColor: '#ECFDF5',
  },
  text: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
    flex: 1,
  },
  completeText: {
    color: AppColors.accent,
    fontWeight: '600',
  },
});
