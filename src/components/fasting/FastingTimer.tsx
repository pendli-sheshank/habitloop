import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { AppColors, AppFontSize, AppSpacing } from '@/constants/theme';
import { formatTimerDisplay } from '@/utils/formatters';

interface Props {
  remainingMs: number;
  elapsedMs: number;
  overtimeMs: number;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
  stageLabel: string;
  stageColor: string;
  stageDescription: string;
  needsElectrolytes?: boolean;
  size?: number;
  strokeWidth?: number;
}

export function FastingTimer({
  remainingMs,
  elapsedMs,
  overtimeMs,
  progress,
  isActive,
  isComplete,
  stageLabel,
  stageColor,
  stageDescription,
  needsElectrolytes = false,
  size = 260,
  strokeWidth = 14,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  const displayTime = isActive
    ? (isComplete ? formatTimerDisplay(overtimeMs) : formatTimerDisplay(remainingMs))
    : '00:00:00';

  const elapsedTime = isActive
    ? formatTimerDisplay(elapsedMs)
    : '';

  return (
    <View style={styles.wrapper}>
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
          <Text style={[styles.timer, isComplete && { color: AppColors.accent }]}>
            {isComplete ? '+' : ''}{displayTime}
          </Text>
          <Text style={styles.remainingLabel}>
            {isActive ? (isComplete ? 'overtime' : 'remaining') : 'ready'}
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

      {isActive && (
        <View style={styles.bodyStateSection}>
          <View style={[styles.stateBar, { backgroundColor: stageColor }]} />
          <View style={styles.stateTextBlock}>
            <Text style={[styles.stateLabel, { color: stageColor }]}>{stageLabel}</Text>
            <Text style={styles.stateDescription}>{stageDescription}</Text>
          </View>
          {needsElectrolytes && (
            <View style={styles.electrolyteChip}>
              <Text style={styles.electrolyteText}>💧 Electrolytes</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: AppSpacing.md,
  },
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
  bodyStateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    width: '100%',
    paddingHorizontal: AppSpacing.sm,
  },
  stateBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  stateTextBlock: {
    flex: 1,
    gap: 2,
  },
  stateLabel: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
  },
  stateDescription: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    lineHeight: 16,
  },
  electrolyteChip: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  electrolyteText: {
    fontSize: AppFontSize.xs,
    color: '#2563EB',
    fontWeight: '600',
  },
});
