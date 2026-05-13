/**
 * groupEngine unit tests.
 * Today is pinned to 2026-05-13 via fake timers.
 * All "today" references in the engine use new Date().toISOString().slice(0,10),
 * so setSystemTime controls them deterministically.
 */

import {
  getChallengeStatus,
  isChallengeActive,
  isChallengeOver,
  daysRemainingInChallenge,
  challengeDayNumber,
  isStreakFrozen,
  didAllMembersCheckIn,
  getGroupCheckInRate,
  getMemberCheckInStreak,
  sortLeaderboard,
  computeEndDate,
} from '../groupEngine';
import type { Group, LeaderboardEntry } from '@/types/group';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = '2026-05-13';

/** Returns an ISO date string offset from TODAY by n days (+/-). */
function offset(n: number): string {
  const d = new Date(`${TODAY}T00:00:00.000Z`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    name: 'Test Group',
    createdBy: 'u1',
    memberIds: ['u1', 'u2'],
    challengeProtocol: '16:8',
    startDate: offset(-3),   // default: active challenge started 3 days ago
    endDate: offset(3),      // ends in 3 days
    durationDays: 7,
    streakCount: 2,
    frozenDays: [],
    checkIns: {},
    leaderboard: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${TODAY}T00:00:00.000Z`));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── getChallengeStatus ───────────────────────────────────────────────────────

describe('getChallengeStatus', () => {
  it('returns no-challenge when startDate is empty', () => {
    expect(getChallengeStatus(makeGroup({ startDate: '', endDate: '' }))).toBe('no-challenge');
  });

  it('returns upcoming when start is in the future', () => {
    expect(getChallengeStatus(makeGroup({ startDate: offset(1), endDate: offset(7) }))).toBe('upcoming');
  });

  it('returns active when today equals startDate', () => {
    expect(getChallengeStatus(makeGroup({ startDate: TODAY, endDate: offset(6) }))).toBe('active');
  });

  it('returns active when today is between start and end', () => {
    expect(getChallengeStatus(makeGroup({ startDate: offset(-3), endDate: offset(3) }))).toBe('active');
  });

  it('returns active when today equals endDate', () => {
    expect(getChallengeStatus(makeGroup({ startDate: offset(-6), endDate: TODAY }))).toBe('active');
  });

  it('returns complete when today is after endDate', () => {
    expect(getChallengeStatus(makeGroup({ startDate: offset(-7), endDate: offset(-1) }))).toBe('complete');
  });
});

// ─── isChallengeActive / isChallengeOver ─────────────────────────────────────

describe('isChallengeActive', () => {
  it('true for active challenge', () => {
    expect(isChallengeActive(makeGroup())).toBe(true);
  });

  it('false for upcoming challenge', () => {
    expect(isChallengeActive(makeGroup({ startDate: offset(2), endDate: offset(8) }))).toBe(false);
  });

  it('false for completed challenge', () => {
    expect(isChallengeActive(makeGroup({ startDate: offset(-8), endDate: offset(-2) }))).toBe(false);
  });
});

describe('isChallengeOver', () => {
  it('true when past endDate', () => {
    expect(isChallengeOver(makeGroup({ startDate: offset(-8), endDate: offset(-1) }))).toBe(true);
  });

  it('false when active', () => {
    expect(isChallengeOver(makeGroup())).toBe(false);
  });

  it('false when upcoming', () => {
    expect(isChallengeOver(makeGroup({ startDate: offset(1), endDate: offset(7) }))).toBe(false);
  });
});

// ─── daysRemainingInChallenge ─────────────────────────────────────────────────

describe('daysRemainingInChallenge', () => {
  it('returns 0 when challenge is not active', () => {
    expect(daysRemainingInChallenge(makeGroup({ startDate: offset(2), endDate: offset(8) }))).toBe(0);
    expect(daysRemainingInChallenge(makeGroup({ startDate: offset(-8), endDate: offset(-1) }))).toBe(0);
  });

  it('returns 1 on the last day (endDate === today)', () => {
    expect(daysRemainingInChallenge(makeGroup({ startDate: offset(-6), endDate: TODAY }))).toBe(1);
  });

  it('returns full duration on the first day', () => {
    // 7-day challenge, started today, ends in 6 days → 7 remaining (inclusive)
    expect(daysRemainingInChallenge(makeGroup({ startDate: TODAY, endDate: offset(6) }))).toBe(7);
  });

  it('returns correct mid-challenge value', () => {
    // Started 3 days ago, ends in 3 days → 4 remaining (today + 3 future days)
    expect(daysRemainingInChallenge(makeGroup({ startDate: offset(-3), endDate: offset(3) }))).toBe(4);
  });
});

// ─── challengeDayNumber ───────────────────────────────────────────────────────

describe('challengeDayNumber', () => {
  it('returns null when challenge is not active', () => {
    expect(challengeDayNumber(makeGroup({ startDate: offset(1), endDate: offset(7) }))).toBeNull();
    expect(challengeDayNumber(makeGroup({ startDate: offset(-8), endDate: offset(-1) }))).toBeNull();
  });

  it('returns 1 on the first day', () => {
    expect(challengeDayNumber(makeGroup({ startDate: TODAY, endDate: offset(6) }))).toBe(1);
  });

  it('returns correct day mid-challenge', () => {
    // started 3 days ago → day 4
    expect(challengeDayNumber(makeGroup({ startDate: offset(-3), endDate: offset(3) }))).toBe(4);
  });

  it('returns durationDays on the final day', () => {
    // 7-day challenge, final day
    expect(challengeDayNumber(makeGroup({ startDate: offset(-6), endDate: TODAY, durationDays: 7 }))).toBe(7);
  });
});

// ─── isStreakFrozen ───────────────────────────────────────────────────────────

describe('isStreakFrozen', () => {
  it('returns false for empty frozenDays', () => {
    expect(isStreakFrozen(makeGroup(), TODAY)).toBe(false);
  });

  it('returns false when date not in frozenDays', () => {
    expect(isStreakFrozen(makeGroup({ frozenDays: [offset(-1)] }), TODAY)).toBe(false);
  });

  it('returns true when date is in frozenDays', () => {
    expect(isStreakFrozen(makeGroup({ frozenDays: [TODAY] }), TODAY)).toBe(true);
  });

  it('returns true for a past frozen date', () => {
    const past = offset(-2);
    expect(isStreakFrozen(makeGroup({ frozenDays: [past, TODAY] }), past)).toBe(true);
  });
});

// ─── didAllMembersCheckIn ─────────────────────────────────────────────────────

describe('didAllMembersCheckIn', () => {
  it('returns false when memberIds is empty', () => {
    expect(didAllMembersCheckIn(makeGroup({ memberIds: [] }), TODAY)).toBe(false);
  });

  it('returns false when no checkIns recorded', () => {
    expect(didAllMembersCheckIn(makeGroup({ checkIns: {} }), TODAY)).toBe(false);
  });

  it('returns false when only some members checked in', () => {
    expect(didAllMembersCheckIn(makeGroup({
      memberIds: ['u1', 'u2'],
      checkIns: { u1: { [TODAY]: true } },
    }), TODAY)).toBe(false);
  });

  it('returns true when all members checked in', () => {
    expect(didAllMembersCheckIn(makeGroup({
      memberIds: ['u1', 'u2'],
      checkIns: { u1: { [TODAY]: true }, u2: { [TODAY]: true } },
    }), TODAY)).toBe(true);
  });

  it('false is not poisoned by adjacent dates', () => {
    // u2 checked in yesterday but not today
    expect(didAllMembersCheckIn(makeGroup({
      memberIds: ['u1', 'u2'],
      checkIns: { u1: { [TODAY]: true }, u2: { [offset(-1)]: true } },
    }), TODAY)).toBe(false);
  });

  it('handles three members', () => {
    expect(didAllMembersCheckIn(makeGroup({
      memberIds: ['u1', 'u2', 'u3'],
      checkIns: {
        u1: { [TODAY]: true },
        u2: { [TODAY]: true },
        u3: { [TODAY]: true },
      },
    }), TODAY)).toBe(true);
  });
});

// ─── getGroupCheckInRate ──────────────────────────────────────────────────────

describe('getGroupCheckInRate', () => {
  it('returns 0 for empty memberIds', () => {
    expect(getGroupCheckInRate(makeGroup({ memberIds: [] }), TODAY)).toBe(0);
  });

  it('returns 0 when no one has checked in', () => {
    expect(getGroupCheckInRate(makeGroup(), TODAY)).toBe(0);
  });

  it('returns 0.5 when half the members checked in', () => {
    expect(getGroupCheckInRate(makeGroup({
      memberIds: ['u1', 'u2'],
      checkIns: { u1: { [TODAY]: true } },
    }), TODAY)).toBe(0.5);
  });

  it('returns 1 when all members checked in', () => {
    expect(getGroupCheckInRate(makeGroup({
      memberIds: ['u1', 'u2'],
      checkIns: { u1: { [TODAY]: true }, u2: { [TODAY]: true } },
    }), TODAY)).toBe(1);
  });

  it('returns correct fraction for 3 members, 2 checked in', () => {
    const rate = getGroupCheckInRate(makeGroup({
      memberIds: ['u1', 'u2', 'u3'],
      checkIns: { u1: { [TODAY]: true }, u2: { [TODAY]: true } },
    }), TODAY);
    expect(rate).toBeCloseTo(2 / 3);
  });
});

// ─── getMemberCheckInStreak ───────────────────────────────────────────────────

describe('getMemberCheckInStreak', () => {
  it('returns 0 for no-challenge group', () => {
    expect(getMemberCheckInStreak(makeGroup({ startDate: '', endDate: '' }), 'u1')).toBe(0);
  });

  it('returns 0 when member has no checkIns', () => {
    expect(getMemberCheckInStreak(makeGroup({ checkIns: {} }), 'u1')).toBe(0);
  });

  it('returns 1 when only today is checked in', () => {
    expect(getMemberCheckInStreak(makeGroup({
      checkIns: { u1: { [TODAY]: true } },
    }), 'u1')).toBe(1);
  });

  it('returns consecutive count going back from today', () => {
    expect(getMemberCheckInStreak(makeGroup({
      checkIns: { u1: { [offset(-3)]: true, [offset(-2)]: true, [offset(-1)]: true, [TODAY]: true } },
    }), 'u1')).toBe(4);
  });

  it('stops at the first gap', () => {
    // Checked in yesterday and today, but not 2 days ago
    expect(getMemberCheckInStreak(makeGroup({
      checkIns: { u1: { [offset(-1)]: true, [TODAY]: true } },
    }), 'u1')).toBe(2);
  });

  it('does not count days before the challenge startDate', () => {
    // Challenge started 3 days ago; member checked in 5 days ago and every day since
    // Streak should cap at 4 (startDate to today inclusive)
    expect(getMemberCheckInStreak(makeGroup({
      startDate: offset(-3),
      endDate: offset(3),
      checkIns: {
        u1: {
          [offset(-5)]: true,
          [offset(-4)]: true,
          [offset(-3)]: true,
          [offset(-2)]: true,
          [offset(-1)]: true,
          [TODAY]: true,
        },
      },
    }), 'u1')).toBe(4);
  });
});

// ─── sortLeaderboard ──────────────────────────────────────────────────────────

describe('sortLeaderboard', () => {
  const makeEntry = (userId: string, xp: number): LeaderboardEntry => ({
    userId,
    displayName: userId,
    avatarUrl: null,
    xpThisCycle: xp,
    rank: 0,
    checkInStreak: 0,
  });

  it('returns empty array for empty input', () => {
    expect(sortLeaderboard([])).toEqual([]);
  });

  it('assigns rank 1 to single entry', () => {
    const result = sortLeaderboard([makeEntry('u1', 100)]);
    expect(result[0].rank).toBe(1);
  });

  it('sorts by xpThisCycle descending', () => {
    const result = sortLeaderboard([
      makeEntry('u1', 50),
      makeEntry('u2', 200),
      makeEntry('u3', 100),
    ]);
    expect(result.map(e => e.userId)).toEqual(['u2', 'u3', 'u1']);
  });

  it('assigns correct sequential ranks', () => {
    const result = sortLeaderboard([
      makeEntry('u1', 300),
      makeEntry('u2', 200),
      makeEntry('u3', 100),
    ]);
    expect(result.map(e => e.rank)).toEqual([1, 2, 3]);
  });

  it('gives tied entries the same rank', () => {
    const result = sortLeaderboard([
      makeEntry('u1', 200),
      makeEntry('u2', 200),
      makeEntry('u3', 100),
    ]);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
    expect(result[2].rank).toBe(3);   // rank 2 skipped due to tie
  });

  it('does not mutate the input array', () => {
    const input = [makeEntry('u1', 50), makeEntry('u2', 200)];
    const original = [...input];
    sortLeaderboard(input);
    expect(input[0].userId).toBe(original[0].userId);
    expect(input[1].userId).toBe(original[1].userId);
  });

  it('handles all tied entries', () => {
    const result = sortLeaderboard([
      makeEntry('u1', 100),
      makeEntry('u2', 100),
      makeEntry('u3', 100),
    ]);
    result.forEach(e => expect(e.rank).toBe(1));
  });
});

// ─── computeEndDate ───────────────────────────────────────────────────────────

describe('computeEndDate', () => {
  it('computes end date for a 7-day challenge', () => {
    expect(computeEndDate('2026-05-13', 7)).toBe('2026-05-19');
  });

  it('computes end date for a 14-day challenge', () => {
    expect(computeEndDate('2026-05-13', 14)).toBe('2026-05-26');
  });

  it('works across month boundaries', () => {
    expect(computeEndDate('2026-05-28', 7)).toBe('2026-06-03');
  });

  it('works across year boundaries', () => {
    expect(computeEndDate('2026-12-28', 7)).toBe('2027-01-03');
  });

  it('returns startDate unchanged for invalid input', () => {
    expect(computeEndDate('not-a-date', 7)).toBe('not-a-date');
  });
});
