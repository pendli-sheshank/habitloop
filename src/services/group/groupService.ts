import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { computeEndDate, sortLeaderboard, didAllMembersCheckIn } from '@/services/group/groupEngine';
import type { Group, LeaderboardEntry, DailyCheckInMap, CreateGroupInput, GroupMember } from '@/types/group';

// ─── Group CRUD ───────────────────────────────────────────────────────────────

/**
 * Creates a new group and returns its Firestore ID.
 * The creator is automatically added as the first member.
 */
export async function createGroup(
  userId: string,
  input: CreateGroupInput,
): Promise<string> {
  const groupRef = doc(collection(db, 'groups'));
  const endDate = computeEndDate(input.startDate, input.durationDays);

  const group: Omit<Group, 'id'> = {
    name: input.name,
    createdBy: userId,
    memberIds: [userId],
    challengeProtocol: input.protocol,
    startDate: input.startDate,
    endDate,
    durationDays: input.durationDays,
    streakCount: 0,
    frozenDays: [],
    checkIns: {},
    leaderboard: [],
    createdAt: Date.now(),
  };

  await setDoc(groupRef, { ...group, createdAt: serverTimestamp() });
  return groupRef.id;
}

/**
 * Adds a user to an existing group's memberIds.
 */
export async function joinGroup(userId: string, groupId: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayUnion(userId),
  });
}

/**
 * Removes a user from a group. The creator cannot leave their own group.
 */
export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return;
  const group = snap.data() as Omit<Group, 'id'>;
  if (group.createdBy === userId) {
    throw new Error('Group creator cannot leave. Delete the group instead.');
  }
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayRemove(userId),
  });
}

/**
 * Loads all groups the user is a member of.
 */
export async function loadUserGroups(userId: string): Promise<Group[]> {
  try {
    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', userId),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
  } catch (e) {
    console.error('[groupService] loadUserGroups failed:', e);
    return [];
  }
}

/**
 * Loads a single group by ID. Returns null if not found.
 */
export async function loadGroup(groupId: string): Promise<Group | null> {
  try {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Group, 'id'>) };
  } catch (e) {
    console.error('[groupService] loadGroup failed:', e);
    return null;
  }
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

/**
 * Marks a user as checked in for today in the given group.
 * If this check-in causes all members to be checked in, increments streakCount.
 * Idempotent — calling twice on the same date has no additional effect.
 */
export async function submitCheckIn(
  userId: string,
  groupId: string,
  date: string,
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) throw new Error(`Group ${groupId} not found`);

  const group: Group = { id: groupId, ...(snap.data() as Omit<Group, 'id'>) };

  // Already checked in — idempotent
  if (group.checkIns[userId]?.[date] === true) return;

  const batch = writeBatch(db);

  batch.update(groupRef, {
    [`checkIns.${userId}.${date}`]: true,
  });

  // Check if this check-in completes the full group for the day
  const updatedGroup: Group = {
    ...group,
    checkIns: {
      ...group.checkIns,
      [userId]: { ...(group.checkIns[userId] ?? {}), [date]: true },
    },
  };

  if (didAllMembersCheckIn(updatedGroup, date)) {
    batch.update(groupRef, { streakCount: group.streakCount + 1 });
  }

  await batch.commit();
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Returns the sorted leaderboard for a group, enriched with rank.
 * Reads directly from the group document's leaderboard array.
 */
export async function loadLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  try {
    const group = await loadGroup(groupId);
    if (!group) return [];
    return sortLeaderboard(group.leaderboard ?? []);
  } catch (e) {
    console.error('[groupService] loadLeaderboard failed:', e);
    return [];
  }
}

/**
 * Upserts a user's XP entry on the group leaderboard.
 * Called after a fast is completed within an active challenge.
 */
export async function updateLeaderboardXp(
  userId: string,
  groupId: string,
  xpToAdd: number,
  displayName: string,
  avatarUrl: string | null,
  checkInStreak: number,
): Promise<void> {
  const group = await loadGroup(groupId);
  if (!group) return;

  const existing = group.leaderboard.find(e => e.userId === userId);
  const updatedEntry: LeaderboardEntry = {
    userId,
    displayName,
    avatarUrl,
    xpThisCycle: (existing?.xpThisCycle ?? 0) + xpToAdd,
    rank: 0,       // re-ranked on read via sortLeaderboard
    checkInStreak,
  };

  const filtered = group.leaderboard.filter(e => e.userId !== userId);
  const newLeaderboard = [...filtered, updatedEntry];

  await updateDoc(doc(db, 'groups', groupId), { leaderboard: newLeaderboard });
}

// ─── Check-in feed ────────────────────────────────────────────────────────────

/**
 * Returns a map of userId → checkedIn for a given date.
 */
export async function loadCheckInFeed(
  groupId: string,
  date: string,
): Promise<DailyCheckInMap> {
  try {
    const group = await loadGroup(groupId);
    if (!group) return {};
    return Object.fromEntries(
      group.memberIds.map(uid => [uid, group.checkIns[uid]?.[date] === true]),
    );
  } catch (e) {
    console.error('[groupService] loadCheckInFeed failed:', e);
    return {};
  }
}

// ─── Member display info ──────────────────────────────────────────────────────

/**
 * Loads display info for all members of a group by reading their profile docs.
 * Best-effort — missing profiles are omitted rather than thrown.
 */
export async function loadGroupMembers(
  group: Group,
  date: string,
): Promise<GroupMember[]> {
  const results = await Promise.allSettled(
    (group.memberIds ?? []).map(async (uid): Promise<GroupMember> => {
      const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
      const data = snap.exists() ? snap.data() : {};
      return {
        userId: uid,
        displayName: (data.displayName as string | undefined) ?? 'Member',
        avatarUrl: (data.photoURL as string | null | undefined) ?? null,
        isCreator: uid === group.createdBy,
        checkedInToday: group.checkIns[uid]?.[date] === true,
      };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<GroupMember> => r.status === 'fulfilled')
    .map(r => r.value);
}
