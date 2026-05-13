import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

interface Props {
  groupStreakCount: number;
  alreadyCheckedIn: boolean;
  isChallengeActive: boolean;
  onCheckIn: () => Promise<void>;
}

export function CheckInButton({
  groupStreakCount,
  alreadyCheckedIn,
  isChallengeActive,
  onCheckIn,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (alreadyCheckedIn || loading || !isChallengeActive) return;
    setLoading(true);
    try {
      await onCheckIn();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
    }
  }

  if (!isChallengeActive) {
    return (
      <View style={[styles.button, styles.buttonInactive]}>
        <MaterialCommunityIcons name="calendar-remove" size={22} color={AppColors.gray} />
        <Text style={styles.inactiveText}>No active challenge</Text>
      </View>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <View style={[styles.button, styles.buttonDone]}>
        <MaterialCommunityIcons name="check-circle" size={22} color={AppColors.surface} />
        <View>
          <Text style={styles.doneText}>Checked in today!</Text>
          {groupStreakCount > 0 && (
            <Text style={styles.streakSubText}>
              🔥 {groupStreakCount} day group streak
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.buttonReady]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={AppColors.surface} />
      ) : (
        <>
          <MaterialCommunityIcons name="check-bold" size={22} color={AppColors.surface} />
          <View>
            <Text style={styles.readyText}>Check in for today</Text>
            {groupStreakCount > 0 && (
              <Text style={styles.streakSubText}>
                Keep the 🔥 {groupStreakCount} day streak alive
              </Text>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
  },
  buttonReady: {
    backgroundColor: AppColors.primary,
  },
  buttonDone: {
    backgroundColor: AppColors.accent,
  },
  buttonInactive: {
    backgroundColor: AppColors.surfaceAlt,
  },
  readyText: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.surface,
  },
  doneText: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.surface,
  },
  inactiveText: {
    fontSize: AppFontSize.md,
    color: AppColors.gray,
  },
  streakSubText: {
    fontSize: AppFontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
