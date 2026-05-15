import { doc, collection, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getUTCDayKey, getYesterdayKey } from '@/utils/dateUtils';
import { calculateXpReward } from '@/services/fasting/fastingEngine';
import { calcStreakBonusXp, calcLevelFromXp } from '@/services/fasting/xpEngine';
import type { FastSession, FastCompletionResult } from '@/types/fasting';
import type { StreakAggregate } from '@/types/auth';

export { calcStreakBonusXp, calcLevelFromXp } from '@/services/fasting/xpEngine';

export function updateStreak(
  currentStreak: number,
  lastStreakDate: string | null,
  sessionDate: string,
): { newStreak: number; newLastDate: string } {
  if (lastStreakDate === sessionDate) {
    return { newStreak: currentStreak, newLastDate: lastStreakDate };
  }

  const yesterday = getYesterdayKey(Date.now());
  const isConsecutive = lastStreakDate === yesterday;
  const newStreak = isConsecutive ? currentStreak + 1 : 1;

  return { newStreak, newLastDate: sessionDate };
}

export async function recordFastCompletion(
  userId: string,
  session: FastSession,
): Promise<FastCompletionResult> {
  const streakRef = doc(db, 'users', userId, 'aggregates', 'streak');
  const snap = await getDoc(streakRef);

  const current: StreakAggregate = snap.exists()
    ? (snap.data() as StreakAggregate)
    : {
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastStreakDate: null,
        xpTotal: 0,
        level: 1,
        badgeIds: [],
      };

  const sessionDate = getUTCDayKey(session.endTime ?? Date.now());
  const { newStreak, newLastDate } = updateStreak(
    current.currentStreakDays,
    current.lastStreakDate,
    sessionDate,
  );

  const fastXp = calculateXpReward(session.protocol);
  const bonusXp = calcStreakBonusXp(newStreak);
  const totalXpEarned = fastXp + bonusXp;
  const newXpTotal = current.xpTotal + totalXpEarned;
  const newLongest = Math.max(current.longestStreakDays, newStreak);
  const newLevel = calcLevelFromXp(newXpTotal);

  const batch = writeBatch(db);

  const sessionRef = doc(collection(db, 'fastSessions'));
  batch.set(sessionRef, {
    userId,
    startTime: session.startTime,
    endTime: session.endTime,
    targetDurationMs: session.targetDurationMs,
    protocol: session.protocol,
    completed: true,
    xpEarned: fastXp,
    cyclePhaseAtStart: session.cyclePhaseAtStart,
    createdAt: serverTimestamp(),
  });

  batch.update(streakRef, {
    currentStreakDays: newStreak,
    longestStreakDays: newLongest,
    lastStreakDate: newLastDate,
    xpTotal: newXpTotal,
    level: newLevel,
  });

  const todayRef = doc(db, 'users', userId, 'aggregates', 'today');
  batch.update(todayRef, {
    date: sessionDate,
    fastCompleted: true,
    fastProtocol: session.protocol,
  });

  await batch.commit();

  return {
    xpEarned: fastXp,
    bonusXp,
    streakMultiplier: 1,
    newStreak,
    longestStreak: newLongest,
  };
}
