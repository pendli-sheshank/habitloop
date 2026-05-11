import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { AppColors, AppSpacing, AppFontSize } from '@/constants/theme';
import { useWaterStore } from '@/stores/water/useWaterStore';
import { useUserStore } from '@/stores/user/useUserStore';
import { logWaterIntake } from '@/services/water/hydrationTracker';
import { saveWaterEvent, awardHydrationXp } from '@/services/water/waterService';
import { WATER_PRESETS, DEFAULT_WATER_PRESET } from '@/types/water';
import type { WaterPreset } from '@/types/water';
import { HydrationRing } from './HydrationRing';
import { WaterLogButton } from './WaterLogButton';

export function WaterLogSheet() {
  const todayMl = useWaterStore(s => s.todayMl);
  const goalMl = useWaterStore(s => s.goalMl);
  const goalMet = useWaterStore(s => s.goalMet);
  const addLog = useWaterStore(s => s.addLog);
  const setGoalMet = useWaterStore(s => s.setGoalMet);
  const userId = useUserStore(s => s.user?.uid);

  const handleLog = useCallback((amount: WaterPreset) => {
    const result = logWaterIntake(todayMl, amount, goalMl);

    addLog({
      id: `${Date.now()}-${amount}`,
      amountMl: amount,
      loggedAt: Date.now(),
    });

    if (result.goalMet) {
      setGoalMet(true);
    }

    if (result.milestone === 'full') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (result.milestone === 'half') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (userId) {
      saveWaterEvent(userId, amount, goalMl, result.newTotalMl, result.goalMet)
        .catch((e) => console.error('[WaterLogSheet] Failed to save water event:', e));

      if (result.goalMet && !goalMet) {
        awardHydrationXp(userId)
          .catch((e) => console.error('[WaterLogSheet] Failed to award hydration XP:', e));
      }
    }
  }, [todayMl, goalMl, goalMet, addLog, setGoalMet, userId]);

  return (
    <View style={styles.container}>
      <HydrationRing currentMl={todayMl} goalMl={goalMl} />

      <Text style={styles.title}>Log Water</Text>

      <View style={styles.presets}>
        {WATER_PRESETS.map((amount) => (
          <WaterLogButton
            key={amount}
            amount={amount}
            isDefault={amount === DEFAULT_WATER_PRESET}
            onPress={handleLog}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
  },
  title: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
    color: AppColors.text,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AppSpacing.sm,
  },
});
