import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import type { WeatherData } from '@/types/water';

interface Props {
  goalMl: number;
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

function getWeatherLabel(weather: WeatherData): string {
  const parts: string[] = [];

  if (weather.temperatureC > 30) parts.push('hot weather (+400 ml)');
  else if (weather.temperatureC > 25) parts.push('warm weather (+200 ml)');

  if (weather.humidityPercent < 40) parts.push('dry air (+200 ml)');

  if (parts.length === 0) return 'No weather adjustment needed today.';
  return `Adjusted for ${parts.join(' and ')}.`;
}

export function WeatherGoalBanner({ goalMl, weather, isLoading, onRefresh }: Props) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={AppColors.primaryMid} />
        <Text style={styles.loadingText}>Checking weather...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MaterialCommunityIcons
          name={weather ? 'weather-partly-cloudy' : 'cup-water'}
          size={20}
          color={AppColors.primary}
        />
        <Text style={styles.goalText}>Daily goal: {goalMl} ml</Text>
      </View>
      <Text style={styles.detail}>
        {weather
          ? `${Math.round(weather.temperatureC)}°C, ${Math.round(weather.humidityPercent)}% humidity. ${getWeatherLabel(weather)}`
          : 'Weather unavailable — goal based on weight and activity.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  goalText: {
    fontSize: AppFontSize.md,
    fontWeight: '600',
    color: AppColors.dark,
  },
  detail: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    marginLeft: 28,
  },
  loadingText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
  },
});
