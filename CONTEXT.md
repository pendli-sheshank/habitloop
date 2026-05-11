# CONTEXT.md — HabitLoop
> Claude Code project context. Read this alongside SKILLS.md before every session.
> This file defines WHAT to build — product decisions, architecture, and module specs.
> For HOW to build it — patterns, code templates, and conventions — see SKILLS.md.

---

## 1. Product Definition

HabitLoop is a mobile habit system combining:
- Intermittent fasting — timer-based, protocol-driven, streak-tracked
- Hydration tracking — one-tap logging with weather-adjusted daily goals
- Menstrual cycle-aware recommendations — fasting adapts to hormonal phase

Core differentiator: fasting adapts based on the user's hormonal cycle phase.
No other MVP-level product does this.

Tagline: "Built around real-life habits and women's health."

---

## 2. Tech Stack Quick Reference

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native + Expo SDK 53 | Cross-platform, managed workflow, EAS CI/CD |
| Navigation | Expo Router v5 (file-based) | Native tabs, deep linking, auth gate |
| Language | TypeScript 5 (strict) | Type safety across all stores, services, components |
| State local | Zustand 5 + persist middleware | 2.7KB, no boilerplate, persists to AsyncStorage |
| State server | TanStack Query | Firestore fetch/cache for social feeds |
| UI | react-native-paper (MD3) | Material Design 3 with custom purple theme |
| Timer UI | react-native-countdown-circle-timer | SVG, requestAnimationFrame, color transitions |
| Progress rings | react-native-circular-progress | Hydration ring, XP ring |
| Animation | react-native-reanimated 3 | 60fps native thread for badges, celebrations |
| Backend | Firebase Auth + Firestore + FCM | Free tier sufficient for MVP scale |
| Notifications | expo-notifications + expo-task-manager | Local scheduled + remote push |
| Cycle engine | Cyclia (npm) + custom phase logic | Cycle predictions from date history |
| Weather | Open-Meteo REST API (free, no key) | Temperature + humidity for hydration goal |
| Persistence | @react-native-async-storage/async-storage | Offline-first for all Zustand stores |
| Dates | date-fns | Phase math, streak calc, eating window prediction |
| Testing | Jest + @testing-library/react-native | Unit tests for stores and services |

---

## 3. Current Phase

Active: Phase 1 (MVP Core) — Fasting Engine + Water Tracker + Notifications + Streaks + XP

```
Phase 1   -> Fasting timer, water tracker, local notifications, streak + basic XP   [Weeks 1-8]
Phase 1B  -> Menstrual cycle module, phase-based recommendations, symptom logging    [Weeks 9-14]
Phase 2   -> Friend groups, Sync Fasting Challenges, leaderboard, check-in feed     [Weeks 15-22]
Phase 3   -> AI meal suggestions, hormone coaching, RevenueCat paywall, analytics    [Weeks 23+]
```

---

## 4. Authentication & Authorization System

This section is the foundation of the entire app. No feature works correctly without it.
Every Firestore write, every streak, every fast session is scoped to an authenticated user.

---

### 4.1 Auth Methods

| Method | Phase | Notes |
|---|---|---|
| Email + Password | Phase 1 | Primary sign-up method |
| Google OAuth | Phase 1 | Secondary — one-tap sign-in |
| Apple Sign-In | Phase 2 | Required for iOS App Store if any OAuth is offered |
| Guest / Anonymous | NOT supported | All data must be user-owned — no anonymous sessions |

---

### 4.2 Auth State Model

Auth state has exactly four possible values. Every screen decision flows from this.

```
UNKNOWN       -> app just launched, Firebase SDK is resolving persisted session
UNAUTHENTICATED -> no valid session, user must sign in
NEEDS_ONBOARDING -> authenticated but profile document not yet initialized
AUTHENTICATED -> authenticated + profile exists + onboarding complete
```

```typescript
// src/types/auth.ts
export type AuthStatus =
  | 'unknown'
  | 'unauthenticated'
  | 'needs-onboarding'
  | 'authenticated';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'email' | 'google';
  createdAt: number;        // Unix ms
}
```

---

### 4.3 useUserStore — Auth State Store

```
Holds:
  authStatus: AuthStatus
  user: AuthUser | null
  profile: UserProfile | null    <- loaded from Firestore after login
  isPremium: boolean             <- always false in Phase 1

Does NOT hold:
  Firebase Auth object           <- never store raw Firebase objects
  password or credentials        <- never store
  raw Firestore DocumentSnapshot <- always map to typed interfaces
```

```typescript
// src/stores/user/useUserStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthStatus, AuthUser, UserProfile } from '@/types/auth';

interface UserState {
  authStatus: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  isPremium: boolean;

  setAuthStatus: (status: AuthStatus) => void;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      authStatus: 'unknown',
      user: null,
      profile: null,
      isPremium: false,

      setAuthStatus: (authStatus) => set({ authStatus }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      clearAuth: () => set({
        authStatus: 'unauthenticated',
        user: null,
        profile: null,
      }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

### 4.4 Auth Listener — Wire Once in Root Layout

The Firebase `onAuthStateChanged` listener is the single source of truth for auth state.
It is wired ONCE in `app/_layout.tsx` and updates the Zustand store.

```typescript
// app/_layout.tsx — auth listener wiring
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useUserStore } from '@/stores/user/useUserStore';
import { loadUserProfile } from '@/services/auth/profileService';

export default function RootLayout() {
  const { setAuthStatus, setUser, setProfile, clearAuth } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        return;
      }

      // User is authenticated — map to typed AuthUser
      const user: AuthUser = {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL:    firebaseUser.photoURL,
        provider:    firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
        createdAt:   Date.now(),
      };
      setUser(user);

      // Check if profile document exists in Firestore
      const profile = await loadUserProfile(firebaseUser.uid);
      if (!profile) {
        setAuthStatus('needs-onboarding');   // first-ever login
      } else {
        setProfile(profile);
        setAuthStatus('authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  // ... rest of layout
}
```

---

### 4.5 Route Protection with Expo Router

The app uses a single root Stack with conditional routing based on `authStatus`.

```
authStatus === 'unknown'           -> show SplashScreen (do not navigate)
authStatus === 'unauthenticated'   -> redirect to (auth)/sign-in
authStatus === 'needs-onboarding'  -> redirect to (auth)/onboarding
authStatus === 'authenticated'     -> show (tabs)/
```

```typescript
// app/_layout.tsx — route guard
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useUserStore } from '@/stores/user/useUserStore';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const authStatus = useUserStore(s => s.authStatus);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authStatus === 'unknown') return;  // wait for Firebase to resolve

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (authStatus === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (authStatus === 'needs-onboarding' && segments[1] !== 'onboarding') {
      router.replace('/(auth)/onboarding');
    } else if (authStatus === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)/');
    }
  }, [authStatus, segments]);

  if (authStatus === 'unknown') {
    return <SplashScreen />;   // Firebase still resolving — show nothing
  }

  return <>{children}</>;
}
```

**Rule:** Never redirect inside a screen component. All auth-based navigation lives in `RouteGuard` only.

---

### 4.6 User Registration Flow (New Account)

This is the exact sequence for a new user. Every step must complete before the next begins.

```
STEP 1 — CREDENTIAL CREATION
  Firebase Auth creates the account (email/password or Google)
  Firebase returns a uid

STEP 2 — FIRESTORE PROFILE INITIALIZATION
  Write users/{uid}/profile document with display data
  Write users/{uid}/settings document with defaults
  Write users/{uid}/aggregates/today document (zeroed)
  Write users/{uid}/aggregates/streak document (zeroed)
  All four writes happen in a Firestore batch — atomic

STEP 3 — AUTH STATE UPDATE
  onAuthStateChanged fires -> loadUserProfile returns null (doc just created)
  authStatus set to 'needs-onboarding'
  RouteGuard redirects to /(auth)/onboarding

STEP 4 — ONBOARDING (4 screens)
  Screen 1: Display name + avatar (optional)
  Screen 2: Weight + activity level -> calculates default water goal
  Screen 3: Default fasting protocol selection (12:12 / 14:10 / 16:8)
  Screen 4: Cycle start date (optional — can skip, enables Phase 1B features)
             + notification permission request

STEP 5 — ONBOARDING COMPLETE
  Write collected data to users/{uid}/settings
  Set onboardingComplete: true on users/{uid}/profile
  Register Expo push token -> save to users/{uid}/profile.expoPushToken
  authStatus set to 'authenticated'
  RouteGuard redirects to /(tabs)/
```

---

### 4.7 Sign-In Flow (Returning User)

```
STEP 1 — CREDENTIAL VALIDATION
  Firebase Auth validates email+password OR Google token

STEP 2 — AUTH STATE UPDATE
  onAuthStateChanged fires
  loadUserProfile called with uid

STEP 3 — PROFILE LOAD
  Profile document exists -> setProfile(profile) -> authStatus = 'authenticated'
  Profile missing (edge case) -> authStatus = 'needs-onboarding'

STEP 4 — STORE HYDRATION
  useFastingStore._hydrate() called — restores active session if one exists
  useWaterStore loads today's water log from Firestore

STEP 5 — REDIRECT
  RouteGuard sends user to /(tabs)/
```

---

### 4.8 Onboarding Screens (4 Steps)

```typescript
// src/types/auth.ts — onboarding data shape
export interface OnboardingData {
  displayName: string;
  weightKg: number;
  activityLevel: 'low' | 'moderate' | 'high';
  defaultProtocol: '12:12' | '14:10' | '16:8';
  lastPeriodStart: string | null;    // ISO date, null if skipped
  notificationsEnabled: boolean;
}
```

| Step | Screen | Required | Fields |
|---|---|---|---|
| 1 | Welcome / Name | Yes | displayName (pre-filled from Google if OAuth) |
| 2 | Body Stats | Yes | weightKg, activityLevel |
| 3 | Fasting Protocol | Yes | defaultProtocol (visual cards with time rings) |
| 4 | Cycle + Notifications | Optional | lastPeriodStart (skippable), notification permission |

Rules:
- Steps 1-3 cannot be skipped — they provide data required for core features
- Step 4 cycle input is skippable — user can add it later from settings
- Progress is NOT saved to Firestore until the user taps "Get Started" on Step 4
- If the user force-quits during onboarding, they return to onboarding on next launch

---

### 4.9 Profile Document — Full Firestore Shape

```
users/{uid}/profile
  displayName: string
  email: string
  photoURL: string | null
  provider: 'email' | 'google'
  onboardingComplete: boolean
  createdAt: Timestamp
  lastActiveAt: Timestamp
  expoPushToken: string | null

users/{uid}/settings
  defaultProtocol: '12:12' | '14:10' | '16:8' | 'custom'
  weightKg: number
  activityLevel: 'low' | 'moderate' | 'high'
  calculatedWaterGoalMl: number      <- pre-computed, refreshed on weight/activity change
  notifications:
    fastingReminders: boolean        <- default true
    hydrationReminders: boolean      <- default true
    socialNudges: boolean            <- default true (Phase 2)
  cycle:
    lastPeriodStart: string | null   <- ISO date
    avgCycleLength: number           <- default 28
    avgPeriodLength: number          <- default 5
  privacy:
    shareActivityWithGroup: boolean  <- default true (Phase 2)
    anonymousInLeaderboard: boolean  <- default false (Phase 2)
```

---

### 4.10 Profile Service — All Auth Operations

```typescript
// src/services/auth/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  deleteUser,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/services/firebase';

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signOutUser() {
  await signOut(auth);
}

export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  // Delete Firestore data first, then delete auth account
  await deleteAllUserData(user.uid);
  await deleteUser(user);
}
```

```typescript
// src/services/auth/profileService.ts
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, OnboardingData } from '@/types/auth';

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// Called once — atomic batch write at the end of registration
export async function initializeUserProfile(uid: string, email: string, provider: 'email' | 'google') {
  const batch = writeBatch(db);

  batch.set(doc(db, 'users', uid, 'profile', 'data'), {
    email,
    provider,
    onboardingComplete: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    expoPushToken: null,
    displayName: '',
    photoURL: null,
  });

  batch.set(doc(db, 'users', uid, 'settings', 'data'), {
    defaultProtocol: '16:8',
    weightKg: 0,
    activityLevel: 'moderate',
    calculatedWaterGoalMl: 2000,
    notifications: { fastingReminders: true, hydrationReminders: true, socialNudges: true },
    cycle: { lastPeriodStart: null, avgCycleLength: 28, avgPeriodLength: 5 },
    privacy: { shareActivityWithGroup: true, anonymousInLeaderboard: false },
  });

  batch.set(doc(db, 'users', uid, 'aggregates', 'today'), {
    date: '', waterMl: 0, waterGoalMl: 2000, waterGoalMet: false,
    fastCompleted: false, fastProtocol: null,
  });

  batch.set(doc(db, 'users', uid, 'aggregates', 'streak'), {
    currentStreakDays: 0, longestStreakDays: 0, lastStreakDate: null,
    xpTotal: 0, level: 1, badgeIds: [],
  });

  await batch.commit();
}

// Called at the end of onboarding Step 4
export async function completeOnboarding(uid: string, data: OnboardingData) {
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', uid, 'profile', 'data'), {
    displayName: data.displayName,
    onboardingComplete: true,
    lastActiveAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', uid, 'settings', 'data'), {
    defaultProtocol: data.defaultProtocol,
    weightKg: data.weightKg,
    activityLevel: data.activityLevel,
    calculatedWaterGoalMl: data.calculatedWaterGoalMl,
    'cycle.lastPeriodStart': data.lastPeriodStart,
    'notifications.fastingReminders': data.notificationsEnabled,
    'notifications.hydrationReminders': data.notificationsEnabled,
  });

  await batch.commit();
}

export async function updateUserSettings(uid: string, updates: Partial<UserSettings>) {
  await updateDoc(doc(db, 'users', uid, 'settings', 'data'), updates);
}
```

---

### 4.11 Profile Management (Settings Screen)

Users can edit these fields from the `/settings` screen after onboarding.

| Field | Editable | Trigger Side Effect |
|---|---|---|
| Display name | Yes | Update Firebase Auth displayName + Firestore profile |
| Avatar photo | Yes | Upload to Firebase Storage, save URL to profile |
| Weight | Yes | Recalculate and save `calculatedWaterGoalMl` to settings |
| Activity level | Yes | Recalculate and save `calculatedWaterGoalMl` to settings |
| Default fasting protocol | Yes | Updates settings only — does not affect active session |
| Cycle start date | Yes | Recalculate `avgCycleLength` via Cyclia + save to settings |
| Fasting reminders on/off | Yes | Cancel or reschedule active notifications |
| Hydration reminders on/off | Yes | Cancel or reschedule active notifications |
| Email address | No (Phase 1) | Firebase Auth email change requires re-authentication — Phase 2 |
| Password | No (Phase 1) | Firebase Auth password change — Phase 2 |

---

### 4.12 Password Reset Flow

```
TRIGGER: User taps "Forgot password?" on sign-in screen

STEP 1: User enters email address
STEP 2: Call sendPasswordResetEmail(auth, email)
STEP 3: Show confirmation screen — "Check your inbox"
STEP 4: User clicks link in email, resets password on Firebase-hosted page
STEP 5: User returns to app, signs in with new password

Rules:
  Never reveal whether an email exists — show same confirmation for unknown emails
  Deep link back into the app after reset is a Phase 2 enhancement
```

---

### 4.13 Auth Error Handling

All auth errors must show user-friendly messages. Never surface Firebase error codes directly.

| Firebase Error Code | User-Facing Message |
|---|---|
| auth/email-already-in-use | An account with this email already exists. Try signing in. |
| auth/invalid-email | Please enter a valid email address. |
| auth/weak-password | Password must be at least 8 characters. |
| auth/wrong-password | Incorrect password. Please try again. |
| auth/user-not-found | No account found with this email. |
| auth/too-many-requests | Too many attempts. Please wait a few minutes and try again. |
| auth/network-request-failed | No internet connection. Please check your network. |
| auth/user-disabled | This account has been disabled. Please contact support. |
| auth/popup-closed-by-user | Google sign-in was cancelled. |
| Default / unknown | Something went wrong. Please try again. |

```typescript
// src/services/auth/authErrors.ts
export function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/weak-password':        'Password must be at least 8 characters.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/user-not-found':       'No account found with this email.',
    'auth/too-many-requests':    'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Please check your network.',
    'auth/user-disabled':        'This account has been disabled. Please contact support.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  };
  return messages[code] ?? 'Something went wrong. Please try again.';
}
```

---

### 4.14 Account Deletion Flow

Required before App Store submission. Users must be able to delete their account and all data.

```
STEP 1: User taps "Delete Account" in Settings -> show confirmation dialog
STEP 2: User confirms -> call deleteAccount() service
STEP 3: deleteAccount() executes in order:
  a. Delete all subcollections: fastSessions, waterEvents, cycleLogs (batch)
  b. Delete users/{uid} document tree (profile, settings, aggregates)
  c. Delete Firebase Auth account (deleteUser)
  d. Clear all Zustand stores
  e. Cancel all scheduled notifications
STEP 4: RouteGuard detects unauthenticated state -> redirects to sign-in
```

Rules:
- The Firestore delete must succeed BEFORE the Auth delete is attempted
- If Firestore delete fails, do not delete the Auth account — show error
- Use a Cloud Function for complete subcollection deletion (Firestore does not cascade deletes)
- Show a spinner and disable all UI during deletion — this is irreversible

---

### 4.15 Authorization Model (What Each Role Can Access)

```
Unauthenticated user
  Can see:   sign-in screen, onboarding screens
  Cannot:    access any tab, read/write any Firestore data

Authenticated user (own data)
  Can read:  users/{own-uid}/**
  Can write: users/{own-uid}/**
  Can read:  fastSessions where userId == own-uid
  Can write: fastSessions (own records only)
  Can read:  waterEvents where userId == own-uid
  Can write: waterEvents (own records only)
  Cannot:    read/write any other user's data

Group member (Phase 2)
  Can read:  groups/{groupId} if uid in memberIds
  Can write: groups/{groupId}/checkIns/{own-uid} only
  Cannot:    write other members' checkIns
  Cannot:    modify group membership (only group creator can)
```

This maps directly to the Firestore security rules in Section 13.

---

## 5. Core Systems

### 4.1 Fasting System

Protocol-based fasting with wall-clock timer, persistent sessions, and XP reward on completion.

| Protocol | Fast Duration | Eating Window | Default Phase |
|---|---|---|---|
| 12:12 | 12 hours | 12 hours | Menstruation |
| 14:10 | 14 hours | 10 hours | Luteal |
| 16:8 | 16 hours | 8 hours | Follicular / Ovulation |
| Custom | User-set | Derived | Advanced users |

Fasting stage display labels:

| Elapsed | Stage | Color |
|---|---|---|
| 0-4h | Fed State | Gray |
| 4-12h | Early Fast | Purple light |
| 12-14h | Metabolic Shift | Purple mid |
| 14h+ | Fat Burning | Purple primary |

Key behaviors:
- Timer persists across app kill using wall-clock math (startTime Unix ms in AsyncStorage via Zustand persist)
- AppState listener resyncs remaining time when app foregrounds
- Eating window prediction: endTime = startTime + targetDurationMs
- Streak increments at midnight if at least one fast completed that UTC day
- Fast completion triggers XP award + haptic feedback

### 4.2 Hydration System

Weight-based goal with weather adjustment, one-tap logging, daily tracking.

Goal calculation:
```
base = weightKg x 33 ml
+ activity bonus: low +0ml, moderate +300ml, high +600ml
+ heat bonus: >30C +400ml, >25C +200ml
+ dry air bonus: <40% humidity +200ml
round to nearest 50ml
```

Log presets: 150ml, 250ml (default), 350ml, 500ml, custom

Key behaviors:
- One-tap log from home screen bottom sheet
- Progress ring fills 0-100% of daily goal
- Goal resets at midnight (keyed by YYYY-MM-DD date string)
- Hydration reminders every 90 minutes DURING fasting window only — suppressed during eating window
- Haptic feedback at 50% and 100% milestones

### 4.3 Cycle System (Phase 1B)

Period tracking with phase inference and fasting recommendations per phase.

| Phase | Typical Days | Recommended Protocol | Warning Level |
|---|---|---|---|
| Menstruation | 1-5 | 12:12 | avoid — recovery mode |
| Follicular | 6-13 | 16:8 | none |
| Ovulation | 12-16 | 16:8 | none |
| Luteal | 17-28 | 14:10 | caution — appetite increase normal |

Key behaviors:
- User logs period start date; phase derived from daysSinceLastPeriod
- Cyclia library calculates average cycle length from historical dates
- Phase card displays on fasting home screen
- Warning banner auto-shows if current phase is menstruation/luteal and selected protocol exceeds recommended
- Symptom log: 5-scale emoji for mood, energy, cramps, bloating, cravings per day

---

## 6. Data Model (Final Clean Version)

```
users/{id}
  profile
    displayName: string
    email: string
    avatarUrl: string | null
    createdAt: Timestamp
  settings
    fastingProtocol: '12:12' | '14:10' | '16:8' | 'custom'
    dailyWaterGoalMl: number
    weightKg: number
    activityLevel: 'low' | 'moderate' | 'high'
    cycle:
      lastPeriodStart: string (ISO date)
      avgCycleLength: number
      avgPeriodLength: number
  aggregates/
    today
      date: string (YYYY-MM-DD)
      waterMl: number
      waterGoalMl: number
      waterGoalMet: boolean
      fastCompleted: boolean
      fastProtocol: string | null
    streak
      currentStreakDays: number
      longestStreakDays: number
      lastStreakDate: string (YYYY-MM-DD) | null
      xpTotal: number
      level: number
      badgeIds: string[]

fastSessions/{id}            -- append-only
  startTime: number (Unix ms)
  endTime: number (Unix ms)
  targetDurationHours: number
  protocol: FastingProtocol
  completed: boolean
  xpEarned: number
  cyclePhaseAtStart: CyclePhaseType | null
  createdAt: Timestamp

waterEvents/{id}             -- append-only
  userId: string
  date: string (YYYY-MM-DD)
  ml: number
  loggedAt: number (Unix ms)

cycleLogs/{id}               -- append-only
  userId: string
  periodStartDate: string (ISO)
  periodEndDate: string | null
  cycleLength: number | null
  symptoms: Record<string, {
    cramps: 1|2|3|4|5 | null
    bloating: 1|2|3|4|5 | null
    mood: 1|2|3|4|5 | null
    energy: 1|2|3|4|5 | null
    cravings: 1|2|3|4|5 | null
  }>

groups/{groupId}             -- Phase 2
  name: string
  createdBy: string
  memberIds: string[]
  challengeProtocol: FastingProtocol
  startDate: string
  endDate: string
  streakCount: number
  frozenDays: string[]
  checkIns: Record<userId, Record<YYYY-MM-DD, boolean>>
  leaderboard: Array<{ userId: string; xpThisCycle: number }>
```

---

## 7. Aggregation Model (Important)

We never compute heavy stats from scanning logs.

Instead, on every event write, also update:

```
users/{id}/aggregates/today   -> today's water total, fast status
users/{id}/aggregates/streak  -> current streak, XP, level, badges
```

This gives fast reads on the home screen without scanning log collections.

---

## 8. Streak Definition (Final)

A streak increments when:
- At least 1 fast is completed
- Within the same UTC day (YYYY-MM-DD key)
- Not already counted (idempotent)

Streak resets to 1 if there is a gap of more than 1 day between the last counted day and the current session's day.

---

## 9. Notification Model

Stateless — fully rescheduled on every new session start. No incremental updates.

| Notification | Trigger | Channel | Phase |
|---|---|---|---|
| Halfway through fast | startTime + targetMs x 0.5 | fasting | 1 |
| 1 hour to fast end | startTime + targetMs - 3600s | fasting | 1 |
| Fast complete | startTime + targetMs | fasting | 1 |
| Hydration reminder | Every 90min during fasting window | hydration | 1 |
| Partner nudge | 12:00pm if partner hasn't started | social | 2 |
| Challenge start | Group challenge start date | social | 2 |
| Streak freeze warning | When group member misses a day | social | 2 |

---

## 10. Screen Map

```
(auth)/
  sign-in.tsx                 Email/password sign-in + Google OAuth
  register.tsx                New account creation (email/password)
  forgot-password.tsx         Password reset email request screen
  onboarding/
    _layout.tsx               Progress bar header, step state context
    step-1-name.tsx           Display name input (pre-filled from Google)
    step-2-body.tsx           Weight + activity level
    step-3-protocol.tsx       Default fasting protocol selection (visual cards)
    step-4-cycle.tsx          Cycle start date (optional) + notification permission

(tabs)/
  index.tsx           Home / Fasting — circular timer, protocol picker, stage label, eating window
  water.tsx           Hydration — ring progress, quick-log buttons, history chart
  cycle.tsx           Cycle — phase card, calendar, symptom logger, warning banner (Phase 1B)
  social.tsx          Social — XP bar, badge shelf, group list, leaderboard (Phase 2)

Modals (router.push):
  /fast-history           Calendar heatmap of past fasts
  /water-history          Weekly/monthly hydration history
  /badge-detail/[id]      Badge detail — unlock condition and earned date
  /group/[id]             Group challenge detail + check-in feed (Phase 2)
  /settings               Profile edit, notification toggles, cycle settings
  /settings/account       Email, password change, account deletion (Phase 2)
```

---

## 11. System Priorities

```
1. Correctness > UI polish
2. Deterministic logic > convenience
3. Offline-safe > real-time features
4. Simplicity > premature abstraction
```

---

## 12. Scale Design Goals

System must handle:
- Offline usage (AsyncStorage fallback for all local state)
- Duplicate events (idempotency keys on streak and water logs)
- Multiple device login (Firestore as source of truth, not Zustand)
- Notification delivery delays (wall-clock math — never trust timer state)
- Partial writes (failed Firestore writes cached locally and retried)

---

## 13. Non-Goals (Important — Do Not Build)

```
Real-time multiplayer sync           -- not in MVP
Complex backend orchestration        -- not in MVP
Server-heavy computation             -- not in MVP
RevenueCat / paywall                 -- Phase 3 only
AI meal suggestions                  -- Phase 3 only
Global leaderboard                   -- Phase 2 only
```

Gate all Phase 3 features behind `isPremium` flag in `useUserStore` — always false in Phase 1.

---

## 14. Privacy and Compliance

- Cycle data stored offline-first via Zustand + AsyncStorage; Firestore write only when authenticated
- No ads — ever (hard product decision)
- Privacy policy URL required before App Store submission
- Apple requires privacy nutrition label for health category apps
- Firestore security rules must be deployed before production

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /fastSessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /waterEvents/{eventId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.memberIds;
      allow write: if request.auth != null && request.auth.uid in resource.data.memberIds;
    }
  }
}
```

---

## 15. Known Constraints and Gotchas

| Constraint | Detail |
|---|---|
| Push notifications in Expo Go | Not supported (SDK 53+). Always use development build via EAS |
| Background timer | JS does not run when app is killed. Store startTime as Unix ms; recalculate on foreground |
| react-native-countdown-circle-timer | Requires react-native-svg as peer dependency |
| Firebase JS SDK | Use with AsyncStorage persistence adapter — easier than @react-native-firebase for Expo |
| iOS cycle data | Apple reviews health data apps — ensure privacy disclosure in App Store notes |
| Cyclia maturity | Small early-stage library — wrap all calls in try/catch with manual phase math fallback |
| Open-Meteo rate limits | Free, no key. Cache response 4 hours in AsyncStorage to avoid excessive calls |
| Android notification channels | setNotificationChannelAsync must be called before scheduling — missing channel = silent drop |

---

## 16. MVP Launch Checklist

### Authentication and Authorization
- [ ] Firebase Auth: email/password registration and sign-in
- [ ] Firebase Auth: Google OAuth sign-in
- [ ] Password reset email flow with user-friendly confirmation screen
- [ ] Auth error messages mapped — no raw Firebase codes shown to users
- [ ] onAuthStateChanged listener wired in root layout
- [ ] RouteGuard: unknown->splash, unauthenticated->sign-in, needs-onboarding->onboarding, authenticated->tabs
- [ ] Atomic Firestore batch write on new user: profile + settings + aggregates/today + aggregates/streak
- [ ] Onboarding: 4 screens (display name, body stats, protocol, cycle + notifications)
- [ ] Onboarding data written to Firestore only on final "Get Started" tap
- [ ] onboardingComplete: true written to profile on completion
- [ ] Push token registered and saved to users/{uid}/profile.expoPushToken after onboarding
- [ ] useUserStore persisted to AsyncStorage for instant UI on re-launch
- [ ] Account deletion: Firestore data deleted before Firebase Auth account deleted
- [ ] Account deletion: Cloud Function handles subcollection cascade delete
- [ ] Firestore security rules deployed and tested (all paths covered)

### Core Features
- [ ] Fasting timer with 4 protocols, circular UI, stage labels
- [ ] Water tracker with goal calc, ring progress, one-tap log
- [ ] Local notifications: fasting reminders + hydration reminders
- [ ] Streak tracking: daily UTC increment, persistence across restarts
- [ ] Basic XP: award on fast completion and hydration goal
- [ ] Aggregates: today and streak documents updated on every event
- [ ] Profile management: edit displayName, weight, activity level, default protocol
- [ ] Settings screen: toggle notification preferences

### Testing
- [ ] Unit tests: streak engine, hydration goal calc, XP calc, cycle phase logic
- [ ] Unit tests: getAuthErrorMessage covers all Firebase error codes
- [ ] Manual: new user — register -> onboarding -> home screen
- [ ] Manual: returning user — sign-in -> profile loaded -> home screen
- [ ] Manual: auth state persists after app kill and relaunch
- [ ] Manual: timer survives app kill on both iOS and Android
- [ ] Manual: notifications fire at correct wall-clock times
- [ ] Manual: hydration reminders suppressed during eating window
- [ ] Manual: unauthenticated deep link redirects to sign-in, resumes after auth

### Infra
- [ ] Firestore security rules tested with Firebase Emulator
- [ ] .env.local vars set in EAS Secrets (eas secret:create)
- [ ] Development build distributed to test devices
- [ ] Privacy policy URL ready for App Store submission (required for health data)
- [ ] Account deletion endpoint live before App Store submission (Apple requirement)
- [ ] /dev/state.json updated to buildStatus: "production-ready"

---

## 17. Revenue Architecture (Phase 3 Reference Only)

Do not build this in Phase 1.

- SDK: RevenueCat
- Free tier: full fasting timer + water tracker + basic cycle + 1 active group
- Premium (~$9.99/month or $59.99/year):
  - Advanced hydration (weather + activity adaptive)
  - Full gamification (all badges, level system, global leaderboard)
  - Unlimited groups and accountability partners
  - AI meal suggestions
  - Hormone-aware coaching content

---

## 18. External API Reference

### Open-Meteo (weather — no key required)

```
Base URL: https://api.open-meteo.com/v1/forecast
Params:   latitude, longitude, current=temperature_2m,relative_humidity_2m, forecast_days=1
Cache:    4 hours in AsyncStorage (write with expiry timestamp)
```

### Expo Push Service

```
Token:    Notifications.getExpoPushTokenAsync({ projectId })
projectId: from Constants.expoConfig.extra.eas.projectId
Store:    users/{userId}.expoPushToken in Firestore
```

### Firebase

```
Setup:    https://console.firebase.google.com
Enable:   Authentication (Email/Password + Google), Firestore, Cloud Messaging
Config:   Copy to .env.local (EXPO_PUBLIC_ prefix for all vars)
```

---

## 19. Open Source References

| Project | Repo | What to reference |
|---|---|---|
| fasta | github.com/ingava/fasta | Timer state management, fasting session data model |
| drip | gitlab.com/bloodyhealth/drip | Cycle data model, phase display UX patterns |
| peri | github.com/IraSoro/peri | Minimal period logging UX |
| react-award | github.com/fedemartinm/react-award | Badge reveal animations (Phase 2) |

---

## 20. Gamification Reference

XP Award Table:

| Action | XP |
|---|---|
| Complete 12:12 fast | 30 |
| Complete 14:10 fast | 50 |
| Complete 16:8 fast | 80 |
| Hit daily hydration goal | 20 |
| 7-day streak bonus | 100 |
| 30-day streak bonus | 500 |
| Log cycle day | 15 |
| Log symptoms | 10 |

Level Thresholds:

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Beginner |
| 2 | 500 | Consistent |
| 3 | 1,500 | Committed |
| 4 | 5,000 | HabitLoop Pro |

Phase 1 Badge Definitions:

| Badge ID | Trigger |
|---|---|
| first-fast | Complete first fast of any protocol |
| hydration-hero | Hit water goal 7 days in a row |
| streak-starter | 7-day fasting streak |
| cycle-logger | Log 3 consecutive cycle days (Phase 1B) |
| protocol-explorer | Try all 3 preset protocols |

---

## 21. Glossary

| Term | Definition |
|---|---|
| Fast session | A single fasting period with startTime, protocol, and completion status |
| Eating window | Non-fasting hours; displayed as countdown to next eating window start |
| Fasting stage | Labeled phase within a fast: Fed, Early Fast, Metabolic Shift, Fat Burning |
| Cycle phase | One of four hormonal phases: Menstruation, Follicular, Ovulation, Luteal |
| Phase recommendation | Protocol and warning level for the user's current cycle phase |
| XP | Experience points awarded for completed health actions |
| Streak | Consecutive UTC days with at least one completed fast |
| Streak freeze | Group mechanic: streak pauses 24h if any member misses a day (Phase 2) |
| Sync Fasting Challenge | Group commits to same protocol for 7 or 14 days (Phase 2) |
| Accountability partner | 1:1 pairing with mutual push nudges (Phase 2) |
| Wall-clock timer | Timer based on stored Unix timestamp diff — survives app kill |
| Aggregate | Pre-computed Firestore document for fast home-screen reads |
| OTA update | JS bundle update via eas update — no App Store review required |
| AuthStatus | Four-state enum: unknown, unauthenticated, needs-onboarding, authenticated |
| Auth listener | onAuthStateChanged — wired once in root layout, updates useUserStore |
| RouteGuard | Component in root layout that redirects based on authStatus |
| Profile init | Atomic Firestore batch write of 4 documents on first-ever sign-in |
| Onboarding | 4-screen post-registration flow collecting body stats, protocol, cycle dates |
| onboardingComplete | Boolean flag on users/{uid}/profile — false means redirect to onboarding |
| Provider | Auth method used: email or google — stored on profile document |
| expoPushToken | Device push token saved to Firestore after onboarding for remote notifications |
| Account deletion | Irreversible 3-step flow: delete Firestore data, delete Auth account, clear stores |
