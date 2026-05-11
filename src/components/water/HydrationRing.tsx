import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { AppColors, AppFontSize, AppSpacing } from '@/constants/theme';

interface Props {
  currentMl: number;
  goalMl: number;
  size?: number;
  strokeWidth?: number;
}

export function HydrationRing({
  currentMl,
  goalMl,
  size = 200,
  strokeWidth = 14,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goalMl > 0 ? Math.min(currentMl / goalMl, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={AppColors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progress >= 1 ? AppColors.accent : AppColors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.labelContainer, { width: size, height: size }]}>
        <Text style={styles.amount}>{currentMl}</Text>
        <Text style={styles.unit}>/ {goalMl} ml</Text>
        <Text
          style={[
            styles.percentage,
            progress >= 1 && styles.percentageComplete,
          ]}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: AppFontSize.display,
    fontWeight: '700',
    color: AppColors.dark,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
  percentage: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
    color: AppColors.primary,
    marginTop: AppSpacing.xs,
  },
  percentageComplete: {
    color: AppColors.accent,
  },
});
