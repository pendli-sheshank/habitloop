import {
  getProtocolDurationMs,
  getFastingStage,
  calculateElapsedMs,
  calculateRemainingMs,
  calculateEatingWindowEnd,
  isFastComplete,
  calculateProgress,
  calculateXpReward,
} from '../fastingEngine';

const HOUR = 3_600_000;

describe('getProtocolDurationMs', () => {
  it('returns 13 hours for circadian', () => {
    expect(getProtocolDurationMs('circadian')).toBe(13 * HOUR);
  });

  it('returns 15 hours for 15:9', () => {
    expect(getProtocolDurationMs('15:9')).toBe(15 * HOUR);
  });

  it('returns 16 hours for 16:8', () => {
    expect(getProtocolDurationMs('16:8')).toBe(16 * HOUR);
  });

  it('returns 24 hours for 24h', () => {
    expect(getProtocolDurationMs('24h')).toBe(24 * HOUR);
  });

  it('defaults to 16 hours for unknown protocol', () => {
    expect(getProtocolDurationMs('omad')).toBe(23 * HOUR);
  });
});

describe('getFastingStage', () => {
  it('returns Fed State for 0-4 hours', () => {
    expect(getFastingStage(0).id).toBe('fed');
    expect(getFastingStage(2 * HOUR).id).toBe('fed');
    expect(getFastingStage(3.9 * HOUR).id).toBe('fed');
  });

  it('returns Early Fast for 4-12 hours', () => {
    expect(getFastingStage(4 * HOUR).id).toBe('early-fast');
    expect(getFastingStage(8 * HOUR).id).toBe('early-fast');
    expect(getFastingStage(11.9 * HOUR).id).toBe('early-fast');
  });

  it('returns Metabolic Shift for 12-14 hours', () => {
    expect(getFastingStage(12 * HOUR).id).toBe('metabolic-shift');
    expect(getFastingStage(13 * HOUR).id).toBe('metabolic-shift');
    expect(getFastingStage(13.9 * HOUR).id).toBe('metabolic-shift');
  });

  it('returns Fat Burning for 16+ hours', () => {
    expect(getFastingStage(16 * HOUR).id).toBe('fat-burning');
    expect(getFastingStage(20 * HOUR).id).toBe('fat-burning');
  });

  it('returns correct labels', () => {
    expect(getFastingStage(0).label).toBe('Fed State');
    expect(getFastingStage(5 * HOUR).label).toBe('Early Fast');
    expect(getFastingStage(13 * HOUR).label).toBe('Metabolic Shift');
    expect(getFastingStage(17 * HOUR).label).toBe('Fat Burning');
  });
});

describe('calculateElapsedMs', () => {
  it('returns elapsed time from startTime to now', () => {
    const start = 1000;
    expect(calculateElapsedMs(start, 5000)).toBe(4000);
  });

  it('returns 0 if now is before startTime', () => {
    expect(calculateElapsedMs(5000, 1000)).toBe(0);
  });
});

describe('calculateRemainingMs', () => {
  it('returns remaining time', () => {
    const start = 0;
    const target = 16 * HOUR;
    const now = 4 * HOUR;
    expect(calculateRemainingMs(start, target, now)).toBe(12 * HOUR);
  });

  it('returns 0 when past target duration', () => {
    const start = 0;
    const target = 16 * HOUR;
    const now = 20 * HOUR;
    expect(calculateRemainingMs(start, target, now)).toBe(0);
  });

  it('returns full duration when just started', () => {
    const start = 1000;
    expect(calculateRemainingMs(start, 16 * HOUR, 1000)).toBe(16 * HOUR);
  });
});

describe('calculateEatingWindowEnd', () => {
  it('returns startTime + targetDurationMs', () => {
    const start = 1_700_000_000_000;
    const target = 16 * HOUR;
    expect(calculateEatingWindowEnd(start, target)).toBe(start + target);
  });
});

describe('isFastComplete', () => {
  it('returns false when remaining > 0', () => {
    expect(isFastComplete(0, 16 * HOUR, 10 * HOUR)).toBe(false);
  });

  it('returns true when remaining is 0', () => {
    expect(isFastComplete(0, 16 * HOUR, 16 * HOUR)).toBe(true);
  });

  it('returns true when past target', () => {
    expect(isFastComplete(0, 16 * HOUR, 20 * HOUR)).toBe(true);
  });
});

describe('calculateProgress', () => {
  it('returns 0 at start', () => {
    expect(calculateProgress(1000, 16 * HOUR, 1000)).toBe(0);
  });

  it('returns 0.5 at halfway', () => {
    expect(calculateProgress(0, 16 * HOUR, 8 * HOUR)).toBe(0.5);
  });

  it('returns 1 when complete', () => {
    expect(calculateProgress(0, 16 * HOUR, 16 * HOUR)).toBe(1);
  });

  it('clamps to 1 when past target', () => {
    expect(calculateProgress(0, 16 * HOUR, 20 * HOUR)).toBe(1);
  });

  it('handles zero duration', () => {
    expect(calculateProgress(0, 0, 1000)).toBe(1);
  });
});

describe('calculateXpReward', () => {
  it('returns 65 for circadian (13h)', () => {
    expect(calculateXpReward('circadian')).toBe(65);
  });

  it('returns 75 for 15:9', () => {
    expect(calculateXpReward('15:9')).toBe(75);
  });

  it('returns 80 for 16:8', () => {
    expect(calculateXpReward('16:8')).toBe(80);
  });

  it('returns 864 for 72h', () => {
    expect(calculateXpReward('72h')).toBe(864);
  });
});
