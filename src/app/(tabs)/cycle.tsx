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
import { getMealSuggestions } from '@/services/ai/mealSuggestionService';
import { getDailyCoachingTip } from '@/services/ai/hormoneCoachingService';
import { PhaseCard } from '@/components/cycle/PhaseCard';
import { FastingWarningBanner } from '@/components/cycle/FastingWarningBanner';
import { SymptomLogger } from '@/components/cycle/SymptomLogger';
import { CycleCalendar } from '@/components/cycle/CycleCalendar';
import { HormoneCoachingCard } from '@/components/subscription/HormoneCoachingCard';
import { MealSuggestionCard } from '@/components/subscription/MealSuggestionCard';
import type { SymptomEntry, CyclePhaseType } from '@/types/cycle';
import type { MealSuggestionSet, CoachingTip } from '@/types/subscription';

export default function CycleScreen() {
  const userId            = useUserStore(s => s.user?.uid);
  const selectedProtocol  = useFastingStore(s => s.selectedProtocol);

  const lastPeriodStart    = useCycleStore(s => s.lastPeriodStart);
  const avgCycleLength     = useCycleStore(s => s.avgCycleLength);
  const avgPeriodLength    = useCycleStore(s => s.avgPeriodLength);
  const todaySymptoms      = useCycleStore(s => s.todaySymptoms);
  const symptomDate        = useCycleStore(s => s.symptomDate);
  const setLastPeriodStart = useCycleStore(s => s.setLastPeriodStart);
  const setTodaySymptoms   = useCycleStore(s => s.setTodaySymptoms);

  const { phase, dayOfCycle, recommendation, isTracking, warnForProtocol } = useCyclePhase();

  const [syncing, setSyncing]             = useState(false);
  const [meals, setMeals]                 = useState<MealSuggestionSet | null>(null);
  const [mealsLoading, setMealsLoading]   = useState(false);
  const [coachingTip, setCoachingTip]     = useState<CoachingTip | null>(null);

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

        if (log) setLastPeriodStart(log.periodStartDate);
        if (symptoms) setTodaySymptoms(symptoms, today);
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

  // Load coaching and meal suggestions when phase is known
  useEffect(() => {
    if (!isTracking || !phase) return;

    const tip = getDailyCoachingTip(phase as CyclePhaseType, today);
    setCoachingTip(tip);

    let cancelled = false;
    setMealsLoading(true);

    getMealSuggestions(selectedProtocol, phase as CyclePhaseType, today)
      .then((result) => {
        if (!cancelled) setMeals(result);
      })
      .catch(() => { if (!cancelled) setMeals(null); })
      .finally(() => { if (!cancelled) setMealsLoading(false); });

    return () => { cancelled = true; };
  }, [isTracking, phase, today, selectedProtocol]);

  const handleSelectDate = useCallback(async (isoDate: string) => {
    if (!userId) return;
    setLastPeriodStart(isoDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await savePeriodStart(userId, isoDate);
      const log = await loadLatestCycleLog(userId);
      if (log) setLastPeriodStart(log.periodStartDate);
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
          <ActivityIndicator size="small" color={AppColors.primary} style={styles.spinner} />
        )}

        {isTracking && phase && dayOfCycle !== null && recommendation && (
          <PhaseCard
            phase={phase as CyclePhaseType}
            dayOfCycle={dayOfCycle}
            recommendation={recommendation}
          />
        )}

        {showWarning && recommendation && (
          <FastingWarningBanner
            recommendation={recommendation}
            selectedProtocol={selectedProtocol}
          />
        )}

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

        {/* Hormone coaching tip — shown to all users when tracking */}
        {isTracking && phase && coachingTip && (
          <HormoneCoachingCard
            tip={coachingTip}
            phase={phase as CyclePhaseType}
            onAction={() => {}}
          />
        )}

        {/* AI meal suggestions — shown to all users */}
        {isTracking && phase && (
          <MealSuggestionCard
            meals={meals}
            loading={mealsLoading}
            onRetry={() => {
              if (!phase) return;
              setMealsLoading(true);
              getMealSuggestions(selectedProtocol, phase as CyclePhaseType, today)
                .then(setMeals)
                .catch(() => setMeals(null))
                .finally(() => setMealsLoading(false));
            }}
          />
        )}

        <CycleCalendar
          lastPeriodStart={lastPeriodStart}
          avgCycleLength={avgCycleLength}
          avgPeriodLength={avgPeriodLength}
          onSelectDate={handleSelectDate}
        />

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
