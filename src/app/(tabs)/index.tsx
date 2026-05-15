import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { useFastingTimer } from '@/hooks/useFastingTimer';
import { useFastingResync } from '@/hooks/useFastingResync';
import { getProtocolDurationMs, calculateEatingWindowEnd, needsElectrolytes, needsMedicalSupervision } from '@/services/fasting/fastingEngine';
import { saveFastSession, persistFastCompletion } from '@/services/fasting/fastingService';
import { scheduleFastingNotifications } from '@/services/notifications/notificationService';
import { updateStreak } from '@/services/fasting/streakEngine';
import { calcFastXp, calcStreakBonusXp, getStreakMultiplier } from '@/services/fasting/xpEngine';
import { getNextUnlock, getProtocolMeta } from '@/constants/protocols';
import { getUTCDayKey } from '@/utils/dateUtils';
import { FastingTimer } from '@/components/fasting/FastingTimer';
import { ProtocolPicker } from '@/components/fasting/ProtocolPicker';
import { EatingWindowBanner } from '@/components/fasting/EatingWindowBanner';
import { StreakCounter } from '@/components/shared/StreakCounter';
import type { FastingProtocol, FastCompletionResult } from '@/types/fasting';

export default function HomeScreen() {
  const router = useRouter();
  const userId = useUserStore(s => s.user?.uid);
  const streakAggregate = useUserStore(s => s.streakAggregate);

  const activeFast = useFastingStore(s => s.activeFast);
  const selectedProtocol = useFastingStore(s => s.selectedProtocol);
  const completedToday = useFastingStore(s => s.completedToday);
  const totalCompletedFasts = useFastingStore(s => s.totalCompletedFasts);
  const setSelectedProtocol = useFastingStore(s => s.setSelectedProtocol);
  const startFast = useFastingStore(s => s.startFast);
  const completeFast = useFastingStore(s => s.completeFast);
  const cancelFast = useFastingStore(s => s.cancelFast);
  const incrementCompletedFasts = useFastingStore(s => s.incrementCompletedFasts);

  const timer = useFastingTimer();

  // Resync timer on app foreground (wall-clock recalculation)
  useFastingResync(() => {
    // Timer hook already recalculates via AppState listener
    // This ensures any completion that happened while backgrounded is detected
    if (activeFast && timer.isComplete) {
      handleCompleteFast();
    }
  });

  const handleStartFast = useCallback(() => {
    const durationMs = getProtocolDurationMs(selectedProtocol);
    const startTime = Date.now();
    startFast(selectedProtocol, durationMs);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scheduleFastingNotifications(startTime, durationMs).catch(
      (e) => console.error('[HomeScreen] Failed to schedule notifications:', e),
    );
  }, [selectedProtocol, startFast]);

  const handleCompleteFast = useCallback(async () => {
    if (!activeFast || !userId) return;

    const streakDays = streakAggregate?.currentStreakDays ?? 0;
    const xpEarned = calcFastXp(activeFast.protocol, true, streakDays);
    const today = getUTCDayKey(Date.now());

    let newStreak = 1;
    let longestStreak = 1;
    let bonusXp = 0;

    if (streakAggregate) {
      const streakResult = updateStreak(
        streakAggregate.currentStreakDays,
        streakAggregate.lastStreakDate,
        today,
      );
      newStreak = streakResult.newStreak;
      longestStreak = Math.max(streakAggregate.longestStreakDays, newStreak);
      bonusXp = calcStreakBonusXp(newStreak);
    }

    const streakMultiplier = getStreakMultiplier(newStreak);

    const result: FastCompletionResult = {
      xpEarned,
      bonusXp,
      streakMultiplier,
      newStreak,
      longestStreak,
    };

    completeFast(result);
    incrementCompletedFasts();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await saveFastSession(userId, activeFast, true, streakMultiplier);
      await persistFastCompletion(
        userId,
        result,
        streakAggregate?.xpTotal ?? 0,
      );
    } catch (e) {
      console.error('[HomeScreen] Failed to save fast session:', e);
    }
  }, [activeFast, userId, streakAggregate, completeFast, incrementCompletedFasts]);

  const handleCancelFast = useCallback(() => {
    Alert.alert(
      'Cancel Fast',
      'Are you sure you want to cancel your current fast? Progress will not be saved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Fast',
          style: 'destructive',
          onPress: async () => {
            if (activeFast && userId) {
              try {
                await saveFastSession(userId, activeFast, false);
              } catch (e) {
                console.error('[HomeScreen] Failed to save cancelled session:', e);
              }
            }
            cancelFast();
          },
        },
      ],
    );
  }, [activeFast, userId, cancelFast]);

  const handleProtocolSelect = useCallback((protocol: FastingProtocol) => {
    setSelectedProtocol(protocol);
  }, [setSelectedProtocol]);

  const eatingWindowEnd = activeFast
    ? calculateEatingWindowEnd(activeFast.startTime, activeFast.targetDurationMs)
    : null;

  const selectedMeta = getProtocolMeta(selectedProtocol);
  const selectedNeedsElectrolytes = needsElectrolytes(selectedProtocol);
  const selectedNeedsMedical = needsMedicalSupervision(selectedProtocol);
  const nextUnlock = getNextUnlock(totalCompletedFasts);

  // Electrolyte reminder applies to active fast when protocol is 36h+
  const activeNeedsElectrolytes = activeFast ? needsElectrolytes(activeFast.protocol) : false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Fasting</Text>

        <FastingTimer
          remainingMs={timer.remainingMs}
          elapsedMs={timer.elapsedMs}
          overtimeMs={timer.overtimeMs}
          progress={timer.progress}
          isActive={timer.isActive}
          isComplete={timer.isComplete}
          stageLabel={timer.stage.label}
          stageColor={timer.stage.color}
          stageDescription={timer.stage.description}
          needsElectrolytes={activeNeedsElectrolytes}
        />

        {!timer.isActive && (
          <>
            {/* Smart recommendation when no fast is active */}
            {nextUnlock && !completedToday && (
              <View style={styles.recommendationBanner}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color={AppColors.warning} />
                <Text style={styles.recommendationText}>
                  Complete {nextUnlock.fastsNeeded} more fast{nextUnlock.fastsNeeded !== 1 ? 's' : ''} to unlock{' '}
                  <Text style={styles.recommendationBold}>{nextUnlock.protocol.label}</Text>
                </Text>
              </View>
            )}

            {/* Electrolyte warning before starting extended fasts */}
            {selectedNeedsElectrolytes && (
              <View style={styles.electrolyteWarning}>
                <Text style={styles.electrolyteWarningText}>
                  💧 {selectedMeta.label} requires electrolytes (sodium, potassium, magnesium).
                </Text>
              </View>
            )}

            {/* Medical supervision warning for extreme fasts */}
            {selectedNeedsMedical && (
              <View style={styles.medicalWarning}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={AppColors.danger} />
                <Text style={styles.medicalWarningText}>
                  {selectedMeta.warningText ?? 'Medical supervision required for this protocol.'}
                </Text>
              </View>
            )}

            <ProtocolPicker
              selected={selectedProtocol}
              onSelect={handleProtocolSelect}
              totalCompletedFasts={totalCompletedFasts}
              disabled={timer.isActive}
            />
          </>
        )}

        {timer.isActive && eatingWindowEnd && (
          <EatingWindowBanner
            eatingWindowStart={eatingWindowEnd}
            isComplete={timer.isComplete}
          />
        )}

        <View style={styles.buttonRow}>
          {!timer.isActive && (
            <Button
              mode="contained"
              buttonColor={AppColors.primary}
              textColor={AppColors.surface}
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={handleStartFast}
            >
              {completedToday ? 'Start Another Fast' : 'Start Fast'}
            </Button>
          )}

          {timer.isActive && timer.isComplete && (
            <Button
              mode="contained"
              buttonColor={AppColors.accent}
              textColor={AppColors.surface}
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={handleCompleteFast}
            >
              Complete Fast
            </Button>
          )}

          {timer.isActive && !timer.isComplete && (
            <Button
              mode="outlined"
              textColor={AppColors.danger}
              style={[styles.actionButton, styles.cancelButton]}
              labelStyle={styles.actionLabel}
              onPress={handleCancelFast}
            >
              Cancel Fast
            </Button>
          )}
        </View>

        <StreakCounter />

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/fast-history')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="history" size={16} color={AppColors.primary} />
          <Text style={styles.historyLinkText}>View fast history</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={AppColors.primary} />
        </TouchableOpacity>
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
    alignItems: 'center',
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  heading: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.dark,
  },
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    width: '100%',
  },
  recommendationText: {
    fontSize: AppFontSize.sm,
    color: AppColors.text,
    flex: 1,
  },
  recommendationBold: {
    fontWeight: '700',
  },
  electrolyteWarning: {
    backgroundColor: '#EFF6FF',
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    width: '100%',
  },
  electrolyteWarningText: {
    fontSize: AppFontSize.sm,
    color: '#2563EB',
    lineHeight: 18,
  },
  medicalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.xs,
    backgroundColor: '#FEF2F2',
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    width: '100%',
  },
  medicalWarningText: {
    fontSize: AppFontSize.sm,
    color: AppColors.danger,
    flex: 1,
    lineHeight: 18,
  },
  buttonRow: {
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    borderRadius: 999,
    paddingVertical: AppSpacing.xs,
    minWidth: 200,
  },
  cancelButton: {
    borderColor: AppColors.danger,
  },
  actionLabel: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  historyLinkText: {
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    fontWeight: '600',
  },
});
