/**
 * cycleEngine unit tests.
 * Uses fake timers to pin "today" so phase logic is deterministic.
 * All dates are midnight UTC to match the setHours(0,0,0,0) normalisation
 * inside the engine functions.
 */

import {
  getCurrentPhase,
  getCurrentPhaseFromISO,
  getDayOfCycle,
  getFastingRecommendation,
  shouldWarnForProtocol,
  computeAvgCycleLength,
} from '../cycleEngine';
import { CyclePhase } from '@/types/cycle';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a Date that is `n` days before the pinned "today" (2026-05-13). */
function daysAgo(n: number): Date {
  const d = new Date('2026-05-13T00:00:00.000Z');
  d.setDate(d.getDate() - n);
  return d;
}

/** ISO string `n` days before pinned today. */
function isoAgo(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  // Pin today to 2026-05-13 00:00:00 UTC
  jest.setSystemTime(new Date('2026-05-13T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── getCurrentPhase ─────────────────────────────────────────────────────────

describe('getCurrentPhase', () => {
  const AVG = 28;
  const PERIOD_LEN = 5;

  it('day 1 → menstruation (same day as period start)', () => {
    expect(getCurrentPhase(daysAgo(0), AVG, PERIOD_LEN)).toBe(CyclePhase.MENSTRUATION);
  });

  it('day 3 → menstruation', () => {
    expect(getCurrentPhase(daysAgo(2), AVG, PERIOD_LEN)).toBe(CyclePhase.MENSTRUATION);
  });

  it('day 5 → menstruation (last day of period)', () => {
    expect(getCurrentPhase(daysAgo(4), AVG, PERIOD_LEN)).toBe(CyclePhase.MENSTRUATION);
  });

  it('day 6 → follicular (first day after period)', () => {
    expect(getCurrentPhase(daysAgo(5), AVG, PERIOD_LEN)).toBe(CyclePhase.FOLLICULAR);
  });

  it('day 13 → follicular (last follicular day)', () => {
    expect(getCurrentPhase(daysAgo(12), AVG, PERIOD_LEN)).toBe(CyclePhase.FOLLICULAR);
  });

  it('day 14 → ovulation', () => {
    expect(getCurrentPhase(daysAgo(13), AVG, PERIOD_LEN)).toBe(CyclePhase.OVULATION);
  });

  it('day 16 → ovulation (last ovulation day)', () => {
    expect(getCurrentPhase(daysAgo(15), AVG, PERIOD_LEN)).toBe(CyclePhase.OVULATION);
  });

  it('day 17 → luteal', () => {
    expect(getCurrentPhase(daysAgo(16), AVG, PERIOD_LEN)).toBe(CyclePhase.LUTEAL);
  });

  it('day 28 → luteal (last day of cycle)', () => {
    expect(getCurrentPhase(daysAgo(27), AVG, PERIOD_LEN)).toBe(CyclePhase.LUTEAL);
  });

  it('day 29 wraps around to day 1 → menstruation', () => {
    // 29th day in a 28-day cycle = (29-1) % 28 + 1 = 1
    expect(getCurrentPhase(daysAgo(28), AVG, PERIOD_LEN)).toBe(CyclePhase.MENSTRUATION);
  });

  it('day 35 wraps to day 7 → follicular', () => {
    // (35-1) % 28 + 1 = 7 → follicular
    expect(getCurrentPhase(daysAgo(34), AVG, PERIOD_LEN)).toBe(CyclePhase.FOLLICULAR);
  });

  it('uses avgPeriodLength to bound menstruation phase', () => {
    // With period length of 7, day 7 should still be menstruation
    expect(getCurrentPhase(daysAgo(6), AVG, 7)).toBe(CyclePhase.MENSTRUATION);
    // Day 8 should be follicular
    expect(getCurrentPhase(daysAgo(7), AVG, 7)).toBe(CyclePhase.FOLLICULAR);
  });
});

// ─── getCurrentPhaseFromISO ───────────────────────────────────────────────────

describe('getCurrentPhaseFromISO', () => {
  it('parses valid ISO date and returns correct phase', () => {
    // 0 days ago = day 1 → menstruation
    expect(getCurrentPhaseFromISO(isoAgo(0))).toBe(CyclePhase.MENSTRUATION);
  });

  it('returns follicular fallback on invalid ISO string', () => {
    expect(getCurrentPhaseFromISO('not-a-date')).toBe(CyclePhase.FOLLICULAR);
  });

  it('returns follicular fallback on empty string', () => {
    expect(getCurrentPhaseFromISO('')).toBe(CyclePhase.FOLLICULAR);
  });

  it('delegates avgCycleLength and avgPeriodLength correctly', () => {
    // 5 days ago with period length 7 → still menstruation
    expect(getCurrentPhaseFromISO(isoAgo(5), 28, 7)).toBe(CyclePhase.MENSTRUATION);
    // 5 days ago with period length 4 → follicular (day 6)
    expect(getCurrentPhaseFromISO(isoAgo(5), 28, 4)).toBe(CyclePhase.FOLLICULAR);
  });
});

// ─── getDayOfCycle ────────────────────────────────────────────────────────────

describe('getDayOfCycle', () => {
  it('returns 1 on the same day as period start', () => {
    expect(getDayOfCycle(isoAgo(0))).toBe(1);
  });

  it('returns correct day mid-cycle', () => {
    expect(getDayOfCycle(isoAgo(9))).toBe(10);
  });

  it('returns 28 on last day of a 28-day cycle', () => {
    expect(getDayOfCycle(isoAgo(27))).toBe(28);
  });

  it('wraps at cycle boundary', () => {
    // 28 days ago → day 29 in 28-day cycle → wraps to day 1
    expect(getDayOfCycle(isoAgo(28), 28)).toBe(1);
  });

  it('wraps correctly for longer cycles', () => {
    // 32 days ago in a 30-day cycle: (32-1) % 30 + 1 = 2
    expect(getDayOfCycle(isoAgo(31), 30)).toBe(2);
  });

  it('clamps to 1 for future dates (day < 1)', () => {
    // Shift period start into the future: the engine normalises day < 1 to 1
    const futureISO = new Date('2026-05-20T00:00:00.000Z').toISOString().slice(0, 10);
    expect(getDayOfCycle(futureISO)).toBe(1);
  });

  it('returns null for invalid ISO', () => {
    expect(getDayOfCycle('invalid')).toBeNull();
  });
});

// ─── getFastingRecommendation ─────────────────────────────────────────────────

describe('getFastingRecommendation', () => {
  it('menstruation → 12:12 + avoid', () => {
    const rec = getFastingRecommendation(CyclePhase.MENSTRUATION);
    expect(rec.recommendedProtocol).toBe('circadian');
    expect(rec.warningLevel).toBe('avoid');
    expect(rec.phase).toBe(CyclePhase.MENSTRUATION);
    expect(rec.message.length).toBeGreaterThan(0);
  });

  it('follicular → 16:8 + none', () => {
    const rec = getFastingRecommendation(CyclePhase.FOLLICULAR);
    expect(rec.recommendedProtocol).toBe('16:8');
    expect(rec.warningLevel).toBe('none');
  });

  it('ovulation → 16:8 + none', () => {
    const rec = getFastingRecommendation(CyclePhase.OVULATION);
    expect(rec.recommendedProtocol).toBe('16:8');
    expect(rec.warningLevel).toBe('none');
  });

  it('luteal → 14:10 + caution', () => {
    const rec = getFastingRecommendation(CyclePhase.LUTEAL);
    expect(rec.recommendedProtocol).toBe('15:9');
    expect(rec.warningLevel).toBe('caution');
  });

  it('returns a non-empty message for every phase', () => {
    const phases = [
      CyclePhase.MENSTRUATION,
      CyclePhase.FOLLICULAR,
      CyclePhase.OVULATION,
      CyclePhase.LUTEAL,
    ] as const;
    phases.forEach(p => {
      expect(getFastingRecommendation(p).message.length).toBeGreaterThan(10);
    });
  });
});

// ─── shouldWarnForProtocol ────────────────────────────────────────────────────

describe('shouldWarnForProtocol', () => {
  describe('menstruation (recommended 12:12)', () => {
    it('12:12 → no warning', () => {
      expect(shouldWarnForProtocol(CyclePhase.MENSTRUATION, 'circadian')).toBe(false);
    });

    it('14:10 → warn (14 > 12)', () => {
      expect(shouldWarnForProtocol(CyclePhase.MENSTRUATION, '15:9')).toBe(true);
    });

    it('16:8 → warn (16 > 12)', () => {
      expect(shouldWarnForProtocol(CyclePhase.MENSTRUATION, '16:8')).toBe(true);
    });
  });

  describe('follicular (recommended 16:8)', () => {
    it('16:8 → no warning', () => {
      expect(shouldWarnForProtocol(CyclePhase.FOLLICULAR, '16:8')).toBe(false);
    });

    it('14:10 → no warning (14 < 16)', () => {
      expect(shouldWarnForProtocol(CyclePhase.FOLLICULAR, '15:9')).toBe(false);
    });

    it('12:12 → no warning (12 < 16)', () => {
      expect(shouldWarnForProtocol(CyclePhase.FOLLICULAR, 'circadian')).toBe(false);
    });
  });

  describe('luteal (recommended 14:10)', () => {
    it('14:10 → no warning', () => {
      expect(shouldWarnForProtocol(CyclePhase.LUTEAL, '15:9')).toBe(false);
    });

    it('16:8 → warn (16 > 14)', () => {
      expect(shouldWarnForProtocol(CyclePhase.LUTEAL, '16:8')).toBe(true);
    });

    it('12:12 → no warning (12 < 14)', () => {
      expect(shouldWarnForProtocol(CyclePhase.LUTEAL, 'circadian')).toBe(false);
    });
  });

  describe('ovulation (recommended 16:8)', () => {
    it('16:8 → no warning', () => {
      expect(shouldWarnForProtocol(CyclePhase.OVULATION, '16:8')).toBe(false);
    });

    it('14:10 → no warning (14 < 16)', () => {
      expect(shouldWarnForProtocol(CyclePhase.OVULATION, '15:9')).toBe(false);
    });
  });
});

// ─── computeAvgCycleLength ────────────────────────────────────────────────────

describe('computeAvgCycleLength', () => {
  it('returns 28 when fewer than 2 dates provided', () => {
    expect(computeAvgCycleLength([])).toBe(28);
    expect(computeAvgCycleLength(['2026-01-01'])).toBe(28);
  });

  it('computes exact average from two dates 28 days apart', () => {
    expect(computeAvgCycleLength(['2026-01-01', '2026-01-29'])).toBe(28);
  });

  it('computes average from three evenly spaced dates', () => {
    // gaps: 30, 30 → avg = 30
    expect(computeAvgCycleLength([
      '2026-01-01',
      '2026-01-31',
      '2026-03-02',
    ])).toBe(30);
  });

  it('computes average from uneven gaps', () => {
    // gaps: 25, 31 → avg = 28
    expect(computeAvgCycleLength([
      '2026-01-01',
      '2026-01-26',
      '2026-02-26',
    ])).toBe(28);
  });

  it('handles unsorted dates correctly', () => {
    // Same as sorted test — should sort internally
    expect(computeAvgCycleLength([
      '2026-01-29',
      '2026-01-01',
    ])).toBe(28);
  });

  it('clamps result to minimum of 21 days', () => {
    // gap of 10 days — clamped to 21
    expect(computeAvgCycleLength(['2026-01-01', '2026-01-11'])).toBe(21);
  });

  it('clamps result to maximum of 45 days', () => {
    // gap of 60 days — clamped to 45
    expect(computeAvgCycleLength(['2026-01-01', '2026-03-02'])).toBe(45);
  });

  it('correctly averages 6 historical dates', () => {
    // 5 gaps of 28 each → avg = 28
    expect(computeAvgCycleLength([
      '2026-01-01',
      '2026-01-29',
      '2026-02-26',
      '2026-03-26',
      '2026-04-23',
      '2026-05-21',
    ])).toBe(28);
  });

  it('rounds to nearest integer', () => {
    // gaps: 27, 28, 28 → avg = 27.67 → rounds to 28
    expect(computeAvgCycleLength([
      '2026-01-01',
      '2026-01-28',
      '2026-02-25',
      '2026-03-25',
    ])).toBe(28);
  });
});
