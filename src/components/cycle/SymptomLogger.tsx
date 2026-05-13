import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { SYMPTOM_LABELS, SYMPTOM_EMOJIS } from '@/constants/phases';
import type { SymptomEntry, SymptomScale } from '@/types/cycle';

type SymptomKey = keyof SymptomEntry;
const SYMPTOM_KEYS: SymptomKey[] = ['cramps', 'bloating', 'mood', 'energy', 'cravings'];
const SCALES: SymptomScale[] = [1, 2, 3, 4, 5];

interface Props {
  initialSymptoms?: SymptomEntry | null;
  alreadyLoggedToday?: boolean;
  onSave: (symptoms: SymptomEntry) => Promise<void>;
}

const EMPTY: SymptomEntry = {
  cramps:   null,
  bloating: null,
  mood:     null,
  energy:   null,
  cravings: null,
};

export function SymptomLogger({ initialSymptoms, alreadyLoggedToday, onSave }: Props) {
  const [symptoms, setSymptoms] = useState<SymptomEntry>(initialSymptoms ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(alreadyLoggedToday ?? false);

  function pick(key: SymptomKey, value: SymptomScale) {
    setSymptoms(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(symptoms);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const hasAnySelection = SYMPTOM_KEYS.some(k => symptoms[k] !== null);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How are you feeling today?</Text>

      {SYMPTOM_KEYS.map(key => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{SYMPTOM_LABELS[key]}</Text>
          <View style={styles.emojiRow}>
            {SCALES.map(scale => {
              const isSelected = symptoms[key] === scale;
              return (
                <TouchableOpacity
                  key={scale}
                  onPress={() => pick(key, scale)}
                  style={[styles.emojiBtn, isSelected && styles.emojiBtnSelected]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiChar}>{SYMPTOM_EMOJIS[scale]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.saveBtn,
          (!hasAnySelection || saving) && styles.saveBtnDisabled,
          saved && styles.saveBtnSaved,
        ]}
        onPress={handleSave}
        disabled={!hasAnySelection || saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color={AppColors.surface} />
        ) : (
          <Text style={styles.saveBtnText}>
            {saved ? '✓ Saved' : 'Save symptoms'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  heading: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  row: {
    gap: AppSpacing.xs,
  },
  label: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: AppSpacing.xs,
  },
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiBtnSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  emojiChar: {
    fontSize: 22,
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginTop: AppSpacing.xs,
  },
  saveBtnDisabled: {
    backgroundColor: AppColors.border,
  },
  saveBtnSaved: {
    backgroundColor: AppColors.accent,
  },
  saveBtnText: {
    color: AppColors.surface,
    fontSize: AppFontSize.md,
    fontWeight: '700',
  },
});
