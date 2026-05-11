import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';

import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { useUserStore } from '@/stores/user/useUserStore';
import { completeOnboarding, loadUserProfile } from '@/services/auth/profileService';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;
  const d = new Date(text + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = text.split('-').map(Number);
  if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return false;
  return d <= new Date();
}

export default function Step4CycleScreen() {
  const gender = useOnboardingStore(s => s.gender);
  const storedDate = useOnboardingStore(s => s.lastPeriodStart);
  const storedNotifications = useOnboardingStore(s => s.notificationsEnabled);
  const setCycleAndNotifications = useOnboardingStore(s => s.setCycleAndNotifications);
  const toOnboardingData = useOnboardingStore(s => s.toOnboardingData);
  const resetOnboarding = useOnboardingStore(s => s.reset);

  const uid = useUserStore(s => s.user?.uid);
  const setProfile = useUserStore(s => s.setProfile);
  const setAuthStatus = useUserStore(s => s.setAuthStatus);

  const [dateText, setDateText] = useState(storedDate ?? '');
  const [notifications, setNotifications] = useState(storedNotifications);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showCycleSection = gender === 'female';
  const dateError = dateText.length > 0 && !isValidDate(dateText);
  const canSubmit = !loading && (!showCycleSection || dateText.length === 0 || isValidDate(dateText));

  async function handleGetStarted() {
    if (!uid) return;

    const lastPeriodStart = showCycleSection && isValidDate(dateText) ? dateText : null;
    setCycleAndNotifications(lastPeriodStart, notifications);

    setLoading(true);
    setError('');

    try {
      const data = {
        ...toOnboardingData(),
        lastPeriodStart,
        notificationsEnabled: notifications,
      };
      await completeOnboarding(uid, data);

      const profile = await loadUserProfile(uid);
      if (profile) {
        setProfile(profile);
      }
      setAuthStatus('authenticated');
      resetOnboarding();
    } catch (e) {
      console.error('[step-4-cycle] completeOnboarding failed:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Almost Done!</Text>
          <Text style={styles.subtitle}>
            {showCycleSection
              ? 'Optional: help us tailor fasting to your cycle'
              : 'One last thing before we get started'}
          </Text>
        </View>

        <View style={styles.form}>
          {showCycleSection && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Last Period Start Date</Text>
              <Text style={styles.sectionHint}>
                This helps adapt fasting recommendations to your cycle phase. You can skip this or add it later in settings.
              </Text>
              <TextInput
                label="YYYY-MM-DD"
                value={dateText}
                onChangeText={setDateText}
                keyboardType="numbers-and-punctuation"
                mode="outlined"
                outlineColor={dateError ? AppColors.danger : AppColors.border}
                activeOutlineColor={dateError ? AppColors.danger : AppColors.primary}
                style={styles.input}
                error={dateError}
              />
              {dateError && (
                <Text style={styles.errorText}>
                  Enter a valid past date (YYYY-MM-DD)
                </Text>
              )}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationText}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Text style={styles.sectionHint}>
                  Get reminders for fasting milestones and hydration
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                color={AppColors.primary}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {error.length > 0 && (
            <Text style={styles.errorBanner}>{error}</Text>
          )}
          <Button
            mode="contained"
            onPress={handleGetStarted}
            disabled={!canSubmit}
            loading={loading}
            buttonColor={AppColors.primary}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Get Started
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
    textAlign: 'center',
  },
  form: {
    gap: AppSpacing.xl,
  },
  section: {
    gap: AppSpacing.sm,
  },
  sectionTitle: {
    fontSize: AppFontSize.md,
    color: AppColors.text,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  input: {
    backgroundColor: AppColors.surface,
  },
  errorText: {
    fontSize: AppFontSize.xs,
    color: AppColors.danger,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationText: {
    flex: 1,
    gap: AppSpacing.xs,
    marginRight: AppSpacing.md,
  },
  footer: {
    gap: AppSpacing.md,
  },
  errorBanner: {
    fontSize: AppFontSize.sm,
    color: AppColors.danger,
    textAlign: 'center',
  },
  button: {
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.xs,
  },
  buttonLabel: {
    fontSize: AppFontSize.md,
  },
});
