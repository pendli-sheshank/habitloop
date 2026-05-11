jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  db: {},
}));

jest.mock('@/utils/dateUtils', () => ({
  getUTCDayKey: jest.fn(),
  getYesterdayKey: jest.fn(),
}));

import { updateStreak, calcStreakBonusXp, calcLevelFromXp } from '../streakEngine';
import * as dateUtils from '@/utils/dateUtils';

const mockGetYesterdayKey = dateUtils.getYesterdayKey as jest.Mock;

describe('updateStreak', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('increments on consecutive UTC day', () => {
    mockGetYesterdayKey.mockReturnValue('2026-05-06');
    const result = updateStreak(3, '2026-05-06', '2026-05-07');
    expect(result.newStreak).toBe(4);
    expect(result.newLastDate).toBe('2026-05-07');
  });

  it('is idempotent for same day', () => {
    const result = updateStreak(3, '2026-05-07', '2026-05-07');
    expect(result.newStreak).toBe(3);
    expect(result.newLastDate).toBe('2026-05-07');
  });

  it('resets streak on gap', () => {
    mockGetYesterdayKey.mockReturnValue('2026-05-06');
    const result = updateStreak(5, '2026-05-01', '2026-05-07');
    expect(result.newStreak).toBe(1);
    expect(result.newLastDate).toBe('2026-05-07');
  });

  it('starts streak at 1 when no previous streak date', () => {
    mockGetYesterdayKey.mockReturnValue('2026-05-06');
    const result = updateStreak(0, null, '2026-05-07');
    expect(result.newStreak).toBe(1);
    expect(result.newLastDate).toBe('2026-05-07');
  });

  it('increments from 1 to 2 on back-to-back days', () => {
    mockGetYesterdayKey.mockReturnValue('2026-05-06');
    const result = updateStreak(1, '2026-05-06', '2026-05-07');
    expect(result.newStreak).toBe(2);
  });
});

describe('calcStreakBonusXp', () => {
  it('returns 100 at 7-day streak', () => {
    expect(calcStreakBonusXp(7)).toBe(100);
  });

  it('returns 500 at 30-day streak', () => {
    expect(calcStreakBonusXp(30)).toBe(500);
  });

  it('returns 0 for non-milestone streaks', () => {
    expect(calcStreakBonusXp(1)).toBe(0);
    expect(calcStreakBonusXp(5)).toBe(0);
    expect(calcStreakBonusXp(10)).toBe(0);
    expect(calcStreakBonusXp(29)).toBe(0);
    expect(calcStreakBonusXp(31)).toBe(0);
  });
});

describe('calcLevelFromXp', () => {
  it('returns level 1 for 0 XP', () => {
    expect(calcLevelFromXp(0)).toBe(1);
  });

  it('returns level 1 for 499 XP', () => {
    expect(calcLevelFromXp(499)).toBe(1);
  });

  it('returns level 2 at 500 XP', () => {
    expect(calcLevelFromXp(500)).toBe(2);
  });

  it('returns level 2 for 1499 XP', () => {
    expect(calcLevelFromXp(1499)).toBe(2);
  });

  it('returns level 3 at 1500 XP', () => {
    expect(calcLevelFromXp(1500)).toBe(3);
  });

  it('returns level 3 for 4999 XP', () => {
    expect(calcLevelFromXp(4999)).toBe(3);
  });

  it('returns level 4 at 5000 XP', () => {
    expect(calcLevelFromXp(5000)).toBe(4);
  });

  it('returns level 4 for very high XP', () => {
    expect(calcLevelFromXp(99999)).toBe(4);
  });
});
