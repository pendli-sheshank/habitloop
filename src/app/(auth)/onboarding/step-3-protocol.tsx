import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

export default function Step3ProtocolScreen() {
  const router = useRouter();
  const selectedProtocol = useOnboardingStore(s => s.defaultProtocol);
  const setProtocol = useOnboardingStore(s => s.setProtocol);

  function handleContinue() {
    router.push('/(auth)/onboarding/step-4-cycle');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fasting Protocol</Text>
        <Text style={styles.subtitle}>
          Choose your default schedule — you can change it anytime
        </Text>
      </View>

      <View style={styles.cards}>
        {PROTOCOL_OPTIONS.map(opt => {
          const selected = selectedProtocol === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setProtocol(opt.value)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={[styles.cardHours, selected && styles.cardHoursSelected]}>
                  {opt.fastHours}h fast · {opt.eatHours}h eating
                </Text>
              </View>
              <Text style={[styles.cardDesc, selected && styles.cardDescSelected]}>
                {opt.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleContinue}
          buttonColor={AppColors.primary}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cards: {
    gap: AppSpacing.md,
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: AppFontSize.xl,
    fontWeight: '700',
    color: AppColors.text,
  },
  cardLabelSelected: {
    color: AppColors.primary,
  },
  cardHours: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  cardHoursSelected: {
    color: AppColors.primary,
  },
  cardDesc: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginTop: AppSpacing.sm,
  },
  cardDescSelected: {
    color: AppColors.primary,
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
