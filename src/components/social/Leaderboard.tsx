import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { LeaderboardEntry } from '@/types/group';

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function AvatarInitial({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medal = RANK_MEDALS[entry.rank];

  return (
    <View style={[styles.row, isCurrentUser && styles.rowHighlight]}>
      {/* Rank */}
      <View style={styles.rankCell}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={styles.rankText}>{entry.rank}</Text>
        )}
      </View>

      {/* Avatar + name */}
      <AvatarInitial name={entry.displayName} />
      <View style={styles.nameCell}>
        <Text style={[styles.name, isCurrentUser && styles.nameHighlight]} numberOfLines={1}>
          {entry.displayName}{isCurrentUser ? ' (you)' : ''}
        </Text>
        {entry.checkInStreak > 0 && (
          <View style={styles.streakRow}>
            <MaterialCommunityIcons name="fire" size={12} color={AppColors.warning} />
            <Text style={styles.streakText}>{entry.checkInStreak} day streak</Text>
          </View>
        )}
      </View>

      {/* XP */}
      <Text style={[styles.xp, isCurrentUser && styles.xpHighlight]}>
        {entry.xpThisCycle} XP
      </Text>
    </View>
  );
}

export function Leaderboard({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No entries yet. Complete a fast to appear here!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Leaderboard</Text>
      <FlatList
        data={entries}
        keyExtractor={e => e.userId}
        renderItem={({ item }) => (
          <LeaderboardRow entry={item} isCurrentUser={item.userId === currentUserId} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  heading: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  rowHighlight: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.sm,
    marginHorizontal: -AppSpacing.sm,
  },
  rankCell: {
    width: 28,
    alignItems: 'center',
  },
  medal: {
    fontSize: 18,
  },
  rankText: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.textMuted,
  },
  avatar: {
    backgroundColor: AppColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.surface,
  },
  nameCell: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
    fontWeight: '500',
  },
  nameHighlight: {
    fontWeight: '700',
    color: AppColors.primary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakText: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  xp: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  xpHighlight: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: AppSpacing.xs,
  },
  empty: {
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
});
