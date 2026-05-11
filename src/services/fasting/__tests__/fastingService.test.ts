import { buildFastSession, saveFastSession } from '../fastingService';
import type { ActiveFastState } from '@/types/fasting';

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => {
  function MockTimestamp() {}
  return {
    doc: jest.fn((_db: unknown, ...pathSegments: string[]) => pathSegments.join('/')),
    collection: jest.fn((_db: unknown, name: string) => name),
    writeBatch: jest.fn(() => ({
      set: mockBatchSet,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })),
    serverTimestamp: jest.fn(() => '__SERVER_TIMESTAMP__'),
    Timestamp: MockTimestamp,
  };
});

jest.mock('@/services/firebase', () => ({
  db: '__MOCK_DB__',
}));

const HOUR = 3_600_000;

const mockActiveFast: ActiveFastState = {
  startTime: 1_700_000_000_000,
  targetDurationMs: 16 * HOUR,
  protocol: '16:8',
};

describe('buildFastSession', () => {
  it('builds a completed session with XP', () => {
    const session = buildFastSession('uid-1', mockActiveFast, true);

    expect(session.userId).toBe('uid-1');
    expect(session.startTime).toBe(1_700_000_000_000);
    expect(session.targetDurationMs).toBe(16 * HOUR);
    expect(session.protocol).toBe('16:8');
    expect(session.completed).toBe(true);
    expect(session.xpEarned).toBe(80);
    expect(session.endTime).toBeGreaterThan(0);
    expect(session.cyclePhaseAtStart).toBeNull();
  });

  it('builds a cancelled session with 0 XP', () => {
    const session = buildFastSession('uid-1', mockActiveFast, false);

    expect(session.completed).toBe(false);
    expect(session.xpEarned).toBe(0);
  });

  it('uses correct XP for different protocols', () => {
    const fast12: ActiveFastState = { ...mockActiveFast, protocol: '12:12' };
    const fast14: ActiveFastState = { ...mockActiveFast, protocol: '14:10' };

    expect(buildFastSession('uid-1', fast12, true).xpEarned).toBe(30);
    expect(buildFastSession('uid-1', fast14, true).xpEarned).toBe(50);
  });
});

describe('saveFastSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes session doc to fastSessions collection', async () => {
    await saveFastSession('uid-1', mockActiveFast, true);

    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    const sessionData = mockBatchSet.mock.calls[0][1];
    expect(sessionData.userId).toBe('uid-1');
    expect(sessionData.protocol).toBe('16:8');
    expect(sessionData.completed).toBe(true);
    expect(sessionData.createdAt).toBe('__SERVER_TIMESTAMP__');
  });

  it('updates today aggregate when completed', async () => {
    await saveFastSession('uid-1', mockActiveFast, true);

    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    const updateData = mockBatchUpdate.mock.calls[0][1];
    expect(updateData.fastCompleted).toBe(true);
    expect(updateData.fastProtocol).toBe('16:8');
    expect(updateData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not update today aggregate when cancelled', async () => {
    await saveFastSession('uid-1', mockActiveFast, false);

    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('commits the batch', async () => {
    await saveFastSession('uid-1', mockActiveFast, true);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
