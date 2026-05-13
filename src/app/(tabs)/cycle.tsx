import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { useCycleStore } from '@/stores/cycle/useCycleStore';
import { useSubscriptionStore } from '@/stores/subscription/useSubscriptionStore';
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
import { PaywallSheet } from '@/components/subscription/PaywallSheet';
import type { SymptomEntry, CyclePhaseType } from '@/types/cycle';
import type { MealSuggestionSet, CoachingTip, PremiumFeature } from '@/types/subscription';

export default function CycleScreen() {
  const userId            = useUserStore(s => s.user?.uid);
  const selectedProtocol  = useFastingStore(s => s.selectedProtocol);
  const isPremium         = useSubscriptionStore(s => s.isPremium);

  const lastPeriodStart    = useCycleStore(s => s.lastPeriodStart);
  const avgCycleLength     = useCycleStore(s => s.avgCycleLength);
  const avgPeriodLength    = useCycleStore(s => s.avgPeriodLength);
  const todaySymptoms      = useCycleStore(s => s.todaySymptoms);
  const symptomDate        = useCycleStore(s => s.symptomDate);
  const setLastPeriodStart = useCycleStore(s => s.setLastPeriodStart);
  const setTodaySymptoms   = useCycleStore(s => s.setTodaySymptoms);

  const { phase, dayOfCycle, recommendation, isTracking, warnForProtocol } = useCyclePhase();

  const [syncing, setSyncing]         = useState(false);
  const [meals, setMeals]             = useState<MealSuggestionSet | null>(null);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [coachingTip, setCoachingTip] = useState<CoachingTip | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<PremiumFeature | null>(null);

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

  // Load premium content when phase is known and user is premium
  useEffect(() => {
    if (!isTracking || !phase) return;

    const tip = getDailyCoachingTip(phase as CyclePhaseType, today);
    setCoachingTip(tip);

    if (!isPremium) return;

    let cancelled = false;
    setMealsLoading(true);

    getMealSuggestions(selectedProtocol, phase as CyclePhaseType, today)
      .then((result) => {
        if (!cancelled) setMeals(result);
      })
      .catch(() => { if (!cancelled) setMeals(null); })
      .finally(() => { if (!cancelled) setMealsLoading(false); });

    return () => { cancelled = true; };
  }, [isTracking, phase, today, isPremium, selectedProtocol]);

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
          isPremium ? (
            <HormoneCoachingCard
              tip={coachingTip}
              phase={phase as CyclePhaseType}
              onAction={() => {}}
            />
          ) : (
            <TouchableOpacity
              style={styles.lockedCard}
              onPress={() => setPaywallFeature('hormone-coaching')}
              activeOpacity={0.75}
            >
              <View style={styles.lockedRow}>
                <MaterialCommunityIcons name="head-heart-outline" size={22} color={AppColors.primary} />
                <View style={styles.lockedText}>
                  <Text style={styles.lockedTitle}>{coachingTip.headline}</Text>
                  <Text style={styles.lockedSub}>Hormone coaching · Pro feature</Text>
                </View>
                <MaterialCommunityIcons name="lock-outline" size={20} color={AppColors.gray} />
              </View>
            </TouchableOpacity>
          )
        )}

        {/* AI meal suggestions — premium only */}
        {isTracking && phase && (
          isPremium ? (
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
          ) : (
            <TouchableOpacity
              style={styles.lockedCard}
              onPress={() => setPaywallFeature('ai-meals')}
              activeOpacity={0.75}
            >
              <View style={styles.lockedRow}>
                <MaterialCommunityIcons name="food-variant" size={22} color={AppColors.accent} />
                <View style={styles.lockedText}>
                  <Text style={styles.lockedTitle}>AI Meal Suggestions</Text>
                  <Text style={styles.lockedSub}>Tailored to your phase & protocol · Pro feature</Text>
                </View>
                <MaterialCommunityIcons name="lock-outline" size={20} color={AppColors.gray} />
              </View>
            </TouchableOpacity>
          )
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

      {paywallFeature && (
        <PaywallSheet
          visible={paywallFeature !== null}
          feature={paywallFeature}
          onClose={() => setPaywallFeature(null)}
          onUpgraded={() => setPaywallFeature(null)}
        />
      )}
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
  lockedCard: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  lockedText: {
    flex: 1,
    gap: 2,
  },
  lockedTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.dark,
  },
  lockedSub: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
});
