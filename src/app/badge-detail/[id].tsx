import React from 'react';
import { StyleSheet, View, TouchableOpacity, Share } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import type { BadgeId } from '@/types/gamification';

interface BadgeMeta {
  emoji: string;
  label: string;
  description: string;
  unlockCondition: string;
  xpValue: number;
}

const BADGE_REGISTRY: Record<BadgeId, BadgeMeta> = {
  'first-fast': {
    emoji: '⚡',
    label: 'First Fast',
    description: 'You completed your very first intermittent fast. Every journey starts with a single step.',
    unlockCondition: 'Complete your first fast of any protocol.',
    xpValue: 50,
  },
  'hydration-hero': {
    emoji: '💧',
    label: 'Hydration Hero',
    description: 'You hit your daily hydration goal. Staying hydrated keeps fasting easier and energy levels stable.',
    unlockCondition: 'Reach your daily water goal.',
    xpValue: 20,
  },
  'streak-starter': {
    emoji: '🔥',
    label: 'Streak Starter',
    description: 'Seven days in a row — you have built a real habit. Consistency is the hardest and most rewarding part.',
    unlockCondition: 'Maintain a 7-day fasting streak.',
    xpValue: 100,
  },
  'cycle-logger': {
    emoji: '🌸',
    label: 'Cycle Logger',
    description: 'You logged your cycle data and started syncing your fasting to your hormonal phase.',
    unlockCondition: 'Log your first period start date.',
    xpValue: 15,
  },
  'protocol-explorer': {
    emoji: '🧪',
    label: 'Protocol Explorer',
    description: 'Curiosity pays off. You tried a different fasting protocol and found what works for you.',
    unlockCondition: 'Complete a fast on two different protocols.',
    xpValue: 30,
  },
};

export default function BadgeDetailScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ id: string }>();
  const badgeIds = useUserStore(s => s.streakAggregate?.badgeIds ?? []);

  const rawId   = Array.isArray(params.id) ? params.id[0] : params.id;
  const badgeId = (rawId ?? '') as BadgeId;
  const meta    = BADGE_REGISTRY[badgeId];
  const earned  = badgeIds.includes(badgeId);

  if (!meta) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Badge not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `I just earned the "${meta.label}" badge on HabitLoop! ${meta.emoji}`,
      });
    } catch {
      // User cancelled or share unavailable — no-op
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badge</Text>
        {earned ? (
          <TouchableOpacity onPress={handleShare} hitSlop={8}>
            <MaterialCommunityIcons name="share-variant" size={22} color={AppColors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={styles.content}>
        {/* Badge hero */}
        <View style={[styles.heroBadge, !earned && styles.heroBadgeLocked]}>
          <Text style={styles.heroEmoji}>{meta.emoji}</Text>
        </View>

        {!earned && (
          <View style={styles.lockedPill}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={AppColors.gray} />
            <Text style={styles.lockedText}>Not yet earned</Text>
          </View>
        )}

        {earned && (
          <View style={styles.earnedPill}>
            <MaterialCommunityIcons name="check-circle" size={14} color={AppColors.accent} />
            <Text style={styles.earnedText}>Earned</Text>
          </View>
        )}

        <Text style={styles.badgeLabel}>{meta.label}</Text>
        <Text style={styles.badgeDesc}>{meta.description}</Text>

        {/* Details card */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color={AppColors.primary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>How to unlock</Text>
              <Text style={styles.detailValue}>{meta.unlockCondition}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="star-outline" size={20} color={AppColors.warning} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>XP reward</Text>
              <Text style={styles.detailValue}>+{meta.xpValue} XP</Text>
            </View>
          </View>
        </View>

        {!earned && (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaLabel}>Keep going — you can do it!</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  backBtn: {
    padding: AppSpacing.xs,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: AppSpacing.xl,
    gap: AppSpacing.md,
  },
  heroBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.sm,
  },
  heroBadgeLocked: {
    backgroundColor: AppColors.surfaceAlt,
    opacity: 0.5,
  },
  heroEmoji: {
    fontSize: 56,
  },
  earnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: '#ECFDF5',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  earnedText: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
    color: AppColors.accent,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  lockedText: {
    fontSize: AppFontSize.sm,
    color: AppColors.gray,
  },
  badgeLabel: {
    fontSize: AppFontSize.xxl,
    fontWeight: '800',
    color: AppColors.dark,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 23,
  },
  detailCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginTop: AppSpacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    alignItems: 'flex-start',
  },
  detailText: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: AppFontSize.md,
    color: AppColors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
  ctaBtn: {
    marginTop: AppSpacing.md,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.full,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.xl,
  },
  ctaLabel: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.surface,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
  },
});
