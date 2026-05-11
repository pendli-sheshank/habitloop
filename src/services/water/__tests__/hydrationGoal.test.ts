import { calculateWaterGoal } from '../hydrationGoal';

describe('calculateWaterGoal', () => {
  it('calculates base goal from weight only (low activity)', () => {
    // 70kg × 33 = 2310 → rounded to 2300
    expect(calculateWaterGoal({ weightKg: 70, activityLevel: 'low' })).toBe(2300);
  });

  it('adds 300ml for moderate activity', () => {
    // 70 × 33 = 2310 + 300 = 2610 → 2600
    expect(calculateWaterGoal({ weightKg: 70, activityLevel: 'moderate' })).toBe(2600);
  });

  it('adds 600ml for high activity', () => {
    // 70 × 33 = 2310 + 600 = 2910 → 2900
    expect(calculateWaterGoal({ weightKg: 70, activityLevel: 'high' })).toBe(2900);
  });

  it('adds 200ml heat bonus for temperature > 25C', () => {
    // 60 × 33 = 1980 + 0 + 200 = 2180 → 2200
    expect(calculateWaterGoal({ weightKg: 60, activityLevel: 'low', temperatureC: 27 })).toBe(2200);
  });

  it('adds 400ml heat bonus for temperature > 30C', () => {
    // 60 × 33 = 1980 + 0 + 400 = 2380 → 2400
    expect(calculateWaterGoal({ weightKg: 60, activityLevel: 'low', temperatureC: 35 })).toBe(2400);
  });

  it('adds no heat bonus for temperature <= 25C', () => {
    // 60 × 33 = 1980 → 2000
    expect(calculateWaterGoal({ weightKg: 60, activityLevel: 'low', temperatureC: 20 })).toBe(2000);
  });

  it('adds 200ml dry air bonus for humidity < 40%', () => {
    // 60 × 33 = 1980 + 0 + 200 = 2180 → 2200
    expect(calculateWaterGoal({ weightKg: 60, activityLevel: 'low', humidityPercent: 30 })).toBe(2200);
  });

  it('adds no dry air bonus for humidity >= 40%', () => {
    // 60 × 33 = 1980 → 2000
    expect(calculateWaterGoal({ weightKg: 60, activityLevel: 'low', humidityPercent: 50 })).toBe(2000);
  });

  it('stacks all bonuses correctly', () => {
    // 80 × 33 = 2640 + 600 (high) + 400 (>30C) + 200 (dry) = 3840 → 3850
    expect(calculateWaterGoal({
      weightKg: 80,
      activityLevel: 'high',
      temperatureC: 35,
      humidityPercent: 25,
    })).toBe(3850);
  });

  it('rounds to nearest 50ml', () => {
    // 55 × 33 = 1815 → 1800
    expect(calculateWaterGoal({ weightKg: 55, activityLevel: 'low' })).toBe(1800);
    // 75 × 33 = 2475 → 2500
    expect(calculateWaterGoal({ weightKg: 75, activityLevel: 'low' })).toBe(2500);
  });

  it('handles small weight', () => {
    // 45 × 33 = 1485 + 300 = 1785 → 1800
    expect(calculateWaterGoal({ weightKg: 45, activityLevel: 'moderate' })).toBe(1800);
  });

  it('ignores weather when not provided', () => {
    const withoutWeather = calculateWaterGoal({ weightKg: 70, activityLevel: 'low' });
    const withMildWeather = calculateWaterGoal({ weightKg: 70, activityLevel: 'low', temperatureC: 20, humidityPercent: 60 });
    expect(withoutWeather).toBe(withMildWeather);
  });
});
