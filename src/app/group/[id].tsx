import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { useGroupStore } from '@/stores/group/useGroupStore';
import { isChallengeActive, getChallengeStatus } from '@/services/group/groupEngine';
import {
  loadGroup,
  submitCheckIn,
  loadLeaderboard,
  loadGroupMembers,
} from '@/services/group/groupService';
import { notifyStreakFrozen } from '@/services/notifications/notificationService';
import { ChallengeCard } from '@/components/social/ChallengeCard';
import { CheckInButton } from '@/components/social/CheckInButton';
import { Leaderboard } from '@/components/social/Leaderboard';
import { getUTCDayKey } from '@/utils/dateUtils';
import type { Group, GroupMember, LeaderboardEntry } from '@/types/group';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const userId   = useUserStore(s => s.user?.uid);
  const profile  = useUserStore(s => s.profile);

  const todayCheckIns  = useGroupStore(s => s.todayCheckIns);
  const checkInDate    = useGroupStore(s => s.checkInDate);
  const storeCheckIn   = useGroupStore(s => s.setCheckIn);
  const upsertGroup    = useGroupStore(s => s.upsertGroup);
  const setLeaderboard = useGroupStore(s => s.setLeaderboard);
  const cachedLeaderboard = useGroupStore(s => s.leaderboards[id ?? ''] ?? []);

  const [group, setGroup]           = useState<Group | null>(null);
  const [members, setMembers]       = useState<GroupMember[]>([]);
  const [leaderboard, setBoard]     = useState<LeaderboardEntry[]>(cachedLeaderboard);
  const [loading, setLoading]       = useState(true);

  const today          = getUTCDayKey(Date.now());
  const checkedInToday = checkInDate === today && todayCheckIns[id ?? ''] === true;

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [g, lb] = await Promise.all([
        loadGroup(id),
        loadLeaderboard(id),
      ]);
      if (!g) return;

      setGroup(g);
      upsertGroup(g);

      setBoard(lb);
      setLeaderboard(id, lb);

      const mem = await loadGroupMembers(g, today);
      setMembers(mem);
    } catch (e) {
      console.error('[GroupDetail] refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, [id, today, upsertGroup, setLeaderboard]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCheckIn = useCallback(async () => {
    if (!userId || !id || !group) return;

    storeCheckIn(id, true, today);

    try {
      await submitCheckIn(userId, id, today);
      // Refresh to pick up updated streakCount and member check-in status
      await refresh();
    } catch (e) {
      // Roll back optimistic update
      storeCheckIn(id, false, today);
      console.error('[GroupDetail] submitCheckIn failed:', e);
      Alert.alert('Error', 'Could not save check-in. Please try again.');
    }
  }, [userId, id, group, today, storeCheckIn, refresh]);

  const handleShareGroupId = useCallback(async () => {
    if (!id) return;
    try {
      await Share.share({
        message: `Join my HabitLoop group! Group ID: ${id}`,
        title: group?.name ?? 'HabitLoop Group',
      });
    } catch {
      // User cancelled share sheet — no action needed
    }
  }, [id, group]);

  if (loading && !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Group not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status      = getChallengeStatus(group);
  const showChallenge = status !== 'no-challenge';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backIcon}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <TouchableOpacity onPress={handleShareGroupId} hitSlop={8}>
          <MaterialCommunityIcons name="share-variant-outline" size={22} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge card */}
        {showChallenge && <ChallengeCard group={group} />}

        {/* Check-in button */}
        <CheckInButton
          groupStreakCount={group.streakCount}
          alreadyCheckedIn={checkedInToday}
          isChallengeActive={isChallengeActive(group)}
          onCheckIn={handleCheckIn}
        />

        {/* Today's check-in feed */}
        <View style={styles.memberSection}>
          <Text style={styles.sectionTitle}>Today's check-ins</Text>
          {members.length === 0 ? (
            <Text style={styles.mutedText}>No members loaded yet.</Text>
          ) : (
            <View style={styles.memberGrid}>
              {members.map(m => (
                <View key={m.userId} style={styles.memberCell}>
                  <View style={[
                    styles.memberAvatar,
                    m.checkedInToday && styles.memberAvatarDone,
                  ]}>
                    <Text style={styles.memberInitial}>
                      {m.displayName.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                    {m.checkedInToday && (
                      <View style={styles.checkMark}>
                        <MaterialCommunityIcons name="check" size={10} color={AppColors.surface} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {m.userId === userId ? 'You' : m.displayName.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Leaderboard */}
        <Leaderboard entries={leaderboard} currentUserId={userId ?? ''} />

        {/* Group ID share hint */}
        <View style={styles.idBox}>
          <MaterialCommunityIcons name="identifier" size={16} color={AppColors.textMuted} />
          <Text style={styles.idText} numberOfLines={1} selectable>
            Group ID: {id}
          </Text>
          <TouchableOpacity onPress={handleShareGroupId} hitSlop={8}>
            <MaterialCommunityIcons name="content-copy" size={16} color={AppColors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surfaceAlt,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.md,
  },
  errorText: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
  },
  backBtn: {
    marginTop: AppSpacing.sm,
  },
  backBtnText: {
    fontSize: AppFontSize.md,
    color: AppColors.primary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    gap: AppSpacing.sm,
  },
  backIcon: {
    marginRight: AppSpacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: AppFontSize.xl,
    fontWeight: '700',
    color: AppColors.dark,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  memberSection: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  sectionTitle: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  mutedText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.md,
  },
  memberCell: {
    alignItems: 'center',
    gap: AppSpacing.xs,
    width: 56,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarDone: {
    backgroundColor: AppColors.accent,
  },
  memberInitial: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.surface,
  },
  checkMark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
  },
  idText: {
    flex: 1,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    fontFamily: 'monospace' as const,
  },
});
