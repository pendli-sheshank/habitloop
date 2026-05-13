import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { useCycleStore } from '@/stores/cycle/useCycleStore';
import { useCyclePhase } from '@/hooks/useCyclePhase';
import { getUTCDayKey } from '@/utils/dateUtils';
import {
  savePeriodStart,
  logSymptoms,
  loadLatestCycleLog,
  loadTodaySymptoms,
} from '@/services/cycle/cycleService';
import { PhaseCard } from '@/components/cycle/PhaseCard';
import { FastingWarningBanner } from '@/components/cycle/FastingWarningBanner';
import { SymptomLogger } from '@/components/cycle/SymptomLogger';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
import type { SymptomEntry } from '@/types/cycle';

export default function CycleScreen() {
  const userId            = useUserStore(s => s.user?.uid);
  const selectedProtocol  = useFastingStore(s => s.selectedProtocol);

  const lastPeriodStart   = useCycleStore(s => s.lastPeriodStart);
  const avgCycleLength    = useCycleStore(s => s.avgCycleLength);
  const avgPeriodLength   = useCycleStore(s => s.avgPeriodLength);
  const todaySymptoms     = useCycleStore(s => s.todaySymptoms);
  const symptomDate       = useCycleStore(s => s.symptomDate);
  const setLastPeriodStart = useCycleStore(s => s.setLastPeriodStart);
  const setAvgCycleLength  = useCycleStore(s => s.setAvgCycleLength);
  const setTodaySymptoms   = useCycleStore(s => s.setTodaySymptoms);

  const { phase, dayOfCycle, recommendation, isTracking, warnForProtocol } = useCyclePhase();

  const [syncing, setSyncing] = useState(false);
  const today = getUTCDayKey(Date.now());

  // Hydrate store from Firestore on mount
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function sync() {
      if (!userId) return;
      setSyncing(true);
      try {
        const [log, symptoms] = await Promise.all([
          loadLatestCycleLog(userId),
          loadTodaySymptoms(userId),
        ]);
        if (cancelled) return;

        if (log) {
          setLastPeriodStart(log.periodStartDate);
        }
        if (symptoms) {
          setTodaySymptoms(symptoms, today);
        }
      } catch (e) {
        console.error('[CycleScreen] sync failed:', e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    sync();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Clear symptom cache when day rolls over
  useEffect(() => {
    if (symptomDate && symptomDate !== today) {
      useCycleStore.getState().clearTodaySymptoms();
    }
  }, [today, symptomDate]);

  const handleSelectDate = useCallback(async (isoDate: string) => {
    if (!userId) return;
    setLastPeriodStart(isoDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const logId = await savePeriodStart(userId, isoDate);
      // avgCycleLength is recalculated server-side; refresh from Firestore
      const log = await loadLatestCycleLog(userId);
      if (log) setLastPeriodStart(log.periodStartDate);
      console.log('[CycleScreen] period start saved, logId:', logId);
    } catch (e) {
      console.error('[CycleScreen] savePeriodStart failed:', e);
    }
  }, [userId, setLastPeriodStart]);

  const handleSaveSymptoms = useCallback(async (symptoms: SymptomEntry) => {
    if (!userId) return;
    setTodaySymptoms(symptoms, today);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await logSymptoms(userId, today, symptoms);
    } catch (e) {
      console.error('[CycleScreen] logSymptoms failed:', e);
    }
  }, [userId, today, setTodaySymptoms]);

  const showWarning = isTracking && recommendation
    ? warnForProtocol(selectedProtocol)
    : false;

  const cachedSymptomsForToday = symptomDate === today ? todaySymptoms : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Cycle</Text>

        {syncing && (
          <ActivityIndicator
            size="small"
            color={AppColors.primary}
            style={styles.spinner}
          />
        )}

        {/* Phase card — only when tracking */}
        {isTracking && phase && dayOfCycle !== null && recommendation && (
          <PhaseCard
            phase={phase}
            dayOfCycle={dayOfCycle}
            recommendation={recommendation}
          />
        )}

        {/* Warning banner — only when protocol exceeds recommendation */}
        {showWarning && recommendation && (
          <FastingWarningBanner
            recommendation={recommendation}
            selectedProtocol={selectedProtocol}
          />
        )}

        {/* Empty state — no period date set yet */}
        {!isTracking && !syncing && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyTitle}>Start tracking your cycle</Text>
            <Text style={styles.emptyBody}>
              Tap any past date on the calendar to log your last period start.
              HabitLoop will tailor fasting recommendations to your hormonal phase.
            </Text>
          </View>
        )}

        {/* Calendar — always visible */}
        <CycleCalendar
          lastPeriodStart={lastPeriodStart}
          avgCycleLength={avgCycleLength}
          avgPeriodLength={avgPeriodLength}
          onSelectDate={handleSelectDate}
        />

        {/* Symptom logger — only when tracking */}
        {isTracking && (
          <SymptomLogger
            initialSymptoms={cachedSymptomsForToday}
            alreadyLoggedToday={cachedSymptomsForToday !== null}
            onSave={handleSaveSymptoms}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surfaceAlt,
  },
  scrollContent: {
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
  spinner: {
    alignSelf: 'center',
  },
  emptyCard: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
