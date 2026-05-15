import {
  saveWaterEvent,
  awardHydrationXp,
  loadTodayWater,
} from '../waterService';
import { getUTCDayKey } from '@/utils/dateUtils';

// Mock Firestore
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockCommit = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((...args: string[]) => args.join('/')),
  collection: jest.fn((...args: string[]) => args.join('/')),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  writeBatch: jest.fn(() => ({
    set: mockSet.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    commit: mockCommit,
  })),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

jest.mock('@/services/firebase', () => ({
  db: 'mock-db',
}));

jest.mock('@/services/fasting/xpEngine', () => ({
  HYDRATION_GOAL_XP: 20,
  calcLevelFromXp: jest.fn((xp: number) => {
    if (xp >= 5000) return 4;
    if (xp >= 1500) return 3;
    if (xp >= 500) return 2;
    return 1;
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveWaterEvent', () => {
  it('batch writes a waterEvent and sets today aggregate with merge', async () => {
    await saveWaterEvent('user-1', 250, 2000, 750, false);

    // batch.set called twice: waterEvent + today aggregate (set+merge)
    expect(mockSet).toHaveBeenCalledTimes(2);
    const eventData = mockSet.mock.calls[0][1];
    expect(eventData.userId).toBe('user-1');
    expect(eventData.ml).toBe(250);
    expect(eventData.date).toBe(getUTCDayKey(Date.now()));

    const todayData = mockSet.mock.calls[1][1];
    expect(todayData.waterMl).toBe(750);
    expect(todayData.waterGoalMl).toBe(2000);
    expect(todayData.waterGoalMet).toBe(false);

    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('sets waterGoalMet true when goal is met', async () => {
    await saveWaterEvent('user-1', 500, 2000, 2100, true);

    const todayData = mockSet.mock.calls[1][1];
    expect(todayData.waterGoalMet).toBe(true);
  });
});

describe('awardHydrationXp', () => {
  it('adds HYDRATION_GOAL_XP to existing xpTotal and updates level via batch.set', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ xpTotal: 480, level: 1, badgeIds: [] }),
    });

    await awardHydrationXp('user-1');

    // 480 + 20 = 500 → level 2; now uses batch.set with merge
    expect(mockSet).toHaveBeenCalledTimes(1);
    const setData = mockSet.mock.calls[0][1];
    expect(setData.xpTotal).toBe(500);
    expect(setData.level).toBe(2);
  });

  it('does nothing when streak doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await awardHydrationXp('user-1');

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe('loadTodayWater', () => {
  it('returns today data when date matches', async () => {
    const today = getUTCDayKey(Date.now());
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        date: today,
        waterMl: 1200,
        waterGoalMl: 2500,
        waterGoalMet: false,
        fastCompleted: false,
        fastProtocol: null,
      }),
    });

    const result = await loadTodayWater('user-1');

    expect(result).toEqual({
      waterMl: 1200,
      waterGoalMl: 2500,
      waterGoalMet: false,
      date: today,
    });
  });

  it('returns null when date is stale (yesterday)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        date: '2025-01-01',
        waterMl: 800,
        waterGoalMl: 2000,
        waterGoalMet: false,
      }),
    });

    const result = await loadTodayWater('user-1');
    expect(result).toBeNull();
  });

  it('returns null when doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await loadTodayWater('user-1');
    expect(result).toBeNull();
  });
});
