import {
  doc,
  collection,
  writeBatch,
  updateDoc,
  increment,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { calculateXpReward } from '@/services/fasting/fastingEngine';
import { calcLevelFromXp } from '@/services/fasting/xpEngine';
import { getUTCDayKey } from '@/utils/dateUtils';
import type { ActiveFastState, FastSession, FastCompletionResult } from '@/types/fasting';

export function buildFastSession(
  userId: string,
  activeFast: ActiveFastState,
  completed: boolean,
): Omit<FastSession, 'id'> {
  const now = Date.now();
  return {
    userId,
    startTime: activeFast.startTime,
    endTime: now,
    targetDurationMs: activeFast.targetDurationMs,
    protocol: activeFast.protocol,
    completed,
    xpEarned: completed ? calculateXpReward(activeFast.protocol) : 0,
    cyclePhaseAtStart: null,
    createdAt: now,
  };
}

export async function saveFastSession(
  userId: string,
  activeFast: ActiveFastState,
  completed: boolean,
): Promise<void> {
  const session = buildFastSession(userId, activeFast, completed);
  const today = getUTCDayKey(Date.now());

  const batch = writeBatch(db);

  const sessionRef = doc(collection(db, 'fastSessions'));
  batch.set(sessionRef, {
    ...session,
    createdAt: serverTimestamp(),
  });

  if (completed) {
    const todayRef = doc(db, 'users', userId, 'aggregates', 'today');
    batch.update(todayRef, {
      date: today,
      fastCompleted: true,
      fastProtocol: activeFast.protocol,
    });
  }

  await batch.commit();
}

/**
 * Writes the streak and XP aggregate after a fast is saved.
 * Must be called after saveFastSession succeeds — kept separate so
 * a streak write failure does not roll back the session log.
 */
export async function persistFastCompletion(
  userId: string,
  result: FastCompletionResult,
  currentXpTotal: number,
): Promise<void> {
  const today = getUTCDayKey(Date.now());
  const totalXpEarned = result.xpEarned + result.bonusXp;
  const newXpTotal = currentXpTotal + totalXpEarned;
  const newLevel = calcLevelFromXp(newXpTotal);

  const streakRef = doc(db, 'users', userId, 'aggregates', 'streak');
  await updateDoc(streakRef, {
    currentStreakDays: result.newStreak,
    longestStreakDays: result.longestStreak,
    lastStreakDate: today,
    xpTotal: increment(totalXpEarned),
    level: newLevel,
  });
}

/** Load the most recent `maxCount` completed fast sessions for a user. */
export async function loadFastHistory(
  userId: string,
  maxCount = 90,
): Promise<FastSession[]> {
  try {
    const q = query(
      collection(db, 'fastSessions'),
      where('userId', '==', userId),
      where('completed', '==', true),
      orderBy('startTime', 'desc'),
      limit(maxCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FastSession, 'id'>) }));
  } catch (e) {
    console.error('[fastingService] loadFastHistory failed:', e);
    return [];
  }
}
