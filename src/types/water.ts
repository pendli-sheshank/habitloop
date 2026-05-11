export interface WaterLogEntry {
  id: string;
  amountMl: number;
  loggedAt: number; // Unix ms
}

export interface WaterEvent {
  userId: string;
  date: string; // 'YYYY-MM-DD'
  ml: number;
  loggedAt: number; // Unix ms
}

export type WaterPreset = 150 | 250 | 350 | 500;

export const WATER_PRESETS: readonly WaterPreset[] = [150, 250, 350, 500] as const;

export const DEFAULT_WATER_PRESET: WaterPreset = 250;

export type WaterMilestone = 'half' | 'full';

export interface WaterIntakeResult {
  newTotalMl: number;
  goalMet: boolean;
  milestone: WaterMilestone | null;
}

export interface HydrationGoalParams {
  weightKg: number;
  activityLevel: 'low' | 'moderate' | 'high';
  temperatureC?: number;
  humidityPercent?: number;
}

export interface WeatherData {
  temperatureC: number;
  humidityPercent: number;
  fetchedAt: number; // Unix ms
}

export interface WeatherCache {
  data: WeatherData;
  expiresAt: number; // Unix ms
}

export interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
  };
}
