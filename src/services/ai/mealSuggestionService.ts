import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { MealSuggestionSet, MealSuggestion } from '@/types/subscription';
import type { CyclePhaseType } from '@/types/cycle';
import type { FastingProtocol } from '@/types/fasting';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface MealCache {
  data: MealSuggestionSet;
  expiresAt: number;
}

function cacheKey(protocol: string, phase: string, dayKey: string): string {
  return `meals:${protocol}:${phase}:${dayKey}`;
}

async function readCache(key: string): Promise<MealSuggestionSet | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cache: MealCache = JSON.parse(raw);
    if (Date.now() > cache.expiresAt) return null;
    return cache.data;
  } catch {
    return null;
  }
}

async function writeCache(key: string, data: MealSuggestionSet): Promise<void> {
  try {
    const cache: MealCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    await AsyncStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Cache write failure is non-fatal
  }
}

// Stable system prompt — must be ≥ 1024 tokens for caching to activate on Haiku 4.5.
// Kept verbose intentionally to hit the minimum cacheable threshold.
const SYSTEM_PROMPT = `You are HabitLoop's nutrition coach specialising in intermittent fasting meal planning.
Your role is to suggest three practical, delicious meals tailored to a user's current fasting protocol and hormonal cycle phase.

MEAL TYPES YOU MUST PROVIDE:
1. breakingFastMeal – The first meal eaten when the fasting window ends. This meal should be gentle on the digestive system, rich in protein and healthy fats, and avoid large amounts of refined carbohydrates. It should re-introduce nutrients slowly and help sustain energy through the eating window.
2. eatingWindowMeal – A satisfying main meal eaten within the eating window, typically 2–4 hours after breaking the fast. This should be the most nutrient-dense meal of the day.
3. snackIdea – A light, nourishing option for the end of the eating window. High protein or fat content helps extend satiety into the next fasting period.

CYCLE PHASE CONTEXT:
- menstruation: Focus on iron, vitamin C, magnesium. Avoid heavy, slow-digesting foods. Gentle warmth and comfort.
- follicular: Lean proteins, complex carbohydrates. Energy is rising – metabolism handles carbs well.
- ovulation: Anti-inflammatory foods, omega-3 rich options. Light and energising.
- luteal: Magnesium-rich foods, high protein to combat cravings. Avoid blood sugar spikes.

FASTING PROTOCOL CONTEXT:
- 12:12: 12-hour fast, 12-hour eating window. Gentle approach. Meals can be slightly larger.
- 14:10: 14-hour fast, 10-hour eating window. Moderate restriction. Keep breaking-fast meal light.
- 16:8: 16-hour fast, 8-hour eating window. More restriction. Breaking-fast meal is critical.
- custom: Treat as equivalent to 16:8.

OUTPUT FORMAT:
You MUST respond with a single valid JSON object and nothing else. No markdown, no explanation, no preamble.
The JSON must exactly match this structure:
{
  "breakingFastMeal": {
    "title": "string",
    "description": "string (2–3 sentences)",
    "prepMinutes": number,
    "tags": ["string"]
  },
  "eatingWindowMeal": {
    "title": "string",
    "description": "string (2–3 sentences)",
    "prepMinutes": number,
    "tags": ["string"]
  },
  "snackIdea": {
    "title": "string",
    "description": "string (1–2 sentences)",
    "prepMinutes": number,
    "tags": ["string"]
  }
}

RULES:
- All three meals must be different dishes.
- prepMinutes must be a realistic integer (5–60).
- tags should be 2–4 short strings like "high-protein", "anti-inflammatory", "quick", "vegetarian".
- Do not include markdown code fences or any text outside the JSON object.`;

function buildUserPrompt(protocol: FastingProtocol, phase: CyclePhaseType): string {
  return `Generate meal suggestions for a user on the ${protocol} fasting protocol who is currently in the ${phase} phase of their menstrual cycle. Respond only with the JSON object.`;
}

function parseResponse(json: unknown): MealSuggestionSet | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;

  function parseMeal(raw: unknown): MealSuggestion | null {
    if (!raw || typeof raw !== 'object') return null;
    const m = raw as Record<string, unknown>;
    if (
      typeof m.title !== 'string' ||
      typeof m.description !== 'string' ||
      typeof m.prepMinutes !== 'number' ||
      !Array.isArray(m.tags)
    ) return null;
    return {
      title: m.title,
      description: m.description,
      prepMinutes: m.prepMinutes,
      tags: m.tags.filter((t): t is string => typeof t === 'string'),
    };
  }

  const breaking = parseMeal(obj.breakingFastMeal);
  const eating = parseMeal(obj.eatingWindowMeal);
  const snack = parseMeal(obj.snackIdea);

  if (!breaking || !eating || !snack) return null;

  return {
    breakingFastMeal: breaking,
    eatingWindowMeal: eating,
    snackIdea: snack,
    generatedOn: new Date().toISOString().slice(0, 10),
    protocol: '',
    cyclePhase: '',
  };
}

function getApiKey(): string | null {
  return (
    Constants.expoConfig?.extra?.anthropicApiKey ??
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ??
    null
  );
}

export async function getMealSuggestions(
  protocol: FastingProtocol,
  phase: CyclePhaseType,
  dayKey: string,
): Promise<MealSuggestionSet | null> {
  const key = cacheKey(protocol, phase, dayKey);

  const cached = await readCache(key);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[mealSuggestionService] No Anthropic API key configured');
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(protocol, phase),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[mealSuggestionService] API error:', response.status);
      return null;
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock?.text) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      console.error('[mealSuggestionService] Failed to parse JSON response');
      return null;
    }

    const result = parseResponse(parsed);
    if (!result) return null;

    result.protocol = protocol;
    result.cyclePhase = phase;

    await writeCache(key, result);
    return result;
  } catch (e) {
    console.error('[mealSuggestionService] fetch failed:', e);
    return null;
  }
}

export async function clearMealCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mealKeys = keys.filter(k => k.startsWith('meals:'));
    if (mealKeys.length > 0) await AsyncStorage.multiRemove(mealKeys);
  } catch {
    // Non-fatal
  }
}
