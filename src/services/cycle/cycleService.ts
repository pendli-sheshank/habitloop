import {
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getUTCDayKey } from '@/utils/dateUtils';
import { CYCLE_LOG_XP, SYMPTOM_LOG_XP, calcLevelFromXp } from '@/services/fasting/xpEngine';
import { computeAvgCycleLength } from '@/services/cycle/cycleEngine';
import type { CycleLog, SymptomEntry } from '@/types/cycle';
import type { StreakAggregate } from '@/types/auth';

/**
 * Saves a new period start date as a cycleLog document and updates
 * the user's settings with the recalculated average cycle length.
 * Awards CYCLE_LOG_XP to the user's streak aggregate.
 */
export async function savePeriodStart(userId: string, periodStartDate: string): Promise<string> {
  const batch = writeBatch(db);

  const logRef = doc(collection(db, 'cycleLogs'));
  batch.set(logRef, {
    userId,
    periodStartDate,
    periodEndDate: null,
    cycleLength: null,
    symptoms: {},
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', userId, 'settings', 'data'), {
    'cycle.lastPeriodStart': periodStartDate,
  });

  await batch.commit();

  // Recalculate average cycle length from history (best-effort, non-blocking)
  try {
    await recalcAvgCycleLength(userId);
  } catch (e) {
    console.error('[cycleService] recalcAvgCycleLength failed:', e);
  }

  // Award XP (best-effort)
  try {
    await awardCycleXp(userId, CYCLE_LOG_XP);
  } catch (e) {
    console.error('[cycleService] awardCycleXp failed:', e);
  }

  return logRef.id;
}

/**
 * Writes or overwrites the symptom entry for a given date on the most
 * recent cycle log document. Awards SYMPTOM_LOG_XP once per day.
 */
export async function logSymptoms(
  userId: string,
  date: string,
  symptoms: SymptomEntry,
): Promise<void> {
  const latest = await loadLatestCycleLog(userId);
  if (!latest) {
    console.error('[cycleService] logSymptoms: no cycle log found for user');
    return;
  }

  const logRef = doc(db, 'cycleLogs', latest.id);
  await writeBatch(db)
    .update(logRef, { [`symptoms.${date}`]: symptoms })
    .commit();

  // Award XP if this is the first symptom log for this date
  const alreadyLogged = Boolean(latest.symptoms[date]);
  if (!alreadyLogged) {
    try {
      await awardCycleXp(userId, SYMPTOM_LOG_XP);
    } catch (e) {
      console.error('[cycleService] awardCycleXp (symptoms) failed:', e);
    }
  }
}

/**
 * Loads the most recent cycle log for the user.
 * Returns null if no log exists.
 */
export async function loadLatestCycleLog(userId: string): Promise<CycleLog | null> {
  try {
    const q = query(
      collection(db, 'cycleLogs'),
      where('userId', '==', userId),
      orderBy('periodStartDate', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<CycleLog, 'id'>) };
  } catch (e) {
    console.error('[cycleService] loadLatestCycleLog failed:', e);
    return null;
  }
}

/**
 * Loads the last N period-start dates for the user, used for avgCycleLength calc.
 */
export async function loadPeriodHistory(userId: string, count = 6): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'cycleLogs'),
      where('userId', '==', userId),
      orderBy('periodStartDate', 'desc'),
      limit(count),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().periodStartDate as string);
  } catch (e) {
    console.error('[cycleService] loadPeriodHistory failed:', e);
    return [];
  }
}

/**
 * Loads today's symptom entry from the latest cycle log.
 * Returns null if none logged today.
 */
export async function loadTodaySymptoms(userId: string): Promise<SymptomEntry | null> {
  const today = getUTCDayKey(Date.now());
  const latest = await loadLatestCycleLog(userId);
  if (!latest) return null;
  return latest.symptoms[today] ?? null;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function recalcAvgCycleLength(userId: string): Promise<void> {
  const dates = await loadPeriodHistory(userId, 6);
  if (dates.length < 2) return;
  const avg = computeAvgCycleLength(dates);
  await writeBatch(db)
    .update(doc(db, 'users', userId, 'settings', 'data'), {
      'cycle.avgCycleLength': avg,
    })
    .commit();
}

async function awardCycleXp(userId: string, xp: number): Promise<void> {
  const streakRef = doc(db, 'users', userId, 'aggregates', 'streak');
  const snap = await getDoc(streakRef);
  if (!snap.exists()) return;
  const current = snap.data() as StreakAggregate;
  const newXpTotal = current.xpTotal + xp;
  const newLevel = calcLevelFromXp(newXpTotal);
  await writeBatch(db)
    .update(streakRef, { xpTotal: newXpTotal, level: newLevel })
    .commit();
}
