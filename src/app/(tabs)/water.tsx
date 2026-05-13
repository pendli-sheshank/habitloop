import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useWaterStore } from '@/stores/water/useWaterStore';
import { useHydrationGoal } from '@/hooks/useHydrationGoal';
import { WaterLogSheet } from '@/components/water/WaterLogSheet';
import { WeatherGoalBanner } from '@/components/water/WeatherGoalBanner';
import { getUTCDayKey } from '@/utils/dateUtils';

function TodayLogList() {
  const logs = useWaterStore(s => s.logs);

  if (logs.length === 0) {
    return (
      <View style={styles.emptyLogs}>
        <Text style={styles.emptyText}>No water logged yet today.</Text>
        <Text style={styles.emptyHint}>Tap a button above to start tracking!</Text>
      </View>
    );
  }

  return (
    <View style={styles.logSection}>
      <Text style={styles.logHeading}>Today&apos;s Log</Text>
      {[...logs].reverse().map((entry) => {
        const time = new Date(entry.loggedAt);
        const hours = time.getHours() % 12 || 12;
        const mins = String(time.getMinutes()).padStart(2, '0');
        const ampm = time.getHours() >= 12 ? 'PM' : 'AM';

        return (
          <View key={entry.id} style={styles.logRow}>
            <Text style={styles.logAmount}>+{entry.amountMl} ml</Text>
            <Text style={styles.logTime}>{hours}:{mins} {ampm}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function WaterScreen() {
  const router = useRouter();
  const todayDate = useWaterStore(s => s.todayDate);
  const goalMl = useWaterStore(s => s.goalMl);
  const resetDay = useWaterStore(s => s.resetDay);
  const { weather, isLoading, refreshGoal } = useHydrationGoal();

  // Ensure day is current when screen mounts
  useEffect(() => {
    const today = getUTCDayKey(Date.now());
    if (todayDate !== today) {
      resetDay(today, goalMl);
    }
  }, [todayDate, goalMl, resetDay]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Hydration</Text>
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/water-history')}
            hitSlop={8}
          >
            <Text style={styles.historyLinkText}>History</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={AppColors.primary} />
          </TouchableOpacity>
        </View>

        <WaterLogSheet />

        <View style={styles.bannerContainer}>
          <WeatherGoalBanner
            goalMl={goalMl}
            weather={weather}
            isLoading={isLoading}
            onRefresh={refreshGoal}
          />
        </View>

        <TodayLogList />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surface,
  },
  scrollContent: {
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heading: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.dark,
    textAlign: 'center',
  },
  historyLink: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  historyLinkText: {
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    fontWeight: '600',
  },
  bannerContainer: {
    width: '100%',
  },
  logSection: {
    width: '100%',
    gap: AppSpacing.sm,
  },
  logHeading: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
    color: AppColors.dark,
    marginBottom: AppSpacing.xs,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  logAmount: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.primary,
  },
  logTime: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  emptyLogs: {
    alignItems: 'center',
    padding: AppSpacing.lg,
    gap: AppSpacing.xs,
  },
  emptyText: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
  },
  emptyHint: {
    fontSize: AppFontSize.sm,
    color: AppColors.gray,
  },
});
