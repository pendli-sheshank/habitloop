import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { calculateXpReward } from '@/services/fasting/fastingEngine';
import type { ActiveFastState, FastSession } from '@/types/fasting';

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
  const today = new Date().toISOString().slice(0, 10);

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
