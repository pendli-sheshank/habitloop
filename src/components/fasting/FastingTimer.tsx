import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { AppColors, AppFontSize, AppSpacing } from '@/constants/theme';
import { formatTimerDisplay } from '@/utils/formatters';

interface Props {
  remainingMs: number;
  elapsedMs: number;
  progress: number;
  isActive: boolean;
  stageLabel: string;
  stageColor: string;
  size?: number;
  strokeWidth?: number;
}

export function FastingTimer({
  remainingMs,
  elapsedMs,
  progress,
  isActive,
  stageLabel,
  stageColor,
  size = 260,
  strokeWidth = 14,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  const displayTime = isActive
    ? formatTimerDisplay(remainingMs)
    : '00:00:00';

  const elapsedTime = isActive
    ? formatTimerDisplay(elapsedMs)
    : '';

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
          stroke={progress >= 1 ? AppColors.accent : stageColor}
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
        <Text style={styles.timer}>{displayTime}</Text>
        <Text style={styles.remainingLabel}>
          {isActive ? 'remaining' : 'ready'}
        </Text>
        {isActive && (
          <Text style={[styles.stage, { color: stageColor }]}>
            {stageLabel}
          </Text>
        )}
        {isActive && elapsedTime && (
          <Text style={styles.elapsed}>
            {elapsedTime} elapsed
          </Text>
        )}
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
  timer: {
    fontSize: AppFontSize.display,
    fontWeight: '700',
    color: AppColors.dark,
    fontVariant: ['tabular-nums'],
  },
  remainingLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
  stage: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    marginTop: AppSpacing.sm,
  },
  elapsed: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
});
