import {
  doc,
  collection,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
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

export interface DailyWaterSummary {
  date: string;
  totalMl: number;
  goalMl: number;
  goalMet: boolean;
}

/**
 * Loads per-day water totals for the past `days` days by summing waterEvent
 * documents. Groups by UTC day key on the client side.
 */
export async function loadWaterHistory(
  userId: string,
  days = 30,
): Promise<DailyWaterSummary[]> {
  try {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, 'waterEvents'),
      where('userId', '==', userId),
      where('loggedAt', '>=', cutoff),
      orderBy('loggedAt', 'asc'),
      limit(days * 20),  // at most 20 events per day
    );
    const snap = await getDocs(q);

    const byDay = new Map<string, { totalMl: number; goalMl: number }>();
    snap.docs.forEach(d => {
      const ev = d.data() as { date: string; ml: number; goalMl?: number };
      const existing = byDay.get(ev.date) ?? { totalMl: 0, goalMl: ev.goalMl ?? 0 };
      byDay.set(ev.date, {
        totalMl: existing.totalMl + ev.ml,
        goalMl: ev.goalMl ?? existing.goalMl,
      });
    });

    return Array.from(byDay.entries())
      .map(([date, { totalMl, goalMl }]) => ({
        date,
        totalMl,
        goalMl,
        goalMet: goalMl > 0 && totalMl >= goalMl,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error('[waterService] loadWaterHistory failed:', e);
    return [];
  }
}
