import { differenceInDays, parseISO, isValid } from 'date-fns';
import type { Group, LeaderboardEntry, ChallengeStatus } from '@/types/group';

// ─── Challenge status ─────────────────────────────────────────────────────────

export function getChallengeStatus(group: Group): ChallengeStatus {
  const today = todayISO();
  if (!group.startDate || !group.endDate) return 'no-challenge';
  if (today < group.startDate) return 'upcoming';
  if (today > group.endDate) return 'complete';
  return 'active';
}

export function isChallengeActive(group: Group): boolean {
  return getChallengeStatus(group) === 'active';
}

export function isChallengeOver(group: Group): boolean {
  return getChallengeStatus(group) === 'complete';
}

/**
 * Days remaining INCLUDING today. Returns 0 when the challenge is over or
 * not yet started.
 */
export function daysRemainingInChallenge(group: Group): number {
  if (getChallengeStatus(group) !== 'active') return 0;
  const end = parseISO(group.endDate);
  const now = parseISO(todayISO());
  return Math.max(0, differenceInDays(end, now) + 1);
}

/**
 * Day number within the challenge (1-based). Returns null when not active.
 */
export function challengeDayNumber(group: Group): number | null {
  if (getChallengeStatus(group) !== 'active') return null;
  const start = parseISO(group.startDate);
  const today = parseISO(todayISO());
  return differenceInDays(today, start) + 1;
}

// ─── Streak + freeze ──────────────────────────────────────────────────────────

export function isStreakFrozen(group: Group, date: string): boolean {
  return (group.frozenDays ?? []).includes(date);
}

/**
 * True when every member checked in on the given date.
 */
export function didAllMembersCheckIn(group: Group, date: string): boolean {
  const memberIds = group.memberIds ?? [];
  if (memberIds.length === 0) return false;
  const checkIns = group.checkIns ?? {};
  return memberIds.every(uid => checkIns[uid]?.[date] === true);
}

/**
 * Fraction of members who checked in on a given date (0–1).
 */
export function getGroupCheckInRate(group: Group, date: string): number {
  const memberIds = group.memberIds ?? [];
  if (memberIds.length === 0) return 0;
  const checkIns = group.checkIns ?? {};
  const count = memberIds.filter(uid => checkIns[uid]?.[date] === true).length;
  return count / memberIds.length;
}

/**
 * Consecutive days (going back from today) that a member has checked in
 * within the current challenge window. Returns 0 if none.
 */
export function getMemberCheckInStreak(group: Group, userId: string): number {
  if (getChallengeStatus(group) === 'no-challenge') return 0;

  const start = parseISO(group.startDate);
  const today = parseISO(todayISO());
  const windowEnd = parseISO(group.endDate);

  // Start counting back from the later of today or endDate
  const countFrom = today > windowEnd ? windowEnd : today;
  const memberCheckIns = (group.checkIns ?? {})[userId] ?? {};

  let streak = 0;
  let cursor = countFrom;

  while (cursor >= start) {
    const key = cursor.toISOString().slice(0, 10);
    if (!memberCheckIns[key]) break;
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return streak;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Sorts entries by xpThisCycle descending and stamps 1-based rank.
 * Ties share the same rank; the next rank skips accordingly.
 */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => b.xpThisCycle - a.xpThisCycle);
  let rank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && sorted[i].xpThisCycle < sorted[i - 1].xpThisCycle) {
      rank = i + 1;
    }
    return { ...entry, rank };
  });
}

/**
 * Computes end date string from a start date + duration.
 */
export function computeEndDate(startDateISO: string, durationDays: 7 | 14): string {
  const start = parseISO(startDateISO);
  if (!isValid(start)) return startDateISO;
  const end = new Date(start.getTime() + (durationDays - 1) * 86_400_000);
  return end.toISOString().slice(0, 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
