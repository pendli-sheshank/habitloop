import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { AppColors, AppSpacing, AppRadius } from '@/constants/theme';
import type { WaterPreset } from '@/types/water';

interface Props {
  amount: WaterPreset;
  isDefault?: boolean;
  onPress: (amount: WaterPreset) => void;
}

export function WaterLogButton({ amount, isDefault = false, onPress }: Props) {
  return (
    <Button
      mode={isDefault ? 'contained' : 'outlined'}
      buttonColor={isDefault ? AppColors.primary : undefined}
      textColor={isDefault ? AppColors.surface : AppColors.primary}
      style={[styles.button, isDefault && styles.defaultButton]}
      labelStyle={styles.label}
      onPress={() => onPress(amount)}
    >
      {amount} ml
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: AppRadius.md,
    borderColor: AppColors.primaryMid,
  },
  defaultButton: {
    elevation: 2,
  },
  label: {
    paddingHorizontal: AppSpacing.xs,
  },
});
