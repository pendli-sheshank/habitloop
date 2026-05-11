import type { HydrationGoalParams } from '@/types/water';

const ACTIVITY_BONUS: Record<HydrationGoalParams['activityLevel'], number> = {
  low: 0,
  moderate: 300,
  high: 600,
};

function roundToNearest50(ml: number): number {
  return Math.round(ml / 50) * 50;
}

export function calculateWaterGoal(params: HydrationGoalParams): number {
  const { weightKg, activityLevel, temperatureC, humidityPercent } = params;

  let goal = weightKg * 33;
  goal += ACTIVITY_BONUS[activityLevel];

  if (temperatureC !== undefined) {
    if (temperatureC > 30) goal += 400;
    else if (temperatureC > 25) goal += 200;
  }

  if (humidityPercent !== undefined && humidityPercent < 40) {
    goal += 200;
  }

  return roundToNearest50(goal);
}
