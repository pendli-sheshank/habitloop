/**
 * mealSuggestionService unit tests.
 *
 * - Cache layer: read/write/expiry via AsyncStorage mock
 * - parseResponse: valid and invalid shapes
 * - getMealSuggestions: cache hit, cache miss + successful API call,
 *   missing API key, HTTP error, malformed JSON
 */

import {
  getMealSuggestions,
  clearMealCache,
} from '../mealSuggestionService';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:     jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem:     jest.fn((key: string, val: string) => { mockStorage[key] = val; return Promise.resolve(); }),
  removeItem:  jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
  getAllKeys:   jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiRemove: jest.fn((keys: string[]) => { keys.forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
}));

// expo-constants mock must match the Constants object shape
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },   // no key by default; tests set process.env instead
}));

const VALID_MEAL_SET = {
  breakingFastMeal: { title: 'Eggs & Avocado', description: 'Light and nourishing.', prepMinutes: 10, tags: ['high-protein'] },
  eatingWindowMeal: { title: 'Salmon Bowl',    description: 'Omega-3 rich main.',    prepMinutes: 20, tags: ['anti-inflammatory'] },
  snackIdea:        { title: 'Greek Yogurt',   description: 'Quick protein hit.',    prepMinutes: 2,  tags: ['quick'] },
};

function makeFetchResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  // Use env-var path so the module mock isn't needed for the happy path
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── Cache hit ───────────────────────────────────────────────────────────────

describe('getMealSuggestions — cache hit', () => {
  it('returns cached data without calling fetch', async () => {
    const cachedSet = {
      ...VALID_MEAL_SET,
      generatedOn: '2026-05-13',
      protocol: '16:8',
      cyclePhase: 'follicular',
    };
    mockStorage['meals:16:8:follicular:2026-05-13'] = JSON.stringify({
      data: cachedSet,
      expiresAt: Date.now() + 60_000,
    });

    const result = await getMealSuggestions('16:8', 'follicular', '2026-05-13');
    expect(result).toMatchObject(cachedSet);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores expired cache and calls the API', async () => {
    mockStorage['meals:16:8:follicular:2026-05-13'] = JSON.stringify({
      data: { ...VALID_MEAL_SET, generatedOn: '2026-05-12', protocol: '16:8', cyclePhase: 'follicular' },
      expiresAt: Date.now() - 1,
    });
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    const result = await getMealSuggestions('16:8', 'follicular', '2026-05-13');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
  });
});

// ─── API call ─────────────────────────────────────────────────────────────────

describe('getMealSuggestions — API call', () => {
  it('returns a MealSuggestionSet on success', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    const result = await getMealSuggestions('15:9', 'luteal', '2026-05-13');
    expect(result).not.toBeNull();
    expect(result!.breakingFastMeal.title).toBe('Eggs & Avocado');
    expect(result!.protocol).toBe('15:9');
    expect(result!.cyclePhase).toBe('luteal');
  });

  it('writes the result to cache after a successful fetch', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    await getMealSuggestions('16:8', 'ovulation', '2026-05-13');
    expect(mockStorage['meals:16:8:ovulation:2026-05-13']).toBeDefined();
  });

  it('calls the correct Anthropic endpoint', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    await getMealSuggestions('circadian', 'menstruation', '2026-05-13');
    const url = (fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
  });

  it('includes cache_control on the system block', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    await getMealSuggestions('circadian', 'menstruation', '2026-05-13');
    const init = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('sends the anthropic-version header', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(VALID_MEAL_SET) }],
    }));

    await getMealSuggestions('16:8', 'follicular', '2026-05-13');
    const init = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('returns null when the API responds with an error status', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({}, false, 429));
    expect(await getMealSuggestions('16:8', 'follicular', '2026-05-13')).toBeNull();
  });

  it('returns null when the response JSON has the wrong shape', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify({ wrong: 'shape' }) }],
    }));
    expect(await getMealSuggestions('16:8', 'follicular', '2026-05-13')).toBeNull();
  });

  it('returns null when the response text is not valid JSON', async () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: 'not json at all' }],
    }));
    expect(await getMealSuggestions('16:8', 'follicular', '2026-05-13')).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));
    expect(await getMealSuggestions('16:8', 'follicular', '2026-05-13')).toBeNull();
  });
});

// ─── Missing API key ─────────────────────────────────────────────────────────

describe('getMealSuggestions — no API key', () => {
  it('returns null without calling fetch when no API key is configured', async () => {
    const saved = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    try {
      const result = await getMealSuggestions('16:8', 'follicular', '2026-05-13');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = saved;
    }
  });
});

// ─── clearMealCache ───────────────────────────────────────────────────────────

describe('clearMealCache', () => {
  it('removes all meals: keys from storage', async () => {
    mockStorage['meals:16:8:follicular:2026-05-13'] = 'x';
    mockStorage['meals:14:10:luteal:2026-05-12']    = 'y';
    mockStorage['other-key']                         = 'z';

    await clearMealCache();

    expect(mockStorage['meals:16:8:follicular:2026-05-13']).toBeUndefined();
    expect(mockStorage['meals:14:10:luteal:2026-05-12']).toBeUndefined();
    expect(mockStorage['other-key']).toBe('z');
  });

  it('is a no-op when there are no meal keys', async () => {
    mockStorage['other-key'] = 'z';
    await expect(clearMealCache()).resolves.not.toThrow();
    expect(mockStorage['other-key']).toBe('z');
  });
});

// ─── parseResponse edge cases ─────────────────────────────────────────────────

describe('getMealSuggestions — parseResponse edge cases', () => {
  it('returns null when a meal is missing prepMinutes', async () => {
    const bad = {
      ...VALID_MEAL_SET,
      breakingFastMeal: { title: 'X', description: 'Y', tags: [] },  // no prepMinutes
    };
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(bad) }],
    }));
    expect(await getMealSuggestions('16:8', 'follicular', '2026-05-13')).toBeNull();
  });

  it('filters non-string entries from the tags array', async () => {
    const withMixedTags = {
      ...VALID_MEAL_SET,
      snackIdea: { title: 'X', description: 'Y', prepMinutes: 5, tags: ['good', 42, null, 'also-good'] },
    };
    (global.fetch as jest.Mock).mockReturnValueOnce(makeFetchResponse({
      content: [{ type: 'text', text: JSON.stringify(withMixedTags) }],
    }));
    const result = await getMealSuggestions('16:8', 'follicular', '2026-05-13');
    expect(result).not.toBeNull();
    expect(result!.snackIdea.tags).toEqual(['good', 'also-good']);
  });
});
