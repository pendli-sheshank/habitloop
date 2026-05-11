import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useUserStore } from '@/stores/user/useUserStore';
import { useWaterStore } from '@/stores/water/useWaterStore';
import { calculateWaterGoal } from '@/services/water/hydrationGoal';
import { fetchWeather, getCachedWeather } from '@/services/water/weatherApi';
import { loadUserSettings, updateUserSettings } from '@/services/auth/profileService';
import type { WeatherData } from '@/types/water';

interface HydrationGoalState {
  goalMl: number;
  weather: WeatherData | null;
  isLoading: boolean;
  refreshGoal: () => Promise<void>;
}

async function getLocationCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (e) {
    console.error('[useHydrationGoal] Location unavailable:', e);
    return null;
  }
}

export function useHydrationGoal(): HydrationGoalState {
  const user = useUserStore(s => s.user);
  const goalMl = useWaterStore(s => s.goalMl);
  const setGoalMl = useWaterStore(s => s.setGoalMl);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshGoal = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const settings = await loadUserSettings(user.uid);
      if (!settings) {
        setIsLoading(false);
        return;
      }

      let weatherData: WeatherData | null = null;
      const coords = await getLocationCoords();
      if (coords) {
        try {
          weatherData = await fetchWeather(coords.latitude, coords.longitude);
        } catch (e) {
          console.error('[useHydrationGoal] Weather fetch failed, using cached:', e);
          weatherData = await getCachedWeather();
        }
      } else {
        weatherData = await getCachedWeather();
      }

      setWeather(weatherData);

      const newGoal = calculateWaterGoal({
        weightKg: settings.weightKg,
        activityLevel: settings.activityLevel,
        temperatureC: weatherData?.temperatureC,
        humidityPercent: weatherData?.humidityPercent,
      });

      if (newGoal !== goalMl) {
        setGoalMl(newGoal);
        updateUserSettings(user.uid, { calculatedWaterGoalMl: newGoal })
          .catch((e) => console.error('[useHydrationGoal] Failed to sync goal to Firestore:', e));
      }
    } catch (e) {
      console.error('[useHydrationGoal] Failed to refresh goal:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, goalMl, setGoalMl]);

  useEffect(() => {
    refreshGoal();
  }, [refreshGoal]);

  return { goalMl, weather, isLoading, refreshGoal };
}
