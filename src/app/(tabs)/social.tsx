import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';
import { useUserStore } from '@/stores/user/useUserStore';
import { useGroupStore } from '@/stores/group/useGroupStore';
import { XPBar } from '@/components/shared/XPBar';
import { BadgeChip } from '@/components/shared/BadgeChip';
import { GroupCard } from '@/components/social/GroupCard';
import { loadUserGroups, createGroup, joinGroup } from '@/services/group/groupService';
import { scheduleChallengeStartNotification, schedulePartnerNudges } from '@/services/notifications/notificationService';
import { getUTCDayKey } from '@/utils/dateUtils';
import type { BadgeId } from '@/types/gamification';
import type { FastingProtocol } from '@/types/fasting';

// ─── Create Group Modal ────────────────────────────────────────────────────────

const DURATIONS: Array<7 | 14> = [7, 14];

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}

function CreateGroupModal({ visible, onClose, onCreated, userId }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<FastingProtocol>('16:8');
  const [duration, setDuration] = useState<7 | 14>(7);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName('');
    setProtocol('16:8');
    setDuration(7);
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Group name required', 'Please enter a name for your group.');
      return;
    }
    setSaving(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().slice(0, 10);

      const groupId = await createGroup(userId, {
        name: name.trim(),
        protocol,
        durationDays: duration,
        startDate,
      });

      // Schedule notifications for the new challenge
      await scheduleChallengeStartNotification(name.trim(), startDate).catch(() => {});
      await schedulePartnerNudges(name.trim(), startDate, duration).catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[social] group created:', groupId);
      resetForm();
      onCreated();
      onClose();
    } catch (e) {
      console.error('[social] createGroup failed:', e);
      Alert.alert('Error', 'Could not create group. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Group</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={24} color={AppColors.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.fieldLabel}>Group name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning Warriors"
            mode="outlined"
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.primary}
            style={styles.input}
            maxLength={40}
          />

          <Text style={styles.fieldLabel}>Fasting protocol</Text>
          <View style={styles.chipRow}>
            {PROTOCOL_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, protocol === opt.value && styles.chipActive]}
                onPress={() => setProtocol(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, protocol === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.chipRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, duration === d && styles.chipActive]}
                onPress={() => setDuration(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>
                  {d} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color={AppColors.primary} />
            <Text style={styles.infoText}>
              Challenge starts tomorrow. Share your group ID with friends so they can join.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={AppColors.surface} />
              : <Text style={styles.createBtnText}>Create Group</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Join Group Modal ─────────────────────────────────────────────────────────

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
  userId: string;
}

function JoinGroupModal({ visible, onClose, onJoined, userId }: JoinGroupModalProps) {
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleJoin() {
    if (!groupId.trim()) {
      Alert.alert('Group ID required', 'Paste the group ID shared by your friend.');
      return;
    }
    setSaving(true);
    try {
      await joinGroup(userId, groupId.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGroupId('');
      onJoined();
      onClose();
    } catch (e) {
      console.error('[social] joinGroup failed:', e);
      Alert.alert('Error', 'Could not join group. Check the ID and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Join Group</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={24} color={AppColors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <Text style={styles.fieldLabel}>Group ID</Text>
          <TextInput
            value={groupId}
            onChangeText={setGroupId}
            placeholder="Paste the group ID here"
            mode="outlined"
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.primary}
            style={styles.input}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleJoin}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={AppColors.surface} />
              : <Text style={styles.createBtnText}>Join Group</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const router   = useRouter();
  const userId   = useUserStore(s => s.user?.uid);
  const streak   = useUserStore(s => s.streakAggregate);

  const groups         = useGroupStore(s => s.groups);
  const todayCheckIns  = useGroupStore(s => s.todayCheckIns);
  const checkInDate    = useGroupStore(s => s.checkInDate);
  const setGroups      = useGroupStore(s => s.setGroups);

  const [loading, setLoading]             = useState(false);
  const [showCreate, setShowCreate]       = useState(false);
  const [showJoin, setShowJoin]           = useState(false);

  const today = getUTCDayKey(Date.now());
  const earnedBadges = (streak?.badgeIds ?? []) as BadgeId[];

  const loadGroups = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const loaded = await loadUserGroups(userId);
      setGroups(loaded);
    } catch (e) {
      console.error('[social] loadUserGroups failed:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, setGroups]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  function handleGroupPress(groupId: string) {
    router.push(`/group/${groupId}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Social</Text>

        {/* XP progress bar */}
        <View style={styles.card}>
          <XPBar />
        </View>

        {/* Badge shelf */}
        {earnedBadges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
              <View style={styles.badgeRow}>
                {earnedBadges.map(id => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => router.push(`/badge-detail/${id}`)}
                    activeOpacity={0.7}
                  >
                    <BadgeChip badgeId={id} earned />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Groups section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Groups</Text>
            {loading && <ActivityIndicator size="small" color={AppColors.primary} />}
          </View>

          {groups.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🤝</Text>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyBody}>
                Create a group and invite friends to fast together.
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                checkedInToday={checkInDate === today && todayCheckIns[group.id] === true}
                onPress={handleGroupPress}
              />
            ))
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={20} color={AppColors.surface} />
            <Text style={styles.actionBtnText}>Create Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => setShowJoin(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-plus-outline" size={20} color={AppColors.primary} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadGroups}
        userId={userId ?? ''}
      />
      <JoinGroupModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={loadGroups}
        userId={userId ?? ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surfaceAlt,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  heading: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.dark,
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
  },
  section: {
    gap: AppSpacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  badgeScroll: {
    marginHorizontal: -AppSpacing.lg,
    paddingHorizontal: AppSpacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  emptyCard: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.xl,
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  emptyBody: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
  },
  actionBtnSecondary: {
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.primary,
  },
  actionBtnText: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.surface,
  },
  actionBtnTextSecondary: {
    color: AppColors.primary,
  },
  // Modal styles
  modalSafe: {
    flex: 1,
    backgroundColor: AppColors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: AppFontSize.xl,
    fontWeight: '700',
    color: AppColors.dark,
  },
  modalBody: {
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  fieldLabel: {
    fontSize: AppFontSize.sm,
    fontWeight: '600',
    color: AppColors.dark,
    marginBottom: -AppSpacing.xs,
  },
  input: {
    backgroundColor: AppColors.surface,
    fontSize: AppFontSize.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  chip: {
    borderRadius: AppRadius.full,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  chipActive: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  chipText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: AppColors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: AppFontSize.sm,
    color: AppColors.dark,
    lineHeight: 20,
  },
  createBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  createBtnDisabled: {
    backgroundColor: AppColors.border,
  },
  createBtnText: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.surface,
  },
});
