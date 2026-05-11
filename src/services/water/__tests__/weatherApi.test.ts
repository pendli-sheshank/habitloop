import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWeather, getCachedWeather } from '../weatherApi';
import type { WeatherCache } from '@/types/water';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

const VALID_RESPONSE = {
  current: {
    temperature_2m: 28.5,
    relative_humidity_2m: 35,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('getCachedWeather', () => {
  it('returns null when cache is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });

  it('returns null when cache is expired', async () => {
    const expired: WeatherCache = {
      data: { temperatureC: 25, humidityPercent: 50, fetchedAt: Date.now() - 5 * 60 * 60 * 1000 },
      expiresAt: Date.now() - 1000,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(expired));
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });

  it('returns cached data when still valid', async () => {
    const valid: WeatherCache = {
      data: { temperatureC: 30, humidityPercent: 45, fetchedAt: Date.now() },
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(valid));
    const result = await getCachedWeather();
    expect(result).toEqual(valid.data);
  });

  it('returns null on parse error', async () => {
    mockGetItem.mockResolvedValue('not-json');
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });
});

describe('fetchWeather', () => {
  it('returns cached data without calling fetch when cache is valid', async () => {
    const valid: WeatherCache = {
      data: { temperatureC: 22, humidityPercent: 60, fetchedAt: Date.now() },
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(valid));

    const result = await fetchWeather(40.7, -74.0);

    expect(result).toEqual(valid.data);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches from API when cache is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_RESPONSE),
    });

    const result = await fetchWeather(40.7, -74.0);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.temperatureC).toBe(28.5);
    expect(result.humidityPercent).toBe(35);
    expect(result.fetchedAt).toBeGreaterThan(0);
  });

  it('caches the fetched result', async () => {
    mockGetItem.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_RESPONSE),
    });

    await fetchWeather(40.7, -74.0);

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe('weather-cache');
    const parsed: WeatherCache = JSON.parse(value);
    expect(parsed.data.temperatureC).toBe(28.5);
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
  });

  it('builds correct API URL with coordinates', async () => {
    mockGetItem.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_RESPONSE),
    });

    await fetchWeather(51.5, -0.12);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('latitude=51.5');
    expect(calledUrl).toContain('longitude=-0.12');
    expect(calledUrl).toContain('current=temperature_2m,relative_humidity_2m');
  });

  it('throws on non-ok response', async () => {
    mockGetItem.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchWeather(40.7, -74.0)).rejects.toThrow('Open-Meteo request failed: 500');
  });
});
