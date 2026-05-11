import { logWaterIntake } from '../hydrationTracker';

describe('logWaterIntake', () => {
  const GOAL = 2000;

  it('adds amount to current total', () => {
    const result = logWaterIntake(500, 250, GOAL);
    expect(result.newTotalMl).toBe(750);
  });

  it('returns goalMet false when below goal', () => {
    const result = logWaterIntake(500, 250, GOAL);
    expect(result.goalMet).toBe(false);
  });

  it('returns goalMet true when reaching goal exactly', () => {
    const result = logWaterIntake(1750, 250, GOAL);
    expect(result.goalMet).toBe(true);
  });

  it('returns goalMet true when exceeding goal', () => {
    const result = logWaterIntake(1900, 250, GOAL);
    expect(result.goalMet).toBe(true);
  });

  it('detects half milestone when crossing 50%', () => {
    const result = logWaterIntake(900, 250, GOAL);
    expect(result.milestone).toBe('half');
  });

  it('returns null milestone when already past 50%', () => {
    const result = logWaterIntake(1100, 250, GOAL);
    expect(result.milestone).toBeNull();
  });

  it('detects full milestone when crossing 100%', () => {
    const result = logWaterIntake(1800, 250, GOAL);
    expect(result.milestone).toBe('full');
  });

  it('returns null milestone when already past 100%', () => {
    const result = logWaterIntake(2100, 250, GOAL);
    expect(result.milestone).toBeNull();
  });

  it('prioritizes full over half when single log crosses both', () => {
    // Start at 0, log 2000 — crosses both 50% and 100%
    const result = logWaterIntake(0, 2000, GOAL);
    expect(result.milestone).toBe('full');
  });

  it('returns null milestone for small log well below 50%', () => {
    const result = logWaterIntake(0, 150, GOAL);
    expect(result.milestone).toBeNull();
  });

  it('detects half milestone at exact 50% boundary', () => {
    const result = logWaterIntake(750, 250, GOAL);
    expect(result.milestone).toBe('half');
  });

  it('detects full milestone at exact 100% boundary', () => {
    const result = logWaterIntake(1750, 250, GOAL);
    expect(result.milestone).toBe('full');
  });

  it('handles zero goal gracefully', () => {
    const result = logWaterIntake(0, 250, 0);
    expect(result.newTotalMl).toBe(250);
    expect(result.goalMet).toBe(true);
    expect(result.milestone).toBeNull();
  });
});
