import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type {
  UserProfile,
  UserSettings,
  OnboardingData,
  TodayAggregate,
  StreakAggregate,
} from '@/types/auth';

function mapProfileDoc(data: Record<string, unknown>): UserProfile {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toMillis()
    : (data.createdAt as number ?? Date.now());
  const lastActiveAt = data.lastActiveAt instanceof Timestamp
    ? data.lastActiveAt.toMillis()
    : (data.lastActiveAt as number ?? Date.now());

  return {
    displayName:        data.displayName as string,
    email:              data.email as string,
    photoURL:           data.photoURL as string | null,
    provider:           data.provider as 'email' | 'google',
    onboardingComplete: data.onboardingComplete as boolean,
    expoPushToken:      data.expoPushToken as string | null,
    createdAt,
    lastActiveAt,
  };
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
    return snap.exists() ? mapProfileDoc(snap.data() as Record<string, unknown>) : null;
  } catch (e) {
    console.error('[profileService] loadUserProfile failed:', e);
    return null;
  }
}

// Atomic batch — all 4 documents written or none.
// Idempotent: skips if profile already exists (guards against network retries).
export async function initializeUserProfile(
  uid: string,
  email: string,
  provider: 'email' | 'google'
): Promise<void> {
  const profileRef = doc(db, 'users', uid, 'profile', 'data');
  const existing = await getDoc(profileRef);
  if (existing.exists()) return;

  const todayData: TodayAggregate = {
    date:          '',
    waterMl:       0,
    waterGoalMl:   2000,
    waterGoalMet:  false,
    fastCompleted: false,
    fastProtocol:  null,
  };

  const streakData: StreakAggregate = {
    currentStreakDays:  0,
    longestStreakDays:  0,
    lastStreakDate:     null,
    xpTotal:           0,
    level:             1,
    badgeIds:          [],
  };

  const batch = writeBatch(db);

  batch.set(profileRef, {
    email,
    provider,
    displayName:        '',
    photoURL:           null,
    onboardingComplete: false,
    expoPushToken:      null,
    createdAt:          serverTimestamp(),
    lastActiveAt:       serverTimestamp(),
  });

  batch.set(doc(db, 'users', uid, 'settings', 'data'), {
    defaultProtocol:       '16:8',
    gender:                'female',
    weightKg:              0,
    activityLevel:         'moderate',
    calculatedWaterGoalMl: 2000,
    notifications: {
      fastingReminders:  true,
      hydrationReminders: true,
      socialNudges:      true,
    },
    cycle: {
      lastPeriodStart: null,
      avgCycleLength:  28,
      avgPeriodLength: 5,
    },
    privacy: {
      shareActivityWithGroup:  true,
      anonymousInLeaderboard:  false,
    },
  });

  batch.set(doc(db, 'users', uid, 'aggregates', 'today'), todayData);
  batch.set(doc(db, 'users', uid, 'aggregates', 'streak'), streakData);

  await batch.commit();
}

// Called at the end of onboarding Step 4 — writes collected data atomically.
export async function completeOnboarding(uid: string, data: OnboardingData): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', uid, 'profile', 'data'), {
    displayName:        data.displayName,
    onboardingComplete: true,
    lastActiveAt:       serverTimestamp(),
  });

  batch.update(doc(db, 'users', uid, 'settings', 'data'), {
    defaultProtocol:               data.defaultProtocol,
    gender:                        data.gender,
    weightKg:                      data.weightKg,
    activityLevel:                 data.activityLevel,
    calculatedWaterGoalMl:         data.calculatedWaterGoalMl,
    'cycle.lastPeriodStart':       data.lastPeriodStart,
    'notifications.fastingReminders':   data.notificationsEnabled,
    'notifications.hydrationReminders': data.notificationsEnabled,
  });

  await batch.commit();
}

export async function loadUserSettings(uid: string): Promise<UserSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'data'));
    return snap.exists() ? (snap.data() as UserSettings) : null;
  } catch (e) {
    console.error('[profileService] loadUserSettings failed:', e);
    return null;
  }
}

export async function updateUserSettings(
  uid: string,
  updates: Partial<UserSettings>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'settings', 'data'), updates as Record<string, unknown>);
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'expoPushToken'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), updates as Record<string, unknown>);
}

// Deletes all Firestore data for a user.
// Must succeed before the Firebase Auth account is deleted (enforced in authService.deleteAccount).
export async function deleteAllUserData(uid: string): Promise<void> {
  // Delete the user document tree
  const treeBatch = writeBatch(db);
  treeBatch.delete(doc(db, 'users', uid, 'profile',    'data'));
  treeBatch.delete(doc(db, 'users', uid, 'settings',   'data'));
  treeBatch.delete(doc(db, 'users', uid, 'aggregates', 'today'));
  treeBatch.delete(doc(db, 'users', uid, 'aggregates', 'streak'));
  await treeBatch.commit();

  // Delete top-level log collections (MVP scale — no Cloud Function needed yet)
  const [fastSnap, waterSnap] = await Promise.all([
    getDocs(query(collection(db, 'fastSessions'), where('userId', '==', uid))),
    getDocs(query(collection(db, 'waterEvents'),  where('userId', '==', uid))),
  ]);

  if (fastSnap.empty && waterSnap.empty) return;

  const logBatch = writeBatch(db);
  fastSnap.docs.forEach(d => logBatch.delete(d.ref));
  waterSnap.docs.forEach(d => logBatch.delete(d.ref));
  await logBatch.commit();
}
