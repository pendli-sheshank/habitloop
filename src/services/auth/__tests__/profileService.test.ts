import {
  initializeUserProfile,
  loadUserProfile,
  completeOnboarding,
} from '../profileService';
import type { OnboardingData } from '@/types/auth';

// --- Firestore mocks ---

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => {
  function MockTimestamp() {}
  return {
    doc: jest.fn((_db: unknown, ...pathSegments: string[]) => pathSegments.join('/')),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    writeBatch: jest.fn(() => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    serverTimestamp: jest.fn(() => '__SERVER_TIMESTAMP__'),
    Timestamp: MockTimestamp,
  };
});

jest.mock('@/services/firebase', () => ({
  db: '__MOCK_DB__',
}));

describe('initializeUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes 4 documents in a single batch', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await initializeUserProfile('uid-123', 'test@example.com', 'email');

    expect(mockBatchSet).toHaveBeenCalledTimes(4);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('sets correct profile document data', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await initializeUserProfile('uid-123', 'test@example.com', 'google');

    const profileCall = mockBatchSet.mock.calls[0];
    expect(profileCall[1]).toMatchObject({
      email: 'test@example.com',
      provider: 'google',
      displayName: '',
      photoURL: null,
      onboardingComplete: false,
      expoPushToken: null,
    });
  });

  it('sets correct settings document defaults', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await initializeUserProfile('uid-123', 'test@example.com', 'email');

    const settingsCall = mockBatchSet.mock.calls[1];
    expect(settingsCall[1]).toMatchObject({
      defaultProtocol: '16:8',
      weightKg: 0,
      activityLevel: 'moderate',
      calculatedWaterGoalMl: 2000,
      notifications: {
        fastingReminders: true,
        hydrationReminders: true,
        socialNudges: true,
      },
      cycle: {
        lastPeriodStart: null,
        avgCycleLength: 28,
        avgPeriodLength: 5,
      },
    });
  });

  it('sets zeroed today aggregate', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await initializeUserProfile('uid-123', 'test@example.com', 'email');

    const todayCall = mockBatchSet.mock.calls[2];
    expect(todayCall[1]).toEqual({
      date: '',
      waterMl: 0,
      waterGoalMl: 2000,
      waterGoalMet: false,
      fastCompleted: false,
      fastProtocol: null,
    });
  });

  it('sets zeroed streak aggregate', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await initializeUserProfile('uid-123', 'test@example.com', 'email');

    const streakCall = mockBatchSet.mock.calls[3];
    expect(streakCall[1]).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastStreakDate: null,
      xpTotal: 0,
      level: 1,
      badgeIds: [],
    });
  });

  it('skips batch write if profile already exists (idempotent)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });

    await initializeUserProfile('uid-123', 'test@example.com', 'email');

    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});

describe('loadUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when profile does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await loadUserProfile('uid-123');
    expect(result).toBeNull();
  });

  it('returns mapped profile when document exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: 'Jane',
        email: 'jane@example.com',
        photoURL: null,
        provider: 'email',
        onboardingComplete: true,
        expoPushToken: null,
        createdAt: 1700000000000,
        lastActiveAt: 1700000000000,
      }),
    });

    const result = await loadUserProfile('uid-123');
    expect(result).toEqual({
      displayName: 'Jane',
      email: 'jane@example.com',
      photoURL: null,
      provider: 'email',
      onboardingComplete: true,
      expoPushToken: null,
      createdAt: 1700000000000,
      lastActiveAt: 1700000000000,
    });
  });
});

describe('completeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates profile and settings documents in a batch', async () => {
    const data: OnboardingData = {
      displayName: 'Jane',
      gender: 'female',
      weightKg: 62,
      activityLevel: 'moderate',
      defaultProtocol: '16:8',
      calculatedWaterGoalMl: 2346,
      lastPeriodStart: '2026-04-20',
      notificationsEnabled: true,
    };

    await completeOnboarding('uid-123', data);

    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    const profileUpdate = mockBatchUpdate.mock.calls[0][1];
    expect(profileUpdate).toMatchObject({
      displayName: 'Jane',
      onboardingComplete: true,
    });

    const settingsUpdate = mockBatchUpdate.mock.calls[1][1];
    expect(settingsUpdate).toMatchObject({
      defaultProtocol: '16:8',
      weightKg: 62,
      activityLevel: 'moderate',
      calculatedWaterGoalMl: 2346,
      'cycle.lastPeriodStart': '2026-04-20',
      'notifications.fastingReminders': true,
      'notifications.hydrationReminders': true,
    });
  });
});
