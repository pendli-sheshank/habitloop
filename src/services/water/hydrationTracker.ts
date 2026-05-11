import type { WaterIntakeResult, WaterMilestone } from '@/types/water';

function detectMilestone(
  previousMl: number,
  newTotalMl: number,
  goalMl: number,
): WaterMilestone | null {
  const halfGoal = goalMl * 0.5;

  if (previousMl < goalMl && newTotalMl >= goalMl) return 'full';
  if (previousMl < halfGoal && newTotalMl >= halfGoal) return 'half';
  return null;
}

export function logWaterIntake(
  currentTotalMl: number,
  amountMl: number,
  goalMl: number,
): WaterIntakeResult {
  const newTotalMl = currentTotalMl + amountMl;
  const goalMet = newTotalMl >= goalMl;
  const milestone = detectMilestone(currentTotalMl, newTotalMl, goalMl);

  return { newTotalMl, goalMet, milestone };
}
