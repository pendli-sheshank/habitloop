import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, AppSpacing } from '@/constants/theme';

const STEPS = [
  'step-1-name',
  'step-2-body',
  'step-3-protocol',
  'step-4-cycle',
] as const;

function ProgressBar() {
  const pathname = usePathname();
  const currentFile = pathname.split('/').pop() ?? '';
  const currentIndex = STEPS.findIndex(s => s === currentFile);
  const step = currentIndex >= 0 ? currentIndex + 1 : 1;

  return (
    <View style={styles.progressContainer}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < step ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingLayout() {
  return (
    <SafeAreaView style={styles.safe}>
      <ProgressBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.surface,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.md,
  },
  dot: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  dotFilled: {
    backgroundColor: AppColors.primary,
  },
  dotEmpty: {
    backgroundColor: AppColors.border,
  },
});
