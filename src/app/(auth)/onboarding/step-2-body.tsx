import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

type ActivityLevel = 'low' | 'moderate' | 'high';

const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Mostly sitting, light walks' },
  { value: 'moderate', label: 'Moderate', description: '3-5 workouts per week' },
  { value: 'high', label: 'High', description: 'Daily intense exercise' },
] as const;

function calculateWaterGoalPreview(weightKg: number, activityLevel: ActivityLevel): number {
  const base = weightKg * 33;
  const activityBonus = activityLevel === 'high' ? 600 : activityLevel === 'moderate' ? 300 : 0;
  return Math.round((base + activityBonus) / 50) * 50;
}

export default function Step2BodyScreen() {
  const router = useRouter();
  const storedWeight = useOnboardingStore(s => s.weightKg);
  const storedActivity = useOnboardingStore(s => s.activityLevel);
  const setBodyStats = useOnboardingStore(s => s.setBodyStats);

  const [weightText, setWeightText] = useState(storedWeight > 0 ? String(storedWeight) : '');
  const [activity, setActivity] = useState<ActivityLevel>(storedActivity);

  const weightKg = parseFloat(weightText) || 0;
  const canContinue = weightKg > 0 && weightKg <= 500;
  const waterGoal = weightKg > 0 ? calculateWaterGoalPreview(weightKg, activity) : 0;

  function handleContinue() {
    setBodyStats(weightKg, activity);
    router.push('/(auth)/onboarding/step-3-protocol');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Body Stats</Text>
          <Text style={styles.subtitle}>Helps us personalize your hydration goal</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Weight (kg)"
            value={weightText}
            onChangeText={setWeightText}
            keyboardType="decimal-pad"
            mode="outlined"
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.primary}
            style={styles.input}
          />

          <View style={styles.activitySection}>
            <Text style={styles.activityLabel}>Activity Level</Text>
            {ACTIVITY_OPTIONS.map(opt => {
              const selected = activity === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setActivity(opt.value)}
                  style={[styles.card, selected && styles.cardSelected]}
                >
                  <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.cardDesc, selected && styles.cardDescSelected]}>
                    {opt.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {waterGoal > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Your daily water goal</Text>
              <Text style={styles.previewValue}>~{waterGoal.toLocaleString()} ml</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={!canContinue}
            buttonColor={AppColors.primary}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Continue
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: AppSpacing.lg,
    justifyContent: 'space-between',
    paddingBottom: AppSpacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: AppSpacing.xs,
    paddingTop: AppSpacing.xxl,
  },
  title: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
  form: {
    gap: AppSpacing.lg,
  },
  input: {
    backgroundColor: AppColors.surface,
  },
  activitySection: {
    gap: AppSpacing.sm,
  },
  activityLabel: {
    fontSize: AppFontSize.md,
    color: AppColors.text,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.md,
  },
  cardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  cardTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.text,
  },
  cardTitleSelected: {
    color: AppColors.primary,
  },
  cardDesc: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
  cardDescSelected: {
    color: AppColors.primary,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
  },
  previewLabel: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  previewValue: {
    fontSize: AppFontSize.xl,
    fontWeight: '700',
    color: AppColors.primary,
    marginTop: AppSpacing.xs,
  },
  footer: {
    gap: AppSpacing.md,
  },
  button: {
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.xs,
  },
  buttonLabel: {
    fontSize: AppFontSize.md,
  },
});
