import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { AppColors, AppSpacing, AppRadius } from '@/constants/theme';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';
import type { FastingProtocol } from '@/types/fasting';

interface Props {
  selected: FastingProtocol;
  onSelect: (protocol: FastingProtocol) => void;
  disabled?: boolean;
}

export function ProtocolPicker({ selected, onSelect, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      {PROTOCOL_OPTIONS.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Button
            key={option.value}
            mode={isSelected ? 'contained' : 'outlined'}
            buttonColor={isSelected ? AppColors.primary : undefined}
            textColor={isSelected ? AppColors.surface : AppColors.primary}
            style={[styles.button, isSelected && styles.selectedButton]}
            onPress={() => onSelect(option.value)}
            disabled={disabled}
          >
            {option.label}
          </Button>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.sm,
  },
  button: {
    borderRadius: AppRadius.md,
    borderColor: AppColors.primaryMid,
  },
  selectedButton: {
    elevation: 2,
  },
});
