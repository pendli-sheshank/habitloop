import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Button, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useUserStore } from '@/stores/user/useUserStore';
import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { Gender } from '@/types/auth';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
] as const;

export default function Step1NameScreen() {
  const router = useRouter();
  const googleName = useUserStore(s => s.user?.displayName);
  const storedName = useOnboardingStore(s => s.displayName);
  const storedGender = useOnboardingStore(s => s.gender);
  const setDisplayName = useOnboardingStore(s => s.setDisplayName);
  const setGender = useOnboardingStore(s => s.setGender);

  const [name, setName] = useState(storedName || googleName || '');
  const [gender, setLocalGender] = useState<Gender>(storedGender);

  useEffect(() => {
    if (!storedName && googleName) {
      setName(googleName);
    }
  }, [googleName, storedName]);

  const canContinue = name.trim().length > 0;

  function handleContinue() {
    setDisplayName(name.trim());
    setGender(gender);
    router.push('/(auth)/onboarding/step-2-body');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome to</Text>
          <Text style={styles.logo}>HabitLoop</Text>
          <Text style={styles.subtitle}>What should we call you?</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Display Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            mode="outlined"
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.primary}
            style={styles.input}
          />

          <View style={styles.genderSection}>
            <Text style={styles.genderLabel}>Gender</Text>
            <SegmentedButtons
              value={gender}
              onValueChange={(v) => setLocalGender(v as Gender)}
              buttons={GENDER_OPTIONS.map(opt => ({
                value: opt.value,
                label: opt.label,
                checkedColor: AppColors.primary,
              }))}
              style={styles.segmented}
            />
          </View>
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
  welcome: {
    fontSize: AppFontSize.lg,
    color: AppColors.textMuted,
  },
  logo: {
    fontSize: AppFontSize.display,
    fontWeight: '700',
    color: AppColors.primary,
  },
  subtitle: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    marginTop: AppSpacing.sm,
  },
  form: {
    gap: AppSpacing.lg,
  },
  input: {
    backgroundColor: AppColors.surface,
  },
  genderSection: {
    gap: AppSpacing.sm,
  },
  genderLabel: {
    fontSize: AppFontSize.md,
    color: AppColors.text,
    fontWeight: '600',
  },
  segmented: {
    borderRadius: AppRadius.md,
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
