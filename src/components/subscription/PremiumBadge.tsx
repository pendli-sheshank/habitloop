import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

interface Props {
  size?: 'sm' | 'md';
}

export function PremiumBadge({ size = 'md' }: Props) {
  const isSm = size === 'sm';
  return (
    <View style={[styles.badge, isSm && styles.badgeSm]}>
      <MaterialCommunityIcons
        name="crown"
        size={isSm ? 10 : 13}
        color="#92400E"
      />
      <Text style={[styles.label, isSm && styles.labelSm]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: AppSpacing.xs,
    paddingVertical: 2,
  },
  label: {
    fontSize: AppFontSize.xs,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.8,
  },
  labelSm: {
    fontSize: 9,
  },
});
