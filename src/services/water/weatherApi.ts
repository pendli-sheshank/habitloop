import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeatherData, WeatherCache, OpenMeteoResponse } from '@/types/water';

const CACHE_KEY = 'weather-cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function getCachedWeather(): Promise<WeatherData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache: WeatherCache = JSON.parse(raw);
    if (Date.now() > cache.expiresAt) return null;

    return cache.data;
  } catch (e) {
    console.error('[weatherApi] Failed to read cache:', e);
    return null;
  }
}

async function saveWeatherCache(data: WeatherData): Promise<void> {
  const cache: WeatherCache = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('[weatherApi] Failed to write cache:', e);
  }
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const cached = await getCachedWeather();
  if (cached) return cached;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&forecast_days=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const json: OpenMeteoResponse = await response.json();

  const data: WeatherData = {
    temperatureC: json.current.temperature_2m,
    humidityPercent: json.current.relative_humidity_2m,
    fetchedAt: Date.now(),
  };

  await saveWeatherCache(data);
  return data;
}
