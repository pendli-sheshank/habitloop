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
import { loadWaterHistory, type DailyWaterSummary } from '@/services/water/waterService';
import { BarChart } from '@/components/shared/Charts';
import type { BarDatum } from '@/components/shared/Charts';

type Period = '7d' | '30d';

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30 };

function buildBarData(summaries: DailyWaterSummary[], period: Period): BarDatum[] {
  const days = PERIOD_DAYS[period];
  const result: BarDatum[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const summary = summaries.find(s => s.date === key);
    const label = period === '7d'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
      : String(d.getDate());
    result.push({
      label,
      value: summary?.totalMl ?? 0,
      goal: summary?.goalMl,
      highlighted: summary?.goalMet ?? false,
    });
  }
  return result;
}

export default function WaterHistoryScreen() {
  const router  = useRouter();
  const userId  = useUserStore(s => s.user?.uid);

  const [period, setPeriod]     = useState<Period>('7d');
  const [loading, setLoading]   = useState(true);
  const [history, setHistory]   = useState<DailyWaterSummary[]>([]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    loadWaterHistory(userId, 30)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered    = history.filter(s => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
    return s.date >= cutoff.toISOString().slice(0, 10);
  });
  const barData     = buildBarData(history, period);
  const goalHitDays = filtered.filter(s => s.goalMet).length;
  const avgMl       = filtered.length
    ? Math.round(filtered.reduce((sum, s) => sum + s.totalMl, 0) / filtered.length)
    : 0;
  const maxMl       = filtered.length
    ? Math.max(...filtered.map(s => s.totalMl))
    : 0;
  const goalMl      = filtered[0]?.goalMl ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Hydration History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={AppColors.primary} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Period toggle */}
          <View style={styles.toggleRow}>
            {(['7d', '30d'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.toggleBtn, period === p && styles.toggleActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.toggleLabel, period === p && styles.toggleLabelActive]}>
                  {p === '7d' ? 'Last 7 days' : 'Last 30 days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="check-circle" size={20} color={AppColors.accent} />
              <Text style={styles.statValue}>{goalHitDays}</Text>
              <Text style={styles.statLabel}>Goal days</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="water" size={20} color={AppColors.primary} />
              <Text style={styles.statValue}>{(avgMl / 1000).toFixed(1)}L</Text>
              <Text style={styles.statLabel}>Daily avg</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trending-up" size={20} color={AppColors.warning} />
              <Text style={styles.statValue}>{(maxMl / 1000).toFixed(1)}L</Text>
              <Text style={styles.statLabel}>Best day</Text>
            </View>
          </View>

          {/* Bar chart */}
          <View style={styles.card}>
            <View style={styles.chartHeader}>
              <Text style={styles.cardTitle}>Daily Intake</Text>
              {goalMl > 0 && (
                <View style={styles.goalKey}>
                  <View style={styles.goalDash} />
                  <Text style={styles.goalKeyLabel}>Goal ({(goalMl / 1000).toFixed(1)}L)</Text>
                </View>
              )}
            </View>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No water logged yet.</Text>
            ) : (
              <BarChart
                data={barData}
                height={180}
                barColor={AppColors.primary}
                goalColor={AppColors.accent}
                unit="ml"
                maxValue={goalMl > 0 ? Math.max(goalMl * 1.2, maxMl * 1.1) : undefined}
              />
            )}
          </View>

          {/* Daily log */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Log</Text>
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No data for this period.</Text>
            ) : (
              [...filtered].reverse().map(s => (
                <View key={s.date} style={styles.logRow}>
                  <MaterialCommunityIcons
                    name={s.goalMet ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={s.goalMet ? AppColors.accent : AppColors.gray}
                  />
                  <View style={styles.logInfo}>
                    <Text style={styles.logDate}>
                      {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.logRight}>
                    <Text style={[styles.logMl, s.goalMet && styles.logMlGoalMet]}>
                      {(s.totalMl / 1000).toFixed(2)}L
                    </Text>
                    {s.goalMl > 0 && (
                      <Text style={styles.logGoal}>/ {(s.goalMl / 1000).toFixed(1)}L goal</Text>
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: AppColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  toggleLabelActive: {
    color: AppColors.dark,
    fontWeight: '700',
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
    fontSize: AppFontSize.lg,
    fontWeight: '800',
    color: AppColors.dark,
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.dark,
  },
  goalKey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  goalDash: {
    width: 16,
    height: 2,
    backgroundColor: AppColors.accent,
  },
  goalKeyLabel: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  emptyText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    textAlign: 'center',
    paddingVertical: AppSpacing.md,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontSize: AppFontSize.sm,
    color: AppColors.dark,
    fontWeight: '500',
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logMl: {
    fontSize: AppFontSize.sm,
    fontWeight: '700',
    color: AppColors.dark,
  },
  logMlGoalMet: {
    color: AppColors.accent,
  },
  logGoal: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
});
