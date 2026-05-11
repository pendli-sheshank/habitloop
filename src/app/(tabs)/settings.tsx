import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { useUserStore } from '@/stores/user/useUserStore';
import { useFastingStore } from '@/stores/fasting/useFastingStore';
import { useWaterStore } from '@/stores/water/useWaterStore';
import { signOutUser } from '@/services/auth/authService';
import { loadUserSettings, updateUserSettings } from '@/services/auth/profileService';
import { calculateWaterGoal } from '@/services/water/hydrationGoal';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import type { UserSettings } from '@/types/auth';
import type { FastingProtocol } from '@/types/fasting';

type ActivityLevel = 'low' | 'moderate' | 'high';
const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const user = useUserStore(s => s.user);
  const profile = useUserStore(s => s.profile);
  const clearAuth = useUserStore(s => s.clearAuth);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [weightKg, setWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [defaultProtocol, setDefaultProtocol] = useState<FastingProtocol>('16:8');
  const [fastingReminders, setFastingReminders] = useState(true);
  const [hydrationReminders, setHydrationReminders] = useState(true);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;

    async function fetchSettings() {
      try {
        const data = await loadUserSettings(user!.uid);
        if (data) {
          setSettings(data);
          setWeightKg(String(data.weightKg));
          setActivityLevel(data.activityLevel);
          setDefaultProtocol(data.defaultProtocol === 'custom' ? '16:8' : data.defaultProtocol);
          setFastingReminders(data.notifications.fastingReminders);
          setHydrationReminders(data.notifications.hydrationReminders);
        }
      } catch (e) {
        console.error('[SettingsScreen] Failed to load settings:', e);
      }
    }

    fetchSettings();
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const parsedWeight = parseFloat(weightKg) || 0;
      const newGoal = calculateWaterGoal({
        weightKg: parsedWeight,
        activityLevel,
      });

      await updateUserSettings(user.uid, {
        weightKg: parsedWeight,
        activityLevel,
        defaultProtocol,
        calculatedWaterGoalMl: newGoal,
        notifications: {
          fastingReminders,
          hydrationReminders,
          socialNudges: settings?.notifications.socialNudges ?? true,
        },
      });

      // Update local stores
      useFastingStore.getState().setSelectedProtocol(defaultProtocol);
      useWaterStore.getState().setGoalMl(newGoal);

      Alert.alert('Saved', 'Your settings have been updated.');
    } catch (e) {
      console.error('[SettingsScreen] Save failed:', e);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user, weightKg, activityLevel, defaultProtocol, fastingReminders, hydrationReminders, settings]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            await signOutUser();
            clearAuth();
          } catch (e) {
            console.error('[SettingsScreen] Sign out failed:', e);
          }
        },
      },
    ]);
  }, [clearAuth]);

  const cycleActivity = useCallback(() => {
    const order: ActivityLevel[] = ['low', 'moderate', 'high'];
    const idx = order.indexOf(activityLevel);
    setActivityLevel(order[(idx + 1) % order.length]);
  }, [activityLevel]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Settings</Text>

        {/* Profile Section */}
        <SectionHeader title="Profile" />
        <View style={styles.card}>
          <SettingRow label="Display Name">
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              style={styles.textInput}
              outlineColor={AppColors.border}
              activeOutlineColor={AppColors.primary}
              dense
            />
          </SettingRow>
          <Divider style={styles.divider} />
          <SettingRow label="Email">
            <Text style={styles.settingValue}>{user?.email ?? '—'}</Text>
          </SettingRow>
        </View>

        {/* Body Stats Section */}
        <SectionHeader title="Body Stats" />
        <View style={styles.card}>
          <SettingRow label="Weight (kg)">
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.textInput, styles.narrowInput]}
              outlineColor={AppColors.border}
              activeOutlineColor={AppColors.primary}
              dense
            />
          </SettingRow>
          <Divider style={styles.divider} />
          <SettingRow label="Activity Level">
            <Button
              mode="outlined"
              compact
              textColor={AppColors.primary}
              style={styles.cycleButton}
              onPress={cycleActivity}
            >
              {ACTIVITY_LABELS[activityLevel]}
            </Button>
          </SettingRow>
        </View>

        {/* Fasting Section */}
        <SectionHeader title="Fasting" />
        <View style={styles.card}>
          <Text style={styles.settingLabel}>Default Protocol</Text>
          <View style={styles.protocolRow}>
            {PROTOCOL_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                mode={defaultProtocol === opt.value ? 'contained' : 'outlined'}
                buttonColor={defaultProtocol === opt.value ? AppColors.primary : undefined}
                textColor={defaultProtocol === opt.value ? AppColors.surface : AppColors.primary}
                compact
                style={styles.protocolButton}
                onPress={() => setDefaultProtocol(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow label="Fasting Reminders">
            <Switch
              value={fastingReminders}
              onValueChange={setFastingReminders}
              color={AppColors.primary}
            />
          </SettingRow>
          <Divider style={styles.divider} />
          <SettingRow label="Hydration Reminders">
            <Switch
              value={hydrationReminders}
              onValueChange={setHydrationReminders}
              color={AppColors.primary}
            />
          </SettingRow>
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          buttonColor={AppColors.primary}
          textColor={AppColors.surface}
          style={styles.saveButton}
          labelStyle={styles.saveLabel}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
        >
          Save Changes
        </Button>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <Button
            mode="outlined"
            textColor={AppColors.gray}
            style={styles.accountButton}
            onPress={handleSignOut}
          >
            Sign Out
          </Button>
          <Divider style={styles.divider} />
          <Button
            mode="outlined"
            textColor={AppColors.danger}
            style={[styles.accountButton, styles.dangerButton]}
            onPress={() => setDeleteDialogVisible(true)}
          >
            Delete Account
          </Button>
        </View>

        <Text style={styles.version}>HabitLoop v1.0.0</Text>
      </ScrollView>

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
      />
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
    gap: AppSpacing.md,
    paddingBottom: AppSpacing.xxl,
  },
  heading: {
    fontSize: AppFontSize.xxl,
    fontWeight: '700',
    color: AppColors.dark,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: AppFontSize.sm,
    fontWeight: '600',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: AppSpacing.sm,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  settingLabel: {
    fontSize: AppFontSize.md,
    color: AppColors.text,
  },
  settingValue: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
  },
  textInput: {
    flex: 1,
    maxWidth: 200,
    backgroundColor: AppColors.surface,
  },
  narrowInput: {
    maxWidth: 100,
  },
  divider: {
    backgroundColor: AppColors.border,
  },
  cycleButton: {
    borderColor: AppColors.primaryMid,
    borderRadius: AppRadius.sm,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.xs,
  },
  protocolButton: {
    flex: 1,
    borderColor: AppColors.primaryMid,
    borderRadius: AppRadius.sm,
  },
  saveButton: {
    borderRadius: 999,
    paddingVertical: AppSpacing.xs,
  },
  saveLabel: {
    fontSize: AppFontSize.lg,
    fontWeight: '600',
  },
  accountButton: {
    borderColor: AppColors.border,
    borderRadius: AppRadius.sm,
  },
  dangerButton: {
    borderColor: AppColors.danger,
  },
  version: {
    fontSize: AppFontSize.xs,
    color: AppColors.gray,
    textAlign: 'center',
    marginTop: AppSpacing.md,
  },
});
