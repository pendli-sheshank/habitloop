import {
  doc,
  collection,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getUTCDayKey } from '@/utils/dateUtils';
import { HYDRATION_GOAL_XP, calcLevelFromXp } from '@/services/fasting/xpEngine';
import type { StreakAggregate, TodayAggregate } from '@/types/auth';

export async function saveWaterEvent(
  userId: string,
  amountMl: number,
  goalMl: number,
  newTotalMl: number,
  goalMet: boolean,
): Promise<void> {
  const now = Date.now();
  const date = getUTCDayKey(now);

  const batch = writeBatch(db);

  const eventRef = doc(collection(db, 'waterEvents'));
  batch.set(eventRef, {
    userId,
    date,
    ml: amountMl,
    loggedAt: now,
    createdAt: serverTimestamp(),
  });

  const todayRef = doc(db, 'users', userId, 'aggregates', 'today');
  batch.update(todayRef, {
    date,
    waterMl: newTotalMl,
    waterGoalMl: goalMl,
    waterGoalMet: goalMet,
  });

  await batch.commit();
}

export async function awardHydrationXp(userId: string): Promise<void> {
  const streakRef = doc(db, 'users', userId, 'aggregates', 'streak');
  const snap = await getDoc(streakRef);
  if (!snap.exists()) return;

  const current = snap.data() as StreakAggregate;
  const newXpTotal = current.xpTotal + HYDRATION_GOAL_XP;
  const newLevel = calcLevelFromXp(newXpTotal);

  await writeBatch(db)
    .update(streakRef, { xpTotal: newXpTotal, level: newLevel })
    .commit();
}

export async function loadTodayWater(
  userId: string,
): Promise<{ waterMl: number; waterGoalMl: number; waterGoalMet: boolean; date: string } | null> {
  const todayRef = doc(db, 'users', userId, 'aggregates', 'today');
  const snap = await getDoc(todayRef);
  if (!snap.exists()) return null;

  const data = snap.data() as TodayAggregate;
  const today = getUTCDayKey(Date.now());

  if (data.date !== today) return null;

  return {
    waterMl: data.waterMl,
    waterGoalMl: data.waterGoalMl,
    waterGoalMet: data.waterGoalMet,
    date: data.date,
  };
}
