import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { MealSuggestionSet } from '@/types/subscription';

interface Props {
  meals: MealSuggestionSet | null;
  loading: boolean;
  onRetry?: () => void;
}

const MEAL_META = {
  breakingFastMeal: { label: 'Break Fast', icon: 'weather-sunset-up' as const, color: '#F59E0B' },
  eatingWindowMeal: { label: 'Main Meal',  icon: 'food'               as const, color: AppColors.accent },
  snackIdea:        { label: 'Snack',       icon: 'food-apple-outline' as const, color: AppColors.primary },
} as const;

type MealKey = keyof typeof MEAL_META;

export function MealSuggestionCard({ meals, loading, onRetry }: Props) {
  if (loading) {
    return (
      <View style={[styles.card, styles.centerContent]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <Text style={styles.loadingText}>Generating meal ideas…</Text>
      </View>
    );
  }

  if (!meals) {
    return (
      <View style={[styles.card, styles.centerContent]}>
        <MaterialCommunityIcons name="food-off" size={40} color={AppColors.gray} />
        <Text style={styles.emptyText}>Could not load meal suggestions</Text>
        {onRetry && (
          <Text style={styles.retryText} onPress={onRetry}>Tap to retry</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Meals</Text>
        <Text style={styles.phaseTag}>{meals.cyclePhase} · {meals.protocol}</Text>
      </View>

      {(Object.keys(MEAL_META) as MealKey[]).map((key) => {
        const meta = MEAL_META[key];
        const meal = meals[key];
        return (
          <View key={key} style={styles.mealRow}>
            <View style={[styles.iconWrap, { backgroundColor: meta.color + '1A' }]}>
              <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
            </View>
            <View style={styles.mealContent}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealLabel}>{meta.label}</Text>
                <View style={styles.prepRow}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={AppColors.gray} />
                  <Text style={styles.prepText}>{meal.prepMinutes} min</Text>
                </View>
              </View>
              <Text style={styles.mealTitle}>{meal.title}</Text>
              <Text style={styles.mealDesc} numberOfLines={3}>{meal.description}</Text>
              {meal.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {meal.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: AppSpacing.lg,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    gap: AppSpacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  phaseTag: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textTransform: 'capitalize',
  },
  mealRow: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mealContent: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealLabel: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prepText: {
    fontSize: AppFontSize.xs,
    color: AppColors.gray,
  },
  mealTitle: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.dark,
  },
  mealDesc: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
    marginTop: AppSpacing.xs,
  },
  tag: {
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: AppFontSize.xs,
    color: AppColors.gray,
  },
  loadingText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
  emptyText: {
    fontSize: AppFontSize.md,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  retryText: {
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    fontWeight: '600',
  },
});
