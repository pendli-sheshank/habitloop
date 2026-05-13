import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import {
  daysRemainingInChallenge,
  challengeDayNumber,
  isStreakFrozen,
  getGroupCheckInRate,
} from '@/services/group/groupEngine';
import { getUTCDayKey } from '@/utils/dateUtils';
import type { Group } from '@/types/group';

interface Props {
  group: Group;
}

export function ChallengeCard({ group }: Props) {
  const today        = getUTCDayKey(Date.now());
  const daysLeft     = daysRemainingInChallenge(group);
  const dayNumber    = challengeDayNumber(group);
  const frozen       = isStreakFrozen(group, today);
  const checkInRate  = getGroupCheckInRate(group, today);
  const checkedCount = Math.round(checkInRate * group.memberIds.length);
  const totalDays    = group.durationDays;
  const elapsed      = dayNumber !== null ? dayNumber - 1 : 0;
  const progress     = totalDays > 0 ? Math.min(elapsed / totalDays, 1) : 0;

  return (
    <View style={styles.card}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Sync Fasting Challenge</Text>
          <Text style={styles.sub}>
            {group.challengeProtocol} · {totalDays} days
          </Text>
        </View>
        {frozen && (
          <View style={styles.frozenBadge}>
            <MaterialCommunityIcons name="snowflake" size={14} color="#0284C7" />
            <Text style={styles.frozenText}>Frozen</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            Day {dayNumber ?? '–'} of {totalDays}
          </Text>
          <Text style={styles.progressLabel}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* Streak + check-in rate */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <MaterialCommunityIcons
            name={frozen ? 'snowflake' : 'fire'}
            size={18}
            color={frozen ? '#0284C7' : AppColors.warning}
          />
          <Text style={styles.statValue}>{group.streakCount}</Text>
          <Text style={styles.statLabel}>Group streak</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={AppColors.accent} />
          <Text style={styles.statValue}>{checkedCount}/{group.memberIds.length}</Text>
          <Text style={styles.statLabel}>Checked in today</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <MaterialCommunityIcons name="calendar-range" size={18} color={AppColors.primary} />
          <Text style={styles.statValue}>{group.durationDays}d</Text>
          <Text style={styles.statLabel}>Challenge</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  sub: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  frozenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
  },
  frozenText: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
    color: '#0284C7',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.xs,
  },
  progressLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  track: {
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: AppRadius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.full,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  statLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: AppColors.border,
  },
});
