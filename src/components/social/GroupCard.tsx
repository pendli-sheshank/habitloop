import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { getChallengeStatus, daysRemainingInChallenge } from '@/services/group/groupEngine';
import type { Group, ChallengeStatus } from '@/types/group';

interface Props {
  group: Group;
  checkedInToday: boolean;
  onPress: (groupId: string) => void;
}

const STATUS_CONFIG: Record<ChallengeStatus, { label: string; color: string; bg: string }> = {
  active:       { label: 'Active',     color: AppColors.accent,   bg: '#ECFDF5' },
  upcoming:     { label: 'Upcoming',   color: AppColors.warning,  bg: '#FEF3C7' },
  complete:     { label: 'Complete',   color: AppColors.gray,     bg: AppColors.surfaceAlt },
  'no-challenge': { label: 'No challenge', color: AppColors.gray, bg: AppColors.surfaceAlt },
};

export function GroupCard({ group, checkedInToday, onPress }: Props) {
  const status = getChallengeStatus(group);
  const cfg    = STATUS_CONFIG[status];
  const daysLeft = status === 'active' ? daysRemainingInChallenge(group) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(group.id)}
      activeOpacity={0.75}
    >
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="account-group" size={16} color={AppColors.gray} />
          <Text style={styles.statText}>{group.memberIds.length} members</Text>
        </View>

        <View style={styles.stat}>
          <MaterialCommunityIcons name="fire" size={16} color={AppColors.warning} />
          <Text style={styles.statText}>{group.streakCount} day streak</Text>
        </View>

        <View style={styles.stat}>
          <MaterialCommunityIcons name="timer-outline" size={16} color={AppColors.primary} />
          <Text style={styles.statText}>{group.challengeProtocol}</Text>
        </View>
      </View>

      {/* Footer row */}
      <View style={styles.footer}>
        {daysLeft !== null && (
          <Text style={styles.daysLeft}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</Text>
        )}
        {checkedInToday && (
          <View style={styles.checkedInPill}>
            <MaterialCommunityIcons name="check-circle" size={14} color={AppColors.accent} />
            <Text style={styles.checkedInText}>Checked in</Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={AppColors.gray}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  name: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
    flex: 1,
  },
  statusBadge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: AppSpacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  statText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  daysLeft: {
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    fontWeight: '600',
  },
  checkedInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkedInText: {
    fontSize: AppFontSize.sm,
    color: AppColors.accent,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
});
