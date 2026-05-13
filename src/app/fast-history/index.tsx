import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { loadFastHistory } from '@/services/fasting/fastingService';
import { FastHeatmap, BarChart } from '@/components/shared/Charts';
import type { FastSession } from '@/types/fasting';
import type { HeatmapDatum, BarDatum } from '@/components/shared/Charts';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildHeatmapData(sessions: FastSession[]): HeatmapDatum[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    const date = new Date(s.startTime).toISOString().slice(0, 10);
    byDate.set(date, s.completed ? 2 : Math.max(byDate.get(date) ?? 0, 1));
  }
  return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
}

function buildWeeklyBarData(sessions: FastSession[]): BarDatum[] {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Array(7).fill(0);
  for (const s of sessions) {
    const dow = new Date(s.startTime).getDay();
    counts[dow]++;
  }
  return DAY_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

export default function FastHistoryScreen() {
  const router = useRouter();
  const userId = useUserStore(s => s.user?.uid);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FastSession[]>([]);

  useEffect(() => {
    if (!userId) return;
    loadFastHistory(userId, 90)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [userId]);

  const heatmapData = buildHeatmapData(sessions);
  const weeklyData  = buildWeeklyBarData(sessions);

  const totalCompleted = sessions.length; // service query filters completed:true
  const totalXp        = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const avgDurationMs  = sessions.length
    ? sessions.reduce((sum, s) => sum + ((s.endTime ?? Date.now()) - s.startTime), 0) / sessions.length
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Fast History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={AppColors.primary} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Summary cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalCompleted}</Text>
              <Text style={styles.statLabel}>Fasts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatDuration(avgDurationMs)}</Text>
              <Text style={styles.statLabel}>Avg duration</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalXp}</Text>
              <Text style={styles.statLabel}>XP earned</Text>
            </View>
          </View>

          {/* Heatmap */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>13-Week Activity</Text>
            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>No fasts recorded yet.</Text>
            ) : (
              <FastHeatmap data={heatmapData} weeks={13} />
            )}
          </View>

          {/* Weekly pattern bar chart */}
          {sessions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fasts by Day of Week</Text>
              <BarChart data={weeklyData} height={160} unit="" />
            </View>
          )}

          {/* Recent sessions list */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Sessions</Text>
            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>Complete your first fast to see history here.</Text>
            ) : (
              sessions.slice(0, 30).map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={[styles.sessionDot, { backgroundColor: s.completed ? AppColors.accent : AppColors.gray }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{formatDate(s.startTime)}</Text>
                    <Text style={styles.sessionDetail}>
                      {s.protocol} · {formatDuration((s.endTime ?? s.startTime) - s.startTime)}
                    </Text>
                  </View>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionXp}>+{s.xpEarned} XP</Text>
                    {!s.completed && (
                      <Text style={styles.cancelledTag}>Cancelled</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  title: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  loader: {
    flex: 1,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statValue: {
    fontSize: AppFontSize.xl,
    fontWeight: '800',
    color: AppColors.primary,
  },
  statLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.dark,
  },
  emptyText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    textAlign: 'center',
    paddingVertical: AppSpacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDate: {
    fontSize: AppFontSize.sm,
    fontWeight: '600',
    color: AppColors.dark,
  },
  sessionDetail: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  sessionXp: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
    color: AppColors.primary,
  },
  cancelledTag: {
    fontSize: AppFontSize.xs,
    color: AppColors.gray,
  },
});
