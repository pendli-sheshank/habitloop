import {
  doc,
  collection,
  writeBatch,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  getDocs,
  query,
  where,
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
  streakMultiplier = 1,
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
    streakMultiplier,
    cyclePhaseAtStart: null,
    createdAt: now,
  };
}

export async function saveFastSession(
  userId: string,
  activeFast: ActiveFastState,
  completed: boolean,
  streakMultiplier = 1,
): Promise<void> {
  const session = buildFastSession(userId, activeFast, completed, streakMultiplier);
  const today = getUTCDayKey(Date.now());

  const batch = writeBatch(db);

  const sessionRef = doc(collection(db, 'fastSessions'));
  batch.set(sessionRef, {
    ...session,
    createdAt: serverTimestamp(),
  });

  if (completed) {
    const todayRef = doc(db, 'users', userId, 'aggregates', 'today');
    batch.set(todayRef, {
      date: today,
      fastCompleted: true,
      fastProtocol: activeFast.protocol,
    }, { merge: true });
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
  await setDoc(streakRef, {
    currentStreakDays: result.newStreak,
    longestStreakDays: result.longestStreak,
    lastStreakDate: today,
    xpTotal: increment(totalXpEarned),
    level: newLevel,
  }, { merge: true });
}

/** Load the most recent `maxCount` completed fast sessions for a user. */
export async function loadFastHistory(
  userId: string,
  maxCount = 90,
): Promise<FastSession[]> {
  try {
    // Single equality filter avoids the composite index requirement.
    // Filtering and sorting happen client-side.
    const q = query(
      collection(db, 'fastSessions'),
      where('userId', '==', userId),
      limit(maxCount * 3),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<FastSession, 'id'>) }))
      .filter(s => s.completed)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, maxCount);
  } catch (e) {
    console.error('[fastingService] loadFastHistory failed:', e);
    return [];
  }
}
