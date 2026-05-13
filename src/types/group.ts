import type { FastingProtocol } from '@/types/fasting';

// ─── Core group document (mirrors Firestore groups/{groupId}) ─────────────────

export interface Group {
  id: string;
  name: string;
  createdBy: string;                              // userId
  memberIds: string[];
  challengeProtocol: FastingProtocol;
  startDate: string;                              // ISO date YYYY-MM-DD
  endDate: string;                                // ISO date YYYY-MM-DD
  durationDays: 7 | 14;
  streakCount: number;                            // consecutive days all members checked in
  frozenDays: string[];                           // YYYY-MM-DD keys where streak was frozen
  checkIns: Record<string, Record<string, boolean>>; // userId → date → checked in
  leaderboard: LeaderboardEntry[];
  createdAt: number;                              // Unix ms
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xpThisCycle: number;
  rank: number;                                   // 1-based, computed client-side
  checkInStreak: number;                          // consecutive days checked in this challenge
}

// ─── Check-in feed ────────────────────────────────────────────────────────────

/** Map of userId → true/false for a single date — used in the check-in feed */
export type DailyCheckInMap = Record<string, boolean>;

export interface CheckInFeedEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  checkedIn: boolean;
  date: string;                                   // YYYY-MM-DD
}

// ─── Group creation input ─────────────────────────────────────────────────────

export interface CreateGroupInput {
  name: string;
  protocol: FastingProtocol;
  durationDays: 7 | 14;
  startDate: string;                              // ISO date YYYY-MM-DD
}

// ─── Challenge status — derived, never stored ─────────────────────────────────

export type ChallengeStatus =
  | 'upcoming'    // startDate is in the future
  | 'active'      // today is between startDate and endDate (inclusive)
  | 'complete'    // endDate has passed
  | 'no-challenge'; // group has no challenge configured yet

// ─── Social notification types ────────────────────────────────────────────────

export type SocialNotificationType =
  | 'partner-nudge'         // partner hasn't started fasting by noon
  | 'challenge-start'       // group challenge begins today
  | 'streak-freeze-warning' // a member missed a day — streak frozen 24h

export interface SocialNotificationPayload {
  type: SocialNotificationType;
  groupId: string;
  groupName: string;
  targetUserId?: string;     // for partner-nudge only
}

// ─── Member display info (loaded separately from Firestore user profiles) ─────

export interface GroupMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  checkedInToday: boolean;
}
