<!-- CONTEXT.md -->

\# CONTEXT.md — HabitLoop

> Claude Code project context. Read this alongside SKILLS.md before every session.

> This file defines WHAT to build — product decisions, architecture, and module specs.

> For HOW to build it — patterns, code templates, and conventions — see SKILLS.md.



\---



\## 1. Product Definition



HabitLoop is a mobile habit system combining:

\- Intermittent fasting — timer-based, protocol-driven, streak-tracked

\- Hydration tracking — one-tap logging with weather-adjusted daily goals

\- Menstrual cycle-aware recommendations — fasting adapts to hormonal phase



Core differentiator: fasting adapts based on the user's hormonal cycle phase.

No other MVP-level product does this.



Tagline: "Built around real-life habits and women's health."



\---



\## 2. Tech Stack Quick Reference



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



\---



\## 3. Current Phase



Active: Phase 1 (MVP Core) — Fasting Engine + Water Tracker + Notifications + Streaks + XP



```

Phase 1   -> Fasting timer, water tracker, local notifications, streak + basic XP   \[Weeks 1-8]

Phase 1B  -> Menstrual cycle module, phase-based recommendations, symptom logging    \[Weeks 9-14]

Phase 2   -> Friend groups, Sync Fasting Challenges, leaderboard, check-in feed     \[Weeks 15-22]

Phase 3   -> AI meal suggestions, hormone coaching, RevenueCat paywall, analytics    \[Weeks 23+]

```



\---



\## 4. Authentication \& Authorization System



This section is the foundation of the entire app. No feature works correctly without it.

Every Firestore write, every streak, every fast session is scoped to an authenticated user.



\---



\### 4.1 Auth Methods



| Method | Phase | Notes |

|---|---|---|

| Email + Password | Phase 1 | Primary sign-up method |

| Google OAuth | Phase 1 | Secondary — one-tap sign-in |

| Apple Sign-In | Phase 2 | Required for iOS App Store if any OAuth is offered |

| Guest / Anonymous | NOT supported | All data must be user-owned — no anonymous sessions |



\---



\### 4.2 Auth State Model



Auth state has exactly four possible values. Every screen decision flows from this.



```

UNKNOWN       -> app just launched, Firebase SDK is resolving persisted session

UNAUTHENTICATED -> no valid session, user must sign in

NEEDS\_ONBOARDING -> authenticated but profile document not yet initialized

AUTHENTICATED -> authenticated + profile exists + onboarding complete

```



```typescript

// src/types/auth.ts

export type AuthStatus =

&#x20; | 'unknown'

&#x20; | 'unauthenticated'

&#x20; | 'needs-onboarding'

&#x20; | 'authenticated';



export interface AuthUser {

&#x20; uid: string;

&#x20; email: string | null;

&#x20; displayName: string | null;

&#x20; photoURL: string | null;

&#x20; provider: 'email' | 'google';

&#x20; createdAt: number;        // Unix ms

}

```



\---



\### 4.3 useUserStore — Auth State Store



```

Holds:

&#x20; authStatus: AuthStatus

&#x20; user: AuthUser | null

&#x20; profile: UserProfile | null    <- loaded from Firestore after login

&#x20; isPremium: boolean             <- always false in Phase 1



Does NOT hold:

&#x20; Firebase Auth object           <- never store raw Firebase objects

&#x20; password or credentials        <- never store

&#x20; raw Firestore DocumentSnapshot <- always map to typed interfaces

```



```typescript

// src/stores/user/useUserStore.ts

import { create } from 'zustand';

import { persist, createJSONStorage } from 'zustand/middleware';

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthStatus, AuthUser, UserProfile } from '@/types/auth';



interface UserState {

&#x20; authStatus: AuthStatus;

&#x20; user: AuthUser | null;

&#x20; profile: UserProfile | null;

&#x20; isPremium: boolean;



&#x20; setAuthStatus: (status: AuthStatus) => void;

&#x20; setUser: (user: AuthUser | null) => void;

&#x20; setProfile: (profile: UserProfile | null) => void;

&#x20; clearAuth: () => void;

}



export const useUserStore = create<UserState>()(

&#x20; persist(

&#x20;   (set) => ({

&#x20;     authStatus: 'unknown',

&#x20;     user: null,

&#x20;     profile: null,

&#x20;     isPremium: false,



&#x20;     setAuthStatus: (authStatus) => set({ authStatus }),

&#x20;     setUser: (user) => set({ user }),

&#x20;     setProfile: (profile) => set({ profile }),

&#x20;     clearAuth: () => set({

&#x20;       authStatus: 'unauthenticated',

&#x20;       user: null,

&#x20;       profile: null,

&#x20;     }),

&#x20;   }),

&#x20;   {

&#x20;     name: 'user-store',

&#x20;     storage: createJSONStorage(() => AsyncStorage),

&#x20;   }

&#x20; )

);

```



\---



\### 4.4 Auth Listener — Wire Once in Root Layout



The Firebase `onAuthStateChanged` listener is the single source of truth for auth state.

It is wired ONCE in `app/\_layout.tsx` and updates the Zustand store.



```typescript

// app/\_layout.tsx — auth listener wiring

import { useEffect } from 'react';

import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/services/firebase';

import { useUserStore } from '@/stores/user/useUserStore';

import { loadUserProfile } from '@/services/auth/profileService';



export default function RootLayout() {

&#x20; const { setAuthStatus, setUser, setProfile, clearAuth } = useUserStore();



&#x20; useEffect(() => {

&#x20;   const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

&#x20;     if (!firebaseUser) {

&#x20;       clearAuth();

&#x20;       return;

&#x20;     }



&#x20;     // User is authenticated — map to typed AuthUser

&#x20;     const user: AuthUser = {

&#x20;       uid:         firebaseUser.uid,

&#x20;       email:       firebaseUser.email,

&#x20;       displayName: firebaseUser.displayName,

&#x20;       photoURL:    firebaseUser.photoURL,

&#x20;       provider:    firebaseUser.providerData\[0]?.providerId === 'google.com' ? 'google' : 'email',

&#x20;       createdAt:   Date.now(),

&#x20;     };

&#x20;     setUser(user);



&#x20;     // Check if profile document exists in Firestore

&#x20;     const profile = await loadUserProfile(firebaseUser.uid);

&#x20;     if (!profile) {

&#x20;       setAuthStatus('needs-onboarding');   // first-ever login

&#x20;     } else {

&#x20;       setProfile(profile);

&#x20;       setAuthStatus('authenticated');

&#x20;     }

&#x20;   });



&#x20;   return () => unsubscribe();

&#x20; }, \[]);



&#x20; // ... rest of layout

}

```



\---



\### 4.5 Route Protection with Expo Router



The app uses a single root Stack with conditional routing based on `authStatus`.



```

authStatus === 'unknown'           -> show SplashScreen (do not navigate)

authStatus === 'unauthenticated'   -> redirect to (auth)/sign-in

authStatus === 'needs-onboarding'  -> redirect to (auth)/onboarding

authStatus === 'authenticated'     -> show (tabs)/

```



```typescript

// app/\_layout.tsx — route guard

import { useEffect } from 'react';

import { useRouter, useSegments } from 'expo-router';

import { useUserStore } from '@/stores/user/useUserStore';



function RouteGuard({ children }: { children: React.ReactNode }) {

&#x20; const authStatus = useUserStore(s => s.authStatus);

&#x20; const router = useRouter();

&#x20; const segments = useSegments();



&#x20; useEffect(() => {

&#x20;   if (authStatus === 'unknown') return;  // wait for Firebase to resolve



&#x20;   const inAuthGroup = segments\[0] === '(auth)';

&#x20;   const inTabsGroup = segments\[0] === '(tabs)';



&#x20;   if (authStatus === 'unauthenticated' \&\& !inAuthGroup) {

&#x20;     router.replace('/(auth)/sign-in');

&#x20;   } else if (authStatus === 'needs-onboarding' \&\& segments\[1] !== 'onboarding') {

&#x20;     router.replace('/(auth)/onboarding');

&#x20;   } else if (authStatus === 'authenticated' \&\& inAuthGroup) {

&#x20;     router.replace('/(tabs)/');

&#x20;   }

&#x20; }, \[authStatus, segments]);



&#x20; if (authStatus === 'unknown') {

&#x20;   return <SplashScreen />;   // Firebase still resolving — show nothing

&#x20; }



&#x20; return <>{children}</>;

}

```



\*\*Rule:\*\* Never redirect inside a screen component. All auth-based navigation lives in `RouteGuard` only.



\---



\### 4.6 User Registration Flow (New Account)



This is the exact sequence for a new user. Every step must complete before the next begins.



```

STEP 1 — CREDENTIAL CREATION

&#x20; Firebase Auth creates the account (email/password or Google)

&#x20; Firebase returns a uid



STEP 2 — FIRESTORE PROFILE INITIALIZATION

&#x20; Write users/{uid}/profile document with display data

&#x20; Write users/{uid}/settings document with defaults

&#x20; Write users/{uid}/aggregates/today document (zeroed)

&#x20; Write users/{uid}/aggregates/streak document (zeroed)

&#x20; All four writes happen in a Firestore batch — atomic



STEP 3 — AUTH STATE UPDATE

&#x20; onAuthStateChanged fires -> loadUserProfile returns null (doc just created)

&#x20; authStatus set to 'needs-onboarding'

&#x20; RouteGuard redirects to /(auth)/onboarding



STEP 4 — ONBOARDING (4 screens)

&#x20; Screen 1: Display name + avatar (optional)

&#x20; Screen 2: Weight + activity level -> calculates default water goal

&#x20; Screen 3: Default fasting protocol selection (12:12 / 14:10 / 16:8)

&#x20; Screen 4: Cycle start date (optional — can skip, enables Phase 1B features)

&#x20;            + notification permission request



STEP 5 — ONBOARDING COMPLETE

&#x20; Write collected data to users/{uid}/settings

&#x20; Set onboardingComplete: true on users/{uid}/profile

&#x20; Register Expo push token -> save to users/{uid}/profile.expoPushToken

&#x20; authStatus set to 'authenticated'

&#x20; RouteGuard redirects to /(tabs)/

```



\---



\### 4.7 Sign-In Flow (Returning User)



```

STEP 1 — CREDENTIAL VALIDATION

&#x20; Firebase Auth validates email+password OR Google token



STEP 2 — AUTH STATE UPDATE

&#x20; onAuthStateChanged fires

&#x20; loadUserProfile called with uid



STEP 3 — PROFILE LOAD

&#x20; Profile document exists -> setProfile(profile) -> authStatus = 'authenticated'

&#x20; Profile missing (edge case) -> authStatus = 'needs-onboarding'



STEP 4 — STORE HYDRATION

&#x20; useFastingStore.\_hydrate() called — restores active session if one exists

&#x20; useWaterStore loads today's water log from Firestore



STEP 5 — REDIRECT

&#x20; RouteGuard sends user to /(tabs)/

```



\---



\### 4.8 Onboarding Screens (4 Steps)



```typescript

// src/types/auth.ts — onboarding data shape

export interface OnboardingData {

&#x20; displayName: string;

&#x20; weightKg: number;

&#x20; activityLevel: 'low' | 'moderate' | 'high';

&#x20; defaultProtocol: '12:12' | '14:10' | '16:8';

&#x20; lastPeriodStart: string | null;    // ISO date, null if skipped

&#x20; notificationsEnabled: boolean;

}

```



| Step | Screen | Required | Fields |

|---|---|---|---|

| 1 | Welcome / Name | Yes | displayName (pre-filled from Google if OAuth) |

| 2 | Body Stats | Yes | weightKg, activityLevel |

| 3 | Fasting Protocol | Yes | defaultProtocol (visual cards with time rings) |

| 4 | Cycle + Notifications | Optional | lastPeriodStart (skippable), notification permission |



Rules:

\- Steps 1-3 cannot be skipped — they provide data required for core features

\- Step 4 cycle input is skippable — user can add it later from settings

\- Progress is NOT saved to Firestore until the user taps "Get Started" on Step 4

\- If the user force-quits during onboarding, they return to onboarding on next launch



\---



\### 4.9 Profile Document — Full Firestore Shape



```

users/{uid}/profile

&#x20; displayName: string

&#x20; email: string

&#x20; photoURL: string | null

&#x20; provider: 'email' | 'google'

&#x20; onboardingComplete: boolean

&#x20; createdAt: Timestamp

&#x20; lastActiveAt: Timestamp

&#x20; expoPushToken: string | null



users/{uid}/settings

&#x20; defaultProtocol: '12:12' | '14:10' | '16:8' | 'custom'

&#x20; weightKg: number

&#x20; activityLevel: 'low' | 'moderate' | 'high'

&#x20; calculatedWaterGoalMl: number      <- pre-computed, refreshed on weight/activity change

&#x20; notifications:

&#x20;   fastingReminders: boolean        <- default true

&#x20;   hydrationReminders: boolean      <- default true

&#x20;   socialNudges: boolean            <- default true (Phase 2)

&#x20; cycle:

&#x20;   lastPeriodStart: string | null   <- ISO date

&#x20;   avgCycleLength: number           <- default 28

&#x20;   avgPeriodLength: number          <- default 5

&#x20; privacy:

&#x20;   shareActivityWithGroup: boolean  <- default true (Phase 2)

&#x20;   anonymousInLeaderboard: boolean  <- default false (Phase 2)

```



\---



\### 4.10 Profile Service — All Auth Operations



```typescript

// src/services/auth/authService.ts

import {

&#x20; createUserWithEmailAndPassword,

&#x20; signInWithEmailAndPassword,

&#x20; signInWithCredential,

&#x20; GoogleAuthProvider,

&#x20; signOut,

&#x20; deleteUser,

&#x20; updateProfile,

} from 'firebase/auth';

import { auth } from '@/services/firebase';



export async function registerWithEmail(email: string, password: string) {

&#x20; return createUserWithEmailAndPassword(auth, email, password);

}



export async function signInWithEmail(email: string, password: string) {

&#x20; return signInWithEmailAndPassword(auth, email, password);

}



export async function signInWithGoogle(idToken: string) {

&#x20; const credential = GoogleAuthProvider.credential(idToken);

&#x20; return signInWithCredential(auth, credential);

}



export async function signOutUser() {

&#x20; await signOut(auth);

}



export async function deleteAccount() {

&#x20; const user = auth.currentUser;

&#x20; if (!user) throw new Error('No authenticated user');

&#x20; // Delete Firestore data first, then delete auth account

&#x20; await deleteAllUserData(user.uid);

&#x20; await deleteUser(user);

}

```



```typescript

// src/services/auth/profileService.ts

import { db } from '@/services/firebase';

import { doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

import type { UserProfile, OnboardingData } from '@/types/auth';



export async function loadUserProfile(uid: string): Promise<UserProfile | null> {

&#x20; const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));

&#x20; return snap.exists() ? (snap.data() as UserProfile) : null;

}



// Called once — atomic batch write at the end of registration

export async function initializeUserProfile(uid: string, email: string, provider: 'email' | 'google') {

&#x20; const batch = writeBatch(db);



&#x20; batch.set(doc(db, 'users', uid, 'profile', 'data'), {

&#x20;   email,

&#x20;   provider,

&#x20;   onboardingComplete: false,

&#x20;   createdAt: serverTimestamp(),

&#x20;   lastActiveAt: serverTimestamp(),

&#x20;   expoPushToken: null,

&#x20;   displayName: '',

&#x20;   photoURL: null,

&#x20; });



&#x20; batch.set(doc(db, 'users', uid, 'settings', 'data'), {

&#x20;   defaultProtocol: '16:8',

&#x20;   weightKg: 0,

&#x20;   activityLevel: 'moderate',

&#x20;   calculatedWaterGoalMl: 2000,

&#x20;   notifications: { fastingReminders: true, hydrationReminders: true, socialNudges: true },

&#x20;   cycle: { lastPeriodStart: null, avgCycleLength: 28, avgPeriodLength: 5 },

&#x20;   privacy: { shareActivityWithGroup: true, anonymousInLeaderboard: false },

&#x20; });



&#x20; batch.set(doc(db, 'users', uid, 'aggregates', 'today'), {

&#x20;   date: '', waterMl: 0, waterGoalMl: 2000, waterGoalMet: false,

&#x20;   fastCompleted: false, fastProtocol: null,

&#x20; });



&#x20; batch.set(doc(db, 'users', uid, 'aggregates', 'streak'), {

&#x20;   currentStreakDays: 0, longestStreakDays: 0, lastStreakDate: null,

&#x20;   xpTotal: 0, level: 1, badgeIds: \[],

&#x20; });



&#x20; await batch.commit();

}



// Called at the end of onboarding Step 4

export async function completeOnboarding(uid: string, data: OnboardingData) {

&#x20; const batch = writeBatch(db);



&#x20; batch.update(doc(db, 'users', uid, 'profile', 'data'), {

&#x20;   displayName: data.displayName,

&#x20;   onboardingComplete: true,

&#x20;   lastActiveAt: serverTimestamp(),

&#x20; });



&#x20; batch.update(doc(db, 'users', uid, 'settings', 'data'), {

&#x20;   defaultProtocol: data.defaultProtocol,

&#x20;   weightKg: data.weightKg,

&#x20;   activityLevel: data.activityLevel,

&#x20;   calculatedWaterGoalMl: data.calculatedWaterGoalMl,

&#x20;   'cycle.lastPeriodStart': data.lastPeriodStart,

&#x20;   'notifications.fastingReminders': data.notificationsEnabled,

&#x20;   'notifications.hydrationReminders': data.notificationsEnabled,

&#x20; });



&#x20; await batch.commit();

}



export async function updateUserSettings(uid: string, updates: Partial<UserSettings>) {

&#x20; await updateDoc(doc(db, 'users', uid, 'settings', 'data'), updates);

}

```



\---



\### 4.11 Profile Management (Settings Screen)



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



\---



\### 4.12 Password Reset Flow



```

TRIGGER: User taps "Forgot password?" on sign-in screen



STEP 1: User enters email address

STEP 2: Call sendPasswordResetEmail(auth, email)

STEP 3: Show confirmation screen — "Check your inbox"

STEP 4: User clicks link in email, resets password on Firebase-hosted page

STEP 5: User returns to app, signs in with new password



Rules:

&#x20; Never reveal whether an email exists — show same confirmation for unknown emails

&#x20; Deep link back into the app after reset is a Phase 2 enhancement

```



\---



\### 4.13 Auth Error Handling



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

&#x20; const messages: Record<string, string> = {

&#x20;   'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',

&#x20;   'auth/invalid-email':        'Please enter a valid email address.',

&#x20;   'auth/weak-password':        'Password must be at least 8 characters.',

&#x20;   'auth/wrong-password':       'Incorrect password. Please try again.',

&#x20;   'auth/user-not-found':       'No account found with this email.',

&#x20;   'auth/too-many-requests':    'Too many attempts. Please wait a few minutes and try again.',

&#x20;   'auth/network-request-failed': 'No internet connection. Please check your network.',

&#x20;   'auth/user-disabled':        'This account has been disabled. Please contact support.',

&#x20;   'auth/popup-closed-by-user': 'Google sign-in was cancelled.',

&#x20; };

&#x20; return messages\[code] ?? 'Something went wrong. Please try again.';

}

```



\---



\### 4.14 Account Deletion Flow



Required before App Store submission. Users must be able to delete their account and all data.



```

STEP 1: User taps "Delete Account" in Settings -> show confirmation dialog

STEP 2: User confirms -> call deleteAccount() service

STEP 3: deleteAccount() executes in order:

&#x20; a. Delete all subcollections: fastSessions, waterEvents, cycleLogs (batch)

&#x20; b. Delete users/{uid} document tree (profile, settings, aggregates)

&#x20; c. Delete Firebase Auth account (deleteUser)

&#x20; d. Clear all Zustand stores

&#x20; e. Cancel all scheduled notifications

STEP 4: RouteGuard detects unauthenticated state -> redirects to sign-in

```



Rules:

\- The Firestore delete must succeed BEFORE the Auth delete is attempted

\- If Firestore delete fails, do not delete the Auth account — show error

\- Use a Cloud Function for complete subcollection deletion (Firestore does not cascade deletes)

\- Show a spinner and disable all UI during deletion — this is irreversible



\---



\### 4.15 Authorization Model (What Each Role Can Access)



```

Unauthenticated user

&#x20; Can see:   sign-in screen, onboarding screens

&#x20; Cannot:    access any tab, read/write any Firestore data



Authenticated user (own data)

&#x20; Can read:  users/{own-uid}/\*\*

&#x20; Can write: users/{own-uid}/\*\*

&#x20; Can read:  fastSessions where userId == own-uid

&#x20; Can write: fastSessions (own records only)

&#x20; Can read:  waterEvents where userId == own-uid

&#x20; Can write: waterEvents (own records only)

&#x20; Cannot:    read/write any other user's data



Group member (Phase 2)

&#x20; Can read:  groups/{groupId} if uid in memberIds

&#x20; Can write: groups/{groupId}/checkIns/{own-uid} only

&#x20; Cannot:    write other members' checkIns

&#x20; Cannot:    modify group membership (only group creator can)

```



This maps directly to the Firestore security rules in Section 13.



\---



\## 5. Core Systems



\### 4.1 Fasting System



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

\- Timer persists across app kill using wall-clock math (startTime Unix ms in AsyncStorage via Zustand persist)

\- AppState listener resyncs remaining time when app foregrounds

\- Eating window prediction: endTime = startTime + targetDurationMs

\- Streak increments at midnight if at least one fast completed that UTC day

\- Fast completion triggers XP award + haptic feedback



\### 4.2 Hydration System



Weight-based goal with weather adjustment, one-tap logging, daily tracking.



Goal calculation:

```

base = weightKg x 33 ml

\+ activity bonus: low +0ml, moderate +300ml, high +600ml

\+ heat bonus: >30C +400ml, >25C +200ml

\+ dry air bonus: <40% humidity +200ml

round to nearest 50ml

```



Log presets: 150ml, 250ml (default), 350ml, 500ml, custom



Key behaviors:

\- One-tap log from home screen bottom sheet

\- Progress ring fills 0-100% of daily goal

\- Goal resets at midnight (keyed by YYYY-MM-DD date string)

\- Hydration reminders every 90 minutes DURING fasting window only — suppressed during eating window

\- Haptic feedback at 50% and 100% milestones



\### 4.3 Cycle System (Phase 1B)



Period tracking with phase inference and fasting recommendations per phase.



| Phase | Typical Days | Recommended Protocol | Warning Level |

|---|---|---|---|

| Menstruation | 1-5 | 12:12 | avoid — recovery mode |

| Follicular | 6-13 | 16:8 | none |

| Ovulation | 12-16 | 16:8 | none |

| Luteal | 17-28 | 14:10 | caution — appetite increase normal |



Key behaviors:

\- User logs period start date; phase derived from daysSinceLastPeriod

\- Cyclia library calculates average cycle length from historical dates

\- Phase card displays on fasting home screen

\- Warning banner auto-shows if current phase is menstruation/luteal and selected protocol exceeds recommended

\- Symptom log: 5-scale emoji for mood, energy, cramps, bloating, cravings per day



\---



\## 6. Data Model (Final Clean Version)



```

users/{id}

&#x20; profile

&#x20;   displayName: string

&#x20;   email: string

&#x20;   avatarUrl: string | null

&#x20;   createdAt: Timestamp

&#x20; settings

&#x20;   fastingProtocol: '12:12' | '14:10' | '16:8' | 'custom'

&#x20;   dailyWaterGoalMl: number

&#x20;   weightKg: number

&#x20;   activityLevel: 'low' | 'moderate' | 'high'

&#x20;   cycle:

&#x20;     lastPeriodStart: string (ISO date)

&#x20;     avgCycleLength: number

&#x20;     avgPeriodLength: number

&#x20; aggregates/

&#x20;   today

&#x20;     date: string (YYYY-MM-DD)

&#x20;     waterMl: number

&#x20;     waterGoalMl: number

&#x20;     waterGoalMet: boolean

&#x20;     fastCompleted: boolean

&#x20;     fastProtocol: string | null

&#x20;   streak

&#x20;     currentStreakDays: number

&#x20;     longestStreakDays: number

&#x20;     lastStreakDate: string (YYYY-MM-DD) | null

&#x20;     xpTotal: number

&#x20;     level: number

&#x20;     badgeIds: string\[]



fastSessions/{id}            -- append-only

&#x20; startTime: number (Unix ms)

&#x20; endTime: number (Unix ms)

&#x20; targetDurationHours: number

&#x20; protocol: FastingProtocol

&#x20; completed: boolean

&#x20; xpEarned: number

&#x20; cyclePhaseAtStart: CyclePhaseType | null

&#x20; createdAt: Timestamp



waterEvents/{id}             -- append-only

&#x20; userId: string

&#x20; date: string (YYYY-MM-DD)

&#x20; ml: number

&#x20; loggedAt: number (Unix ms)



cycleLogs/{id}               -- append-only

&#x20; userId: string

&#x20; periodStartDate: string (ISO)

&#x20; periodEndDate: string | null

&#x20; cycleLength: number | null

&#x20; symptoms: Record<string, {

&#x20;   cramps: 1|2|3|4|5 | null

&#x20;   bloating: 1|2|3|4|5 | null

&#x20;   mood: 1|2|3|4|5 | null

&#x20;   energy: 1|2|3|4|5 | null

&#x20;   cravings: 1|2|3|4|5 | null

&#x20; }>



groups/{groupId}             -- Phase 2

&#x20; name: string

&#x20; createdBy: string

&#x20; memberIds: string\[]

&#x20; challengeProtocol: FastingProtocol

&#x20; startDate: string

&#x20; endDate: string

&#x20; streakCount: number

&#x20; frozenDays: string\[]

&#x20; checkIns: Record<userId, Record<YYYY-MM-DD, boolean>>

&#x20; leaderboard: Array<{ userId: string; xpThisCycle: number }>

```



\---



\## 7. Aggregation Model (Important)



We never compute heavy stats from scanning logs.



Instead, on every event write, also update:



```

users/{id}/aggregates/today   -> today's water total, fast status

users/{id}/aggregates/streak  -> current streak, XP, level, badges

```



This gives fast reads on the home screen without scanning log collections.



\---



\## 8. Streak Definition (Final)



A streak increments when:

\- At least 1 fast is completed

\- Within the same UTC day (YYYY-MM-DD key)

\- Not already counted (idempotent)



Streak resets to 1 if there is a gap of more than 1 day between the last counted day and the current session's day.



\---



\## 9. Notification Model



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



\---



\## 10. Screen Map



```

(auth)/

&#x20; sign-in.tsx                 Email/password sign-in + Google OAuth

&#x20; register.tsx                New account creation (email/password)

&#x20; forgot-password.tsx         Password reset email request screen

&#x20; onboarding/

&#x20;   \_layout.tsx               Progress bar header, step state context

&#x20;   step-1-name.tsx           Display name input (pre-filled from Google)

&#x20;   step-2-body.tsx           Weight + activity level

&#x20;   step-3-protocol.tsx       Default fasting protocol selection (visual cards)

&#x20;   step-4-cycle.tsx          Cycle start date (optional) + notification permission



(tabs)/

&#x20; index.tsx           Home / Fasting — circular timer, protocol picker, stage label, eating window

&#x20; water.tsx           Hydration — ring progress, quick-log buttons, history chart

&#x20; cycle.tsx           Cycle — phase card, calendar, symptom logger, warning banner (Phase 1B)

&#x20; social.tsx          Social — XP bar, badge shelf, group list, leaderboard (Phase 2)



Modals (router.push):

&#x20; /fast-history           Calendar heatmap of past fasts

&#x20; /water-history          Weekly/monthly hydration history

&#x20; /badge-detail/\[id]      Badge detail — unlock condition and earned date

&#x20; /group/\[id]             Group challenge detail + check-in feed (Phase 2)

&#x20; /settings               Profile edit, notification toggles, cycle settings

&#x20; /settings/account       Email, password change, account deletion (Phase 2)

```



\---



\## 11. System Priorities



```

1\. Correctness > UI polish

2\. Deterministic logic > convenience

3\. Offline-safe > real-time features

4\. Simplicity > premature abstraction

```



\---



\## 12. Scale Design Goals



System must handle:

\- Offline usage (AsyncStorage fallback for all local state)

\- Duplicate events (idempotency keys on streak and water logs)

\- Multiple device login (Firestore as source of truth, not Zustand)

\- Notification delivery delays (wall-clock math — never trust timer state)

\- Partial writes (failed Firestore writes cached locally and retried)



\---



\## 13. Non-Goals (Important — Do Not Build)



```

Real-time multiplayer sync           -- not in MVP

Complex backend orchestration        -- not in MVP

Server-heavy computation             -- not in MVP

RevenueCat / paywall                 -- Phase 3 only

AI meal suggestions                  -- Phase 3 only

Global leaderboard                   -- Phase 2 only

```



Gate all Phase 3 features behind `isPremium` flag in `useUserStore` — always false in Phase 1.



\---



\## 14. Privacy and Compliance



\- Cycle data stored offline-first via Zustand + AsyncStorage; Firestore write only when authenticated

\- No ads — ever (hard product decision)

\- Privacy policy URL required before App Store submission

\- Apple requires privacy nutrition label for health category apps

\- Firestore security rules must be deployed before production



```javascript

// firestore.rules

rules\_version = '2';

service cloud.firestore {

&#x20; match /databases/{database}/documents {

&#x20;   match /users/{userId}/{document=\*\*} {

&#x20;     allow read, write: if request.auth != null \&\& request.auth.uid == userId;

&#x20;   }

&#x20;   match /fastSessions/{sessionId} {

&#x20;     allow read, write: if request.auth != null \&\& request.auth.uid == resource.data.userId;

&#x20;   }

&#x20;   match /waterEvents/{eventId} {

&#x20;     allow read, write: if request.auth != null \&\& request.auth.uid == resource.data.userId;

&#x20;   }

&#x20;   match /groups/{groupId} {

&#x20;     allow read: if request.auth != null \&\& request.auth.uid in resource.data.memberIds;

&#x20;     allow write: if request.auth != null \&\& request.auth.uid in resource.data.memberIds;

&#x20;   }

&#x20; }

}

```



\---



\## 15. Known Constraints and Gotchas



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



\---



\## 16. MVP Launch Checklist



\### Authentication and Authorization

\- \[ ] Firebase Auth: email/password registration and sign-in

\- \[ ] Firebase Auth: Google OAuth sign-in

\- \[ ] Password reset email flow with user-friendly confirmation screen

\- \[ ] Auth error messages mapped — no raw Firebase codes shown to users

\- \[ ] onAuthStateChanged listener wired in root layout

\- \[ ] RouteGuard: unknown->splash, unauthenticated->sign-in, needs-onboarding->onboarding, authenticated->tabs

\- \[ ] Atomic Firestore batch write on new user: profile + settings + aggregates/today + aggregates/streak

\- \[ ] Onboarding: 4 screens (display name, body stats, protocol, cycle + notifications)

\- \[ ] Onboarding data written to Firestore only on final "Get Started" tap

\- \[ ] onboardingComplete: true written to profile on completion

\- \[ ] Push token registered and saved to users/{uid}/profile.expoPushToken after onboarding

\- \[ ] useUserStore persisted to AsyncStorage for instant UI on re-launch

\- \[ ] Account deletion: Firestore data deleted before Firebase Auth account deleted

\- \[ ] Account deletion: Cloud Function handles subcollection cascade delete

\- \[ ] Firestore security rules deployed and tested (all paths covered)



\### Core Features

\- \[ ] Fasting timer with 4 protocols, circular UI, stage labels

\- \[ ] Water tracker with goal calc, ring progress, one-tap log

\- \[ ] Local notifications: fasting reminders + hydration reminders

\- \[ ] Streak tracking: daily UTC increment, persistence across restarts

\- \[ ] Basic XP: award on fast completion and hydration goal

\- \[ ] Aggregates: today and streak documents updated on every event

\- \[ ] Profile management: edit displayName, weight, activity level, default protocol

\- \[ ] Settings screen: toggle notification preferences



\### Testing

\- \[ ] Unit tests: streak engine, hydration goal calc, XP calc, cycle phase logic

\- \[ ] Unit tests: getAuthErrorMessage covers all Firebase error codes

\- \[ ] Manual: new user — register -> onboarding -> home screen

\- \[ ] Manual: returning user — sign-in -> profile loaded -> home screen

\- \[ ] Manual: auth state persists after app kill and relaunch

\- \[ ] Manual: timer survives app kill on both iOS and Android

\- \[ ] Manual: notifications fire at correct wall-clock times

\- \[ ] Manual: hydration reminders suppressed during eating window

\- \[ ] Manual: unauthenticated deep link redirects to sign-in, resumes after auth



\### Infra

\- \[ ] Firestore security rules tested with Firebase Emulator

\- \[ ] .env.local vars set in EAS Secrets (eas secret:create)

\- \[ ] Development build distributed to test devices

\- \[ ] Privacy policy URL ready for App Store submission (required for health data)

\- \[ ] Account deletion endpoint live before App Store submission (Apple requirement)

\- \[ ] /dev/state.json updated to buildStatus: "production-ready"



\---



\## 17. Revenue Architecture (Phase 3 Reference Only)



Do not build this in Phase 1.



\- SDK: RevenueCat

\- Free tier: full fasting timer + water tracker + basic cycle + 1 active group

\- Premium (\~$9.99/month or $59.99/year):

&#x20; - Advanced hydration (weather + activity adaptive)

&#x20; - Full gamification (all badges, level system, global leaderboard)

&#x20; - Unlimited groups and accountability partners

&#x20; - AI meal suggestions

&#x20; - Hormone-aware coaching content



\---



\## 18. External API Reference



\### Open-Meteo (weather — no key required)



```

Base URL: https://api.open-meteo.com/v1/forecast

Params:   latitude, longitude, current=temperature\_2m,relative\_humidity\_2m, forecast\_days=1

Cache:    4 hours in AsyncStorage (write with expiry timestamp)

```



\### Expo Push Service



```

Token:    Notifications.getExpoPushTokenAsync({ projectId })

projectId: from Constants.expoConfig.extra.eas.projectId

Store:    users/{userId}.expoPushToken in Firestore

```



\### Firebase



```

Setup:    https://console.firebase.google.com

Enable:   Authentication (Email/Password + Google), Firestore, Cloud Messaging

Config:   Copy to .env.local (EXPO\_PUBLIC\_ prefix for all vars)

```



\---



\## 19. Open Source References



| Project | Repo | What to reference |

|---|---|---|

| fasta | github.com/ingava/fasta | Timer state management, fasting session data model |

| drip | gitlab.com/bloodyhealth/drip | Cycle data model, phase display UX patterns |

| peri | github.com/IraSoro/peri | Minimal period logging UX |

| react-award | github.com/fedemartinm/react-award | Badge reveal animations (Phase 2) |



\---



\## 20. Gamification Reference



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



\---



\## 21. Glossary



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





<!-- Design System -->

<!DOCTYPE html>



<html lang="en"><head>

<meta charset="utf-8"/>

<meta content="width=device-width, initial-scale=1.0" name="viewport"/>

<title>HabitLoop - Fasting Home</title>

<!-- Tailwind CSS -->

<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<!-- Material Symbols -->

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<!-- Google Fonts -->

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600\&amp;family=Lexend:wght@400;600;700\&amp;family=Manrope:wght@400;600;700;800;900\&amp;display=swap" rel="stylesheet"/>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<style>

&#x20;       .material-symbols-outlined {

&#x20;           font-family: 'Material Symbols Outlined';

&#x20;           font-weight: normal;

&#x20;           font-style: normal;

&#x20;           font-size: 24px;

&#x20;           line-height: 1;

&#x20;           letter-spacing: normal;

&#x20;           text-transform: none;

&#x20;           display: inline-block;

&#x20;           white-space: nowrap;

&#x20;           word-wrap: normal;

&#x20;           direction: ltr;

&#x20;           -webkit-font-feature-settings: 'liga';

&#x20;           -webkit-font-smoothing: antialiased;

&#x20;       }

&#x20;       

&#x20;       /\* Hide scrollbar for horizontal scroll areas \*/

&#x20;       .no-scrollbar::-webkit-scrollbar {

&#x20;           display: none;

&#x20;       }

&#x20;       .no-scrollbar {

&#x20;           -ms-overflow-style: none;

&#x20;           scrollbar-width: none;

&#x20;       }

&#x20;   </style>

<script id="tailwind-config">

&#x20;       tailwind.config = {

&#x20;           darkMode: "class",

&#x20;           theme: {

&#x20;               extend: {

&#x20;                   colors: {

&#x20;                       "inverse-surface": "#322f35",

&#x20;                       "tertiary-container": "#c9a74d",

&#x20;                       "tertiary-fixed-dim": "#e7c365",

&#x20;                       "on-tertiary-container": "#503d00",

&#x20;                       "surface-container-highest": "#e6e0e9",

&#x20;                       "primary": "#4f378a",

&#x20;                       "on-tertiary-fixed": "#241a00",

&#x20;                       "surface": "#fdf7ff",

&#x20;                       "on-secondary-fixed": "#1e192b",

&#x20;                       "fed-state": "#E0E0E0",

&#x20;                       "on-background": "#1d1b20",

&#x20;                       "outline": "#7a7582",

&#x20;                       "outline-variant": "#cbc4d2",

&#x20;                       "inverse-primary": "#cfbcff",

&#x20;                       "secondary-fixed": "#e8def9",

&#x20;                       "early-fast": "#D0BCFF",

&#x20;                       "on-secondary-fixed-variant": "#4a4459",

&#x20;                       "on-tertiary-fixed-variant": "#594400",

&#x20;                       "on-tertiary": "#ffffff",

&#x20;                       "primary-fixed-dim": "#cfbcff",

&#x20;                       "secondary-fixed-dim": "#ccc2dc",

&#x20;                       "surface-container-lowest": "#ffffff",

&#x20;                       "warning-low": "#F9EED9",

&#x20;                       "on-secondary": "#ffffff",

&#x20;                       "on-secondary-container": "#686177",

&#x20;                       "on-primary-fixed-variant": "#4f378a",

&#x20;                       "on-error-container": "#93000a",

&#x20;                       "surface-variant": "#e6e0e9",

&#x20;                       "error": "#ba1a1a",

&#x20;                       "on-primary-fixed": "#22005d",

&#x20;                       "warning-high": "#F2B8B5",

&#x20;                       "fat-burning": "#6750A4",

&#x20;                       "error-container": "#ffdad6",

&#x20;                       "on-primary-container": "#e0d2ff",

&#x20;                       "surface-container": "#f2ecf4",

&#x20;                       "secondary-container": "#e8def9",

&#x20;                       "surface-container-high": "#ece6ee",

&#x20;                       "primary-fixed": "#e9ddff",

&#x20;                       "surface-dim": "#ded8e0",

&#x20;                       "on-surface": "#1d1b20",

&#x20;                       "surface-bright": "#fdf7ff",

&#x20;                       "on-primary": "#ffffff",

&#x20;                       "on-error": "#ffffff",

&#x20;                       "background": "#fdf7ff",

&#x20;                       "primary-container": "#6750a4",

&#x20;                       "tertiary": "#765b00",

&#x20;                       "surface-container-low": "#f8f2fa",

&#x20;                       "hydration-blue": "#0288D1",

&#x20;                       "tertiary-fixed": "#ffdf93",

&#x20;                       "metabolic-shift": "#B69DF8",

&#x20;                       "secondary": "#625b71",

&#x20;                       "inverse-on-surface": "#f5eff7",

&#x20;                       "surface-tint": "#6750a4",

&#x20;                       "on-surface-variant": "#494551"

&#x20;                   },

&#x20;                   borderRadius: {

&#x20;                       "DEFAULT": "0.25rem",

&#x20;                       "lg": "0.5rem",

&#x20;                       "xl": "0.75rem",

&#x20;                       "full": "9999px"

&#x20;                   },

&#x20;                   spacing: {

&#x20;                       "stack-lg": "24px",

&#x20;                       "base": "8px",

&#x20;                       "stack-md": "12px",

&#x20;                       "stack-sm": "4px",

&#x20;                       "gutter": "16px",

&#x20;                       "margin-horizontal": "20px"

&#x20;                   },

&#x20;                   fontFamily: {

&#x20;                       "headline-md": \["manrope"],

&#x20;                       "body-md": \["inter"],

&#x20;                       "body-lg": \["inter"],

&#x20;                       "label-caps": \["lexend"],

&#x20;                       "display-timer": \["lexend"],

&#x20;                       "headline-lg": \["manrope"]

&#x20;                   },

&#x20;                   fontSize: {

&#x20;                       "headline-md": \["24px", { lineHeight: "32px", fontWeight: "600" }],

&#x20;                       "body-md": \["14px", { lineHeight: "20px", fontWeight: "400" }],

&#x20;                       "body-lg": \["16px", { lineHeight: "24px", fontWeight: "400" }],

&#x20;                       "label-caps": \["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "600" }],

&#x20;                       "display-timer": \["48px", { lineHeight: "56px", fontWeight: "700" }],

&#x20;                       "headline-lg": \["32px", { lineHeight: "40px", fontWeight: "600" }]

&#x20;                   }

&#x20;               }

&#x20;           }

&#x20;       }

&#x20;   </script>

<style>

&#x20;   body {

&#x20;     min-height: max(884px, 100dvh);

&#x20;   }

&#x20; </style>

&#x20; </head>

<body class="bg-background text-on-background min-h-screen font-body-md pb-\[120px] antialiased">

<!-- TopAppBar Shared Component -->

<header class="bg-slate-50 flex justify-between items-center w-full px-5 py-3 h-16 border-b border-purple-50 sticky top-0 z-40">

<div class="flex items-center gap-3">

<div class="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant flex items-center justify-center">

<img alt="User profile photo" class="w-full h-full object-cover" data-alt="A close-up portrait of a young woman with a soft, glowing complexion, lit by natural morning light to convey health and vitality. The background is slightly blurred with soft, warm tones that complement the overall modern, soft-health aesthetic of the app. Her expression is calm and confident." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOBXk5gXubnrk5yCjRwHKFeHIejWAtH0V4CVv0cxioXrp\_UkSDcvQfEBXxEPPuQQFeef-peSHjQo\_aF17TASNxeM1QF1wRP7vhzekT-JCnF5PHK504KcahvbVFf3Kl2TMV6NtEng8e1qhhoz9t8gA570Q28LdX16V6Xf06nZfbcW5MU90wK-UlR-MOMIImJ2kdWAvgvZv8G0rMHPNVTpptRbq729nHvC4Ki3YapScQb8dzR-yrWD1b5fmfk2t8kR9NUSQxX7UkfbKR"/>

</div>

<span class="text-xl font-black text-\[#6750A4] tracking-tight font-\['Manrope']">HabitLoop</span>

</div>

<button class="hover:bg-purple-50 transition-colors p-2 rounded-full flex items-center justify-center text-\[#6750A4]">

<span class="material-symbols-outlined text-\[24px]">notifications</span>

</button>

</header>

<!-- Main Content Canvas -->

<main class="px-margin-horizontal pt-stack-lg flex flex-col gap-stack-lg max-w-md mx-auto">

<!-- Header Context -->

<div class="flex flex-col gap-stack-sm text-center">

<h1 class="font-headline-lg text-headline-lg text-primary">You're Fasting</h1>

<p class="font-body-lg text-body-lg text-outline">Keep going, you're doing great.</p>

</div>

<!-- Hero Timer Component -->

<div class="relative flex justify-center items-center py-\[32px]">

<!-- Outer Glow / Soft Shadow for depth -->

<div class="absolute w-\[280px] h-\[280px] rounded-full shadow-\[0\_0\_40px\_rgba(103,80,164,0.15)] bg-surface-container-low/50 blur-md"></div>

<!-- SVG Circular Timer -->

<div class="relative w-\[300px] h-\[300px] flex items-center justify-center">

<svg class="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-sm" viewbox="0 0 100 100">

<!-- Background Track -->

<circle class="stroke-surface-variant" cx="50" cy="50" fill="transparent" r="42" stroke-width="6"></circle>

<!-- Progress Fill (Fat Burning Stage Color) -->

<circle class="stroke-fat-burning transition-all duration-1000 ease-in-out" cx="50" cy="50" fill="transparent" r="42" stroke-dasharray="264" stroke-dashoffset="80" stroke-linecap="round" stroke-width="6"></circle>

<!-- Decorative inner ring for technical precision feel -->

<circle class="stroke-outline-variant opacity-20" cx="50" cy="50" fill="transparent" r="34" stroke-dasharray="2 4" stroke-width="1"></circle>

</svg>

<!-- Timer Data -->

<div class="flex flex-col items-center z-10 text-center gap-2">

<div class="flex items-center gap-1 px-3 py-1 bg-surface-container rounded-full mb-1">

<span class="material-symbols-outlined text-\[14px] text-fat-burning" style="font-variation-settings: 'FILL' 1;">local\_fire\_department</span>

<span class="font-label-caps text-label-caps text-fat-burning uppercase tracking-wider">Fat Burning</span>

</div>

<span class="font-display-timer text-display-timer text-on-surface tracking-tighter" style="font-variant-numeric: tabular-nums;">14:32</span>

<div class="flex flex-col items-center">

<span class="font-body-md text-body-md text-on-surface-variant font-medium">Elapsed Time</span>

<span class="font-body-md text-body-md text-outline mt-1 bg-surface-container-lowest px-2 py-0.5 rounded-md border border-surface-variant">Goal: 16h</span>

</div>

</div>

</div>

</div>

<!-- Predicted Eating Window Card (Glassmorphism/Level 1 Elevation) -->

<div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-\[0\_4px\_12px\_rgba(0,0,0,0.03)] flex justify-between items-center relative overflow-hidden">

<!-- Subtle accent graphic -->

<div class="absolute -right-6 -top-6 w-20 h-20 bg-secondary-fixed rounded-full opacity-50 blur-xl"></div>

<div class="flex items-center gap-4 relative z-10">

<div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">

<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">restaurant</span>

</div>

<div class="flex flex-col">

<span class="font-body-md text-body-md text-on-surface font-semibold">Eating Window</span>

<span class="font-body-md text-body-md text-outline">Predicted start</span>

</div>

</div>

<div class="relative z-10 text-right">

<span class="font-headline-md text-headline-md text-primary block text-\[18px]">6:00 PM</span>

</div>

</div>

<!-- Protocol Picker -->

<div class="flex flex-col gap-stack-md mt-2">

<div class="flex justify-between items-end">

<h2 class="font-body-lg text-body-lg text-on-surface font-semibold">Fasting Protocol</h2>

<button class="text-primary font-body-md text-body-md font-medium flex items-center gap-1">

&#x20;                   Edit <span class="material-symbols-outlined text-\[16px]">edit</span>

</button>

</div>

<div class="flex gap-3 overflow-x-auto no-scrollbar py-1">

<!-- Inactive Chip -->

<button class="flex-shrink-0 px-5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-caps text-label-caps transition-colors">

&#x20;                   12:12

&#x20;               </button>

<!-- Inactive Chip -->

<button class="flex-shrink-0 px-5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-caps text-label-caps transition-colors">

&#x20;                   14:10

&#x20;               </button>

<!-- Active Chip -->

<button class="flex-shrink-0 px-5 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-caps text-label-caps border border-transparent shadow-sm flex items-center gap-2">

<span class="material-symbols-outlined text-\[16px]">check</span>

&#x20;                   16:8

&#x20;               </button>

<!-- Inactive Chip -->

<button class="flex-shrink-0 px-5 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-caps text-label-caps transition-colors">

&#x20;                   18:6

&#x20;               </button>

</div>

</div>

<!-- Primary Action -->

<div class="mt-4 mb-8">

<button class="w-full bg-primary text-on-primary rounded-full py-4 px-6 font-headline-md text-headline-md text-\[18px] shadow-\[0\_4px\_12px\_rgba(79,55,138,0.25)] hover:opacity-95 transition-all flex justify-center items-center gap-2">

<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">stop\_circle</span>

&#x20;               End Fast

&#x20;           </button>

<p class="text-center font-body-md text-body-md text-outline mt-3">You've reached 90% of your daily goal.</p>

</div>

</main>

<!-- BottomNavBar Shared Component -->

<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 pb-8 bg-white/80 backdrop-blur-md border-t border-purple-100/30 shadow-\[0\_-4px\_12px\_rgba(0,0,0,0.05)] rounded-t-3xl">

<!-- Home (Active State) -->

<button class="flex flex-col items-center justify-center bg-purple-100 text-\[#6750A4] rounded-2xl px-5 py-1.5 translate-y-\[-2px] transition-all duration-300 ease-out">

<span class="material-symbols-outlined mb-1 text-\[24px]" style="font-variation-settings: 'FILL' 1;">timer</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Home</span>

</button>

<!-- Water (Inactive) -->

<button class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600 transition-colors">

<span class="material-symbols-outlined mb-1 text-\[24px]">water\_drop</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Water</span>

</button>

<!-- Cycle (Inactive) -->

<button class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600 transition-colors">

<span class="material-symbols-outlined mb-1 text-\[24px]">calendar\_month</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Cycle</span>

</button>

<!-- Social (Inactive) -->

<button class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600 transition-colors">

<span class="material-symbols-outlined mb-1 text-\[24px]">group</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Social</span>

</button>

</nav>

</body></html>



<!-- Fasting Home -->

<!DOCTYPE html>



<html lang="en"><head>

<meta charset="utf-8"/>

<meta content="width=device-width, initial-scale=1.0" name="viewport"/>

<title>Water Tracker - HabitLoop</title>

<!-- Fonts -->

<link href="https://fonts.googleapis.com" rel="preconnect"/>

<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600\&amp;family=Lexend:wght@400;600;700\&amp;family=Manrope:wght@400;600;700;800;900\&amp;display=swap" rel="stylesheet"/>

<!-- Material Symbols -->

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<!-- Tailwind CSS -->

<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<!-- Tailwind Configuration -->

<script id="tailwind-config">

&#x20;     tailwind.config = {

&#x20;       darkMode: "class",

&#x20;       theme: {

&#x20;         extend: {

&#x20;           "colors": {

&#x20;                   "inverse-surface": "#322f35",

&#x20;                   "tertiary-container": "#c9a74d",

&#x20;                   "tertiary-fixed-dim": "#e7c365",

&#x20;                   "on-tertiary-container": "#503d00",

&#x20;                   "surface-container-highest": "#e6e0e9",

&#x20;                   "primary": "#4f378a",

&#x20;                   "on-tertiary-fixed": "#241a00",

&#x20;                   "surface": "#fdf7ff",

&#x20;                   "on-secondary-fixed": "#1e192b",

&#x20;                   "fed-state": "#E0E0E0",

&#x20;                   "on-background": "#1d1b20",

&#x20;                   "outline": "#7a7582",

&#x20;                   "outline-variant": "#cbc4d2",

&#x20;                   "inverse-primary": "#cfbcff",

&#x20;                   "secondary-fixed": "#e8def9",

&#x20;                   "early-fast": "#D0BCFF",

&#x20;                   "on-secondary-fixed-variant": "#4a4459",

&#x20;                   "on-tertiary-fixed-variant": "#594400",

&#x20;                   "on-tertiary": "#ffffff",

&#x20;                   "primary-fixed-dim": "#cfbcff",

&#x20;                   "secondary-fixed-dim": "#ccc2dc",

&#x20;                   "surface-container-lowest": "#ffffff",

&#x20;                   "warning-low": "#F9EED9",

&#x20;                   "on-secondary": "#ffffff",

&#x20;                   "on-secondary-container": "#686177",

&#x20;                   "on-primary-fixed-variant": "#4f378a",

&#x20;                   "on-error-container": "#93000a",

&#x20;                   "surface-variant": "#e6e0e9",

&#x20;                   "error": "#ba1a1a",

&#x20;                   "on-primary-fixed": "#22005d",

&#x20;                   "warning-high": "#F2B8B5",

&#x20;                   "fat-burning": "#6750A4",

&#x20;                   "error-container": "#ffdad6",

&#x20;                   "on-primary-container": "#e0d2ff",

&#x20;                   "surface-container": "#f2ecf4",

&#x20;                   "secondary-container": "#e8def9",

&#x20;                   "surface-container-high": "#ece6ee",

&#x20;                   "primary-fixed": "#e9ddff",

&#x20;                   "surface-dim": "#ded8e0",

&#x20;                   "on-surface": "#1d1b20",

&#x20;                   "surface-bright": "#fdf7ff",

&#x20;                   "on-primary": "#ffffff",

&#x20;                   "on-error": "#ffffff",

&#x20;                   "background": "#fdf7ff",

&#x20;                   "primary-container": "#6750a4",

&#x20;                   "tertiary": "#765b00",

&#x20;                   "surface-container-low": "#f8f2fa",

&#x20;                   "hydration-blue": "#0288D1",

&#x20;                   "tertiary-fixed": "#ffdf93",

&#x20;                   "metabolic-shift": "#B69DF8",

&#x20;                   "secondary": "#625b71",

&#x20;                   "inverse-on-surface": "#f5eff7",

&#x20;                   "surface-tint": "#6750a4",

&#x20;                   "on-surface-variant": "#494551"

&#x20;           },

&#x20;           "borderRadius": {

&#x20;                   "DEFAULT": "0.25rem",

&#x20;                   "lg": "0.5rem",

&#x20;                   "xl": "0.75rem",

&#x20;                   "full": "9999px"

&#x20;           },

&#x20;           "spacing": {

&#x20;                   "stack-lg": "24px",

&#x20;                   "base": "8px",

&#x20;                   "stack-md": "12px",

&#x20;                   "stack-sm": "4px",

&#x20;                   "gutter": "16px",

&#x20;                   "margin-horizontal": "20px"

&#x20;           },

&#x20;           "fontFamily": {

&#x20;                   "headline-md": \[

&#x20;                           "manrope"

&#x20;                   ],

&#x20;                   "body-md": \[

&#x20;                           "inter"

&#x20;                   ],

&#x20;                   "body-lg": \[

&#x20;                           "inter"

&#x20;                   ],

&#x20;                   "label-caps": \[

&#x20;                           "lexend"

&#x20;                   ],

&#x20;                   "display-timer": \[

&#x20;                           "lexend"

&#x20;                   ],

&#x20;                   "headline-lg": \[

&#x20;                           "manrope"

&#x20;                   ]

&#x20;           },

&#x20;           "fontSize": {

&#x20;                   "headline-md": \[

&#x20;                           "24px",

&#x20;                           {

&#x20;                                   "lineHeight": "32px",

&#x20;                                   "fontWeight": "600"

&#x20;                           }

&#x20;                   ],

&#x20;                   "body-md": \[

&#x20;                           "14px",

&#x20;                           {

&#x20;                                   "lineHeight": "20px",

&#x20;                                   "fontWeight": "400"

&#x20;                           }

&#x20;                   ],

&#x20;                   "body-lg": \[

&#x20;                           "16px",

&#x20;                           {

&#x20;                                   "lineHeight": "24px",

&#x20;                                   "fontWeight": "400"

&#x20;                           }

&#x20;                   ],

&#x20;                   "label-caps": \[

&#x20;                           "12px",

&#x20;                           {

&#x20;                                   "lineHeight": "16px",

&#x20;                                   "letterSpacing": "0.5px",

&#x20;                                   "fontWeight": "600"

&#x20;                           }

&#x20;                   ],

&#x20;                   "display-timer": \[

&#x20;                           "48px",

&#x20;                           {

&#x20;                                   "lineHeight": "56px",

&#x20;                                   "fontWeight": "700"

&#x20;                           }

&#x20;                   ],

&#x20;                   "headline-lg": \[

&#x20;                           "32px",

&#x20;                           {

&#x20;                                   "lineHeight": "40px",

&#x20;                                   "fontWeight": "600"

&#x20;                           }

&#x20;                   ]

&#x20;           }

&#x20;         }

&#x20;       }

&#x20;     }

&#x20;   </script>

<style>

&#x20;       body { background-color: #fdf7ff; /\* surface \*/ }

&#x20;   </style>

<style>

&#x20;   body {

&#x20;     min-height: max(884px, 100dvh);

&#x20;   }

&#x20; </style>

&#x20; </head>

<body class="antialiased text-on-surface">

<!-- TopAppBar -->

<header class="bg-slate-50 border-b border-purple-50 flex justify-between items-center w-full px-5 py-3 h-16 fixed top-0 z-50">

<div class="w-8 h-8 rounded-full bg-surface-variant overflow-hidden flex-shrink-0">

<img alt="User profile" class="w-full h-full object-cover" data-alt="A brightly lit, professional headshot of a smiling young woman with warm skin tones and natural makeup. She is positioned against a pristine, soft-white background, creating a high-key, modern aesthetic. The lighting is diffused and even, perfectly complementing the clear, crisp visual style of a premium health and wellness application." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAx1\_LRfTj4kteKJXycLycmhtZyqGPWJX8qNTMJg48bnvG38Yeswj7jKrd0ze4nZuX6QEUEM3K0Nm36U2hiCceCI\_hpSbQNtpgPPZCfFd2-vOGysJ4xvBMyChTWdbvIM8s5kS500aYpsu5awt5Uz7zInDgdBYOz6hhHcHvKG1G-zyTcVpQ6OVaa0E1oURlb1D-4FYnDmqIJLdL9KxJ\_3563yXn6PVsaqt-CnBa1WBOCy9GZJ9COo5I2BWLlaNtKDqL-WLc5icuISsJf"/>

</div>

<div class="font-\['Manrope'] font-black text-xl tracking-tight text-\[#6750A4]">

&#x20;           HabitLoop

&#x20;       </div>

<button class="hover:bg-purple-50 transition-colors p-2 rounded-full flex items-center justify-center active:scale-95 duration-150 text-\[#6750A4]">

<span class="material-symbols-outlined text-2xl">notifications</span>

</button>

</header>

<!-- Main Content Canvas -->

<main class="pt-\[88px] pb-\[120px] px-margin-horizontal max-w-md mx-auto min-h-screen flex flex-col">

<!-- Header -->

<div class="mb-stack-lg text-center mt-4">

<h1 class="font-headline-lg text-headline-lg text-on-surface">Hydration</h1>

<p class="font-body-md text-body-md text-on-surface-variant mt-1">Today's Goal: 2500ml</p>

</div>

<!-- Weather Adjustment Label -->

<div class="bg-warning-low rounded-lg py-2 px-4 flex items-center justify-center gap-2 mb-stack-lg mx-auto w-fit shadow-\[0\_4px\_12px\_rgba(0,0,0,0.02)] border border-tertiary-fixed-dim/30">

<span class="material-symbols-outlined text-on-tertiary-container text-sm" style="font-variation-settings: 'FILL' 1;">thermostat</span>

<span class="font-body-md text-body-md text-on-tertiary-container font-medium">+200ml for heat</span>

</div>

<!-- Hero: Progress Ring -->

<div class="flex justify-center items-center my-\[32px] relative w-72 h-72 mx-auto">

<svg class="w-full h-full transform -rotate-90" viewbox="0 0 100 100">

<!-- Track -->

<circle class="text-surface-variant/50" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" stroke-width="6"></circle>

<!-- Progress -->

<!-- Circumference = 2 \* pi \* r = 2 \* 3.14159 \* 42 = 263.89 -->

<!-- 50% = 131.9 -->

<circle class="text-hydration-blue transition-all duration-1000 ease-out" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" stroke-dasharray="264" stroke-dashoffset="132" stroke-linecap="round" stroke-width="6"></circle>

</svg>

<div class="absolute inset-0 flex flex-col items-center justify-center">

<span class="font-display-timer text-display-timer text-on-surface tracking-tight">1250</span>

<span class="font-body-md text-body-md text-on-surface-variant uppercase tracking-wider font-semibold mt-1">ml</span>

</div>

</div>

<!-- Quick Log Grid -->

<div class="mt-auto mb-4">

<h2 class="font-headline-md text-\[18px] font-semibold text-on-surface mb-stack-md px-1">Quick Log</h2>

<div class="grid grid-cols-2 gap-stack-md">

<!-- 150ml -->

<button class="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center justify-center gap-stack-sm shadow-\[0\_4px\_12px\_rgba(0,0,0,0.03)] border border-outline-variant/30 active:scale-95 transition-transform hover:bg-surface-container-low group">

<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-2 group-hover:bg-primary-fixed transition-colors">

<span class="material-symbols-outlined text-primary text-2xl">local\_cafe</span>

</div>

<span class="font-headline-md text-\[18px] font-bold text-on-surface">150ml</span>

<span class="font-body-md text-\[12px] text-on-surface-variant">Cup</span>

</button>

<!-- 250ml -->

<button class="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center justify-center gap-stack-sm shadow-\[0\_4px\_12px\_rgba(0,0,0,0.03)] border border-outline-variant/30 active:scale-95 transition-transform hover:bg-surface-container-low group">

<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-2 group-hover:bg-\[#E1F5FE] transition-colors">

<span class="material-symbols-outlined text-hydration-blue text-2xl">local\_drink</span>

</div>

<span class="font-headline-md text-\[18px] font-bold text-on-surface">250ml</span>

<span class="font-body-md text-\[12px] text-on-surface-variant">Glass</span>

</button>

<!-- 350ml -->

<button class="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center justify-center gap-stack-sm shadow-\[0\_4px\_12px\_rgba(0,0,0,0.03)] border border-outline-variant/30 active:scale-95 transition-transform hover:bg-surface-container-low group">

<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-2 group-hover:bg-secondary-fixed transition-colors">

<span class="material-symbols-outlined text-secondary text-2xl">emoji\_food\_beverage</span>

</div>

<span class="font-headline-md text-\[18px] font-bold text-on-surface">350ml</span>

<span class="font-body-md text-\[12px] text-on-surface-variant">Mug</span>

</button>

<!-- 500ml -->

<button class="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center justify-center gap-stack-sm shadow-\[0\_4px\_12px\_rgba(0,0,0,0.03)] border border-outline-variant/30 active:scale-95 transition-transform hover:bg-surface-container-low group">

<div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-2 group-hover:bg-\[#E1F5FE] transition-colors">

<span class="material-symbols-outlined text-hydration-blue text-2xl" style="font-variation-settings: 'FILL' 1;">water\_drop</span>

</div>

<span class="font-headline-md text-\[18px] font-bold text-on-surface">500ml</span>

<span class="font-body-md text-\[12px] text-on-surface-variant">Bottle</span>

</button>

</div>

</div>

</main>

<!-- BottomNavBar -->

<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 pb-8 bg-white/80 backdrop-blur-md rounded-t-3xl border-t border-purple-100/30 shadow-\[0\_-4px\_12px\_rgba(0,0,0,0.05)] md:hidden">

<!-- Home (Inactive) -->

<a class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600" href="#">

<span class="material-symbols-outlined text-2xl">timer</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide mt-1">Home</span>

</a>

<!-- Water (Active) -->

<a class="flex flex-col items-center justify-center bg-purple-100 text-\[#6750A4] rounded-2xl px-5 py-1.5 translate-y-\[-2px] transition-all duration-300 ease-out" href="#">

<span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">water\_drop</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide mt-1">Water</span>

</a>

<!-- Cycle (Inactive) -->

<a class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600" href="#">

<span class="material-symbols-outlined text-2xl">calendar\_month</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide mt-1">Cycle</span>

</a>

<!-- Social (Inactive) -->

<a class="flex flex-col items-center justify-center text-zinc-500 px-5 py-1.5 hover:text-purple-600" href="#">

<span class="material-symbols-outlined text-2xl">group</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide mt-1">Social</span>

</a>

</nav>

</body></html>



<!-- Water Tracker -->

<!DOCTYPE html>



<html lang="en"><head>

<meta charset="utf-8"/>

<meta content="width=device-width, initial-scale=1.0" name="viewport"/>

<title>Sign In - HabitLoop</title>

<!-- Material Symbols -->

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<!-- Google Fonts -->

<link href="https://fonts.googleapis.com" rel="preconnect"/>

<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600\&amp;family=Lexend:wght@600;700\&amp;family=Manrope:wght@600;700;800\&amp;display=swap" rel="stylesheet"/>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<!-- Tailwind CSS -->

<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<!-- Tailwind Configuration -->

<script id="tailwind-config">

&#x20;       tailwind.config = {

&#x20;           darkMode: "class",

&#x20;           theme: {

&#x20;               extend: {

&#x20;                   "colors": {

&#x20;                       "inverse-surface": "#322f35",

&#x20;                       "tertiary-container": "#c9a74d",

&#x20;                       "tertiary-fixed-dim": "#e7c365",

&#x20;                       "on-tertiary-container": "#503d00",

&#x20;                       "surface-container-highest": "#e6e0e9",

&#x20;                       "primary": "#4f378a",

&#x20;                       "on-tertiary-fixed": "#241a00",

&#x20;                       "surface": "#fdf7ff",

&#x20;                       "on-secondary-fixed": "#1e192b",

&#x20;                       "fed-state": "#E0E0E0",

&#x20;                       "on-background": "#1d1b20",

&#x20;                       "outline": "#7a7582",

&#x20;                       "outline-variant": "#cbc4d2",

&#x20;                       "inverse-primary": "#cfbcff",

&#x20;                       "secondary-fixed": "#e8def9",

&#x20;                       "early-fast": "#D0BCFF",

&#x20;                       "on-secondary-fixed-variant": "#4a4459",

&#x20;                       "on-tertiary-fixed-variant": "#594400",

&#x20;                       "on-tertiary": "#ffffff",

&#x20;                       "primary-fixed-dim": "#cfbcff",

&#x20;                       "secondary-fixed-dim": "#ccc2dc",

&#x20;                       "surface-container-lowest": "#ffffff",

&#x20;                       "warning-low": "#F9EED9",

&#x20;                       "on-secondary": "#ffffff",

&#x20;                       "on-secondary-container": "#686177",

&#x20;                       "on-primary-fixed-variant": "#4f378a",

&#x20;                       "on-error-container": "#93000a",

&#x20;                       "surface-variant": "#e6e0e9",

&#x20;                       "error": "#ba1a1a",

&#x20;                       "on-primary-fixed": "#22005d",

&#x20;                       "warning-high": "#F2B8B5",

&#x20;                       "fat-burning": "#6750A4",

&#x20;                       "error-container": "#ffdad6",

&#x20;                       "on-primary-container": "#e0d2ff",

&#x20;                       "surface-container": "#f2ecf4",

&#x20;                       "secondary-container": "#e8def9",

&#x20;                       "surface-container-high": "#ece6ee",

&#x20;                       "primary-fixed": "#e9ddff",

&#x20;                       "surface-dim": "#ded8e0",

&#x20;                       "on-surface": "#1d1b20",

&#x20;                       "surface-bright": "#fdf7ff",

&#x20;                       "on-primary": "#ffffff",

&#x20;                       "on-error": "#ffffff",

&#x20;                       "background": "#fdf7ff",

&#x20;                       "primary-container": "#6750a4",

&#x20;                       "tertiary": "#765b00",

&#x20;                       "surface-container-low": "#f8f2fa",

&#x20;                       "hydration-blue": "#0288D1",

&#x20;                       "tertiary-fixed": "#ffdf93",

&#x20;                       "metabolic-shift": "#B69DF8",

&#x20;                       "secondary": "#625b71",

&#x20;                       "inverse-on-surface": "#f5eff7",

&#x20;                       "surface-tint": "#6750a4",

&#x20;                       "on-surface-variant": "#494551"

&#x20;                   },

&#x20;                   "borderRadius": {

&#x20;                       "DEFAULT": "0.25rem",

&#x20;                       "lg": "0.5rem",

&#x20;                       "xl": "0.75rem",

&#x20;                       "full": "9999px"

&#x20;                   },

&#x20;                   "spacing": {

&#x20;                       "stack-lg": "24px",

&#x20;                       "base": "8px",

&#x20;                       "stack-md": "12px",

&#x20;                       "stack-sm": "4px",

&#x20;                       "gutter": "16px",

&#x20;                       "margin-horizontal": "20px"

&#x20;                   },

&#x20;                   "fontFamily": {

&#x20;                       "headline-md": \["manrope"],

&#x20;                       "body-md": \["inter"],

&#x20;                       "body-lg": \["inter"],

&#x20;                       "label-caps": \["lexend"],

&#x20;                       "display-timer": \["lexend"],

&#x20;                       "headline-lg": \["manrope"]

&#x20;                   },

&#x20;                   "fontSize": {

&#x20;                       "headline-md": \["24px", { "lineHeight": "32px", "fontWeight": "600" }],

&#x20;                       "body-md": \["14px", { "lineHeight": "20px", "fontWeight": "400" }],

&#x20;                       "body-lg": \["16px", { "lineHeight": "24px", "fontWeight": "400" }],

&#x20;                       "label-caps": \["12px", { "lineHeight": "16px", "letterSpacing": "0.5px", "fontWeight": "600" }],

&#x20;                       "display-timer": \["48px", { "lineHeight": "56px", "fontWeight": "700" }],

&#x20;                       "headline-lg": \["32px", { "lineHeight": "40px", "fontWeight": "600" }]

&#x20;                   }

&#x20;               }

&#x20;           }

&#x20;       }

&#x20;   </script>

<style>

&#x20;   body {

&#x20;     min-height: max(884px, 100dvh);

&#x20;   }

&#x20; </style>

&#x20; </head>

<body class="bg-surface text-on-surface antialiased min-h-screen flex flex-col items-center justify-center p-margin-horizontal selection:bg-primary-container selection:text-on-primary-container">

<!-- 

&#x20;       NOTE: TopAppBar and BottomNavBar are deliberately suppressed here per the 

&#x20;       "Automatic Suppression" rule for Linear/Transactional screens (Login). 

&#x20;   -->

<main class="w-full max-w-sm flex flex-col gap-stack-lg">

<!-- Brand / Header -->

<div class="flex flex-col items-center gap-stack-sm mb-4">

<div class="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mb-2 shadow-sm">

<span class="material-symbols-outlined text-4xl" data-icon="all\_inclusive" style="font-variation-settings: 'FILL' 0;">all\_inclusive</span>

</div>

<h1 class="font-headline-lg text-headline-lg text-primary text-center">HabitLoop</h1>

<p class="font-body-md text-body-md text-on-surface-variant text-center">Empathetic health tracking, synchronized with you.</p>

</div>

<!-- Sign In Form -->

<form class="flex flex-col gap-stack-md" onsubmit="event.preventDefault();">

<!-- Email Input (MD3 Outlined Style) -->

<div class="flex flex-col gap-stack-sm relative">

<label class="font-body-md text-body-md text-on-surface-variant ml-1 font-medium" for="email">Email Address</label>

<div class="relative">

<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" data-icon="mail">mail</span>

<input class="w-full bg-surface border border-outline rounded-lg pl-10 pr-4 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline-variant" id="email" placeholder="hello@example.com" required="" type="email"/>

</div>

</div>

<!-- Password Input (MD3 Outlined Style) -->

<div class="flex flex-col gap-stack-sm relative">

<div class="flex justify-between items-center ml-1">

<label class="font-body-md text-body-md text-on-surface-variant font-medium" for="password">Password</label>

<a class="font-body-md text-body-md text-primary font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-DEFAULT" href="#">Forgot Password?</a>

</div>

<div class="relative">

<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" data-icon="lock">lock</span>

<input class="w-full bg-surface border border-outline rounded-lg pl-10 pr-10 py-3 font-body-lg text-body-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline-variant" id="password" placeholder="••••••••" required="" type="password"/>

<button class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus:outline-none p-1 rounded-full" type="button">

<span class="material-symbols-outlined" data-icon="visibility">visibility</span>

</button>

</div>

</div>

<!-- Primary Action -->

<div class="pt-2">

<button class="w-full bg-primary text-on-primary py-3.5 rounded-full font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface transition-colors shadow-\[0\_2px\_4px\_rgba(0,0,0,0.1)] active:scale-\[0.98] uppercase" type="submit">

&#x20;                   Sign In

&#x20;               </button>

</div>

</form>

<!-- Divider -->

<div class="flex items-center gap-4 py-2">

<div class="h-px bg-outline-variant flex-1"></div>

<span class="font-body-md text-body-md text-outline">or</span>

<div class="h-px bg-outline-variant flex-1"></div>

</div>

<!-- Social Sign In -->

<button class="w-full border border-outline bg-surface text-on-surface py-3 rounded-full font-label-caps text-label-caps flex items-center justify-center gap-3 hover:bg-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface transition-colors active:scale-\[0.98] uppercase" type="button">

<svg class="w-5 h-5" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>

<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>

<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>

<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>

</svg>

&#x20;           Sign in with Google

&#x20;       </button>

<!-- Footer Link -->

<p class="font-body-md text-body-md text-on-surface-variant text-center mt-4">

&#x20;           Don't have an account? 

&#x20;           <a class="font-body-md text-body-md text-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-DEFAULT px-1" href="#">Create Account</a>

</p>

</main>

</body></html>



<!-- Sign In -->

<!DOCTYPE html>



<html lang="en"><head>

<meta charset="utf-8"/>

<meta content="width=device-width, initial-scale=1.0" name="viewport"/>

<title>Cycle Tracker</title>

<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1\&amp;display=swap" rel="stylesheet"/>

<style>

&#x20;       @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600\&family=Lexend:wght@600;700\&family=Manrope:wght@600;700;800\&display=swap');

&#x20;       .material-symbols-outlined {

&#x20;           font-family: 'Material Symbols Outlined';

&#x20;           font-weight: normal;

&#x20;           font-style: normal;

&#x20;           font-size: 24px;

&#x20;           line-height: 1;

&#x20;           letter-spacing: normal;

&#x20;           text-transform: none;

&#x20;           display: inline-block;

&#x20;           white-space: nowrap;

&#x20;           word-wrap: normal;

&#x20;           direction: ltr;

&#x20;           -webkit-font-feature-settings: 'liga';

&#x20;           -webkit-font-smoothing: antialiased;

&#x20;       }

&#x20;   </style>

<script id="tailwind-config">

&#x20;       tailwind.config = {

&#x20;           darkMode: "class",

&#x20;           theme: {

&#x20;               extend: {

&#x20;                   "colors": {

&#x20;                       "inverse-surface": "#322f35",

&#x20;                       "tertiary-container": "#c9a74d",

&#x20;                       "tertiary-fixed-dim": "#e7c365",

&#x20;                       "on-tertiary-container": "#503d00",

&#x20;                       "surface-container-highest": "#e6e0e9",

&#x20;                       "primary": "#4f378a",

&#x20;                       "on-tertiary-fixed": "#241a00",

&#x20;                       "surface": "#fdf7ff",

&#x20;                       "on-secondary-fixed": "#1e192b",

&#x20;                       "fed-state": "#E0E0E0",

&#x20;                       "on-background": "#1d1b20",

&#x20;                       "outline": "#7a7582",

&#x20;                       "outline-variant": "#cbc4d2",

&#x20;                       "inverse-primary": "#cfbcff",

&#x20;                       "secondary-fixed": "#e8def9",

&#x20;                       "early-fast": "#D0BCFF",

&#x20;                       "on-secondary-fixed-variant": "#4a4459",

&#x20;                       "on-tertiary-fixed-variant": "#594400",

&#x20;                       "on-tertiary": "#ffffff",

&#x20;                       "primary-fixed-dim": "#cfbcff",

&#x20;                       "secondary-fixed-dim": "#ccc2dc",

&#x20;                       "surface-container-lowest": "#ffffff",

&#x20;                       "warning-low": "#F9EED9",

&#x20;                       "on-secondary": "#ffffff",

&#x20;                       "on-secondary-container": "#686177",

&#x20;                       "on-primary-fixed-variant": "#4f378a",

&#x20;                       "on-error-container": "#93000a",

&#x20;                       "surface-variant": "#e6e0e9",

&#x20;                       "error": "#ba1a1a",

&#x20;                       "on-primary-fixed": "#22005d",

&#x20;                       "warning-high": "#F2B8B5",

&#x20;                       "fat-burning": "#6750A4",

&#x20;                       "error-container": "#ffdad6",

&#x20;                       "on-primary-container": "#e0d2ff",

&#x20;                       "surface-container": "#f2ecf4",

&#x20;                       "secondary-container": "#e8def9",

&#x20;                       "surface-container-high": "#ece6ee",

&#x20;                       "primary-fixed": "#e9ddff",

&#x20;                       "surface-dim": "#ded8e0",

&#x20;                       "on-surface": "#1d1b20",

&#x20;                       "surface-bright": "#fdf7ff",

&#x20;                       "on-primary": "#ffffff",

&#x20;                       "on-error": "#ffffff",

&#x20;                       "background": "#fdf7ff",

&#x20;                       "primary-container": "#6750a4",

&#x20;                       "tertiary": "#765b00",

&#x20;                       "surface-container-low": "#f8f2fa",

&#x20;                       "hydration-blue": "#0288D1",

&#x20;                       "tertiary-fixed": "#ffdf93",

&#x20;                       "metabolic-shift": "#B69DF8",

&#x20;                       "secondary": "#625b71",

&#x20;                       "inverse-on-surface": "#f5eff7",

&#x20;                       "surface-tint": "#6750a4",

&#x20;                       "on-surface-variant": "#494551"

&#x20;                   },

&#x20;                   "borderRadius": {

&#x20;                       "DEFAULT": "0.25rem",

&#x20;                       "lg": "0.5rem",

&#x20;                       "xl": "0.75rem",

&#x20;                       "full": "9999px"

&#x20;                   },

&#x20;                   "spacing": {

&#x20;                       "stack-lg": "24px",

&#x20;                       "base": "8px",

&#x20;                       "stack-md": "12px",

&#x20;                       "stack-sm": "4px",

&#x20;                       "gutter": "16px",

&#x20;                       "margin-horizontal": "20px"

&#x20;                   },

&#x20;                   "fontFamily": {

&#x20;                       "headline-md": \["manrope"],

&#x20;                       "body-md": \["inter"],

&#x20;                       "body-lg": \["inter"],

&#x20;                       "label-caps": \["lexend"],

&#x20;                       "display-timer": \["lexend"],

&#x20;                       "headline-lg": \["manrope"]

&#x20;                   },

&#x20;                   "fontSize": {

&#x20;                       "headline-md": \["24px", { "lineHeight": "32px", "fontWeight": "600" }],

&#x20;                       "body-md": \["14px", { "lineHeight": "20px", "fontWeight": "400" }],

&#x20;                       "body-lg": \["16px", { "lineHeight": "24px", "fontWeight": "400" }],

&#x20;                       "label-caps": \["12px", { "lineHeight": "16px", "letterSpacing": "0.5px", "fontWeight": "600" }],

&#x20;                       "display-timer": \["48px", { "lineHeight": "56px", "fontWeight": "700" }],

&#x20;                       "headline-lg": \["32px", { "lineHeight": "40px", "fontWeight": "600" }]

&#x20;                   }

&#x20;               }

&#x20;           }

&#x20;       }

&#x20;   </script>

<style>

&#x20;   body {

&#x20;     min-height: max(884px, 100dvh);

&#x20;   }

&#x20; </style>

&#x20; </head>

<body class="bg-background text-on-background font-body-md text-body-md antialiased pb-24">

<!-- TopAppBar -->

<header class="bg-slate-50 dark:bg-zinc-950 flex justify-between items-center w-full px-5 py-3 h-16 sticky top-0 z-50 shadow-\[0\_1px\_3px\_rgba(0,0,0,0.02)]">

<div class="flex items-center gap-stack-sm">

<img alt="User profile photo" class="w-8 h-8 rounded-full object-cover" data-alt="A close up portrait photo of a smiling woman with dark hair, used as a profile avatar. The image has a soft, natural lighting style typical of modern user interfaces. It sits within a clean, circular crop." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2uTBmn\_bdGu-XJ2jdpm1vpT1iqsGurS9DhLcXNQYgJFlPH7HZba6k26MVU0KcM7xI4Ygj\_NFyn9JIfxFAxOjBOLmmYbKxAbFTzQCPp36Ki\_p2rsglzSVBcPQfUTwkBzOgKF1Piw8ez\_1pDuaMuglCkAF1hyMREaE7WkmB4yal8dDCQtVXrcJ\_nXPuiTqEcdxiG3926o767XITEGfhUg8sa2xkapTlLI4WMgIdEVO\_oJ7JW\_FZvd3lOkNUovkwbX56-N3Y0fYDCvpQ"/>

</div>

<h1 class="text-xl font-black text-\[#6750A4] dark:text-purple-300 font-headline-md">HabitLoop</h1>

<button class="text-\[#6750A4] dark:text-purple-400 p-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">

<span class="material-symbols-outlined" data-icon="notifications">notifications</span>

</button>

</header>

<main class="px-margin-horizontal pt-stack-lg flex flex-col gap-stack-lg">

<!-- Warning Banner -->

<div class="bg-warning-low rounded-xl p-stack-md flex items-start gap-stack-sm shadow-sm">

<span class="material-symbols-outlined text-tertiary mt-0.5" data-icon="info" style="font-variation-settings: 'FILL' 1;">info</span>

<div>

<p class="font-body-lg text-body-lg text-on-tertiary-container font-medium">Consider shorter fasting windows.</p>

<p class="text-body-md text-on-tertiary-fixed-variant mt-1">Approaching late luteal phase. Prioritize rest and gentle 12:12 rhythms.</p>

</div>

</div>

<!-- Prominent Phase Card -->

<section class="bg-surface-container-lowest rounded-\[24px] p-stack-lg shadow-\[0\_4px\_24px\_rgba(0,0,0,0.04)] border-t-\[6px] border-primary-container relative overflow-hidden">

<div class="absolute -right-10 -top-10 w-32 h-32 bg-primary-container opacity-10 rounded-full blur-2xl"></div>

<div class="flex flex-col gap-stack-sm relative z-10">

<span class="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Current Phase</span>

<h2 class="font-headline-lg text-headline-lg text-primary">Follicular</h2>

<div class="flex items-center gap-2 mt-2">

<span class="material-symbols-outlined text-metabolic-shift" data-icon="bolt">bolt</span>

<span class="font-body-lg text-body-lg text-on-surface-variant">Rising Energy • Days 6-14</span>

</div>

<p class="text-body-md text-on-surface-variant mt-stack-md leading-relaxed">

&#x20;                   Estrogen is rising. This is a great time to push your fasting windows slightly or tackle higher-intensity workouts.

&#x20;               </p>

</div>

</section>

<!-- Calendar View -->

<section class="bg-surface-container rounded-xl p-stack-lg shadow-sm">

<div class="flex justify-between items-center mb-stack-md">

<h3 class="font-headline-md text-headline-md text-on-surface">Tracker</h3>

<button class="text-primary font-label-caps text-label-caps flex items-center gap-1">

&#x20;                   October <span class="material-symbols-outlined text-\[18px]" data-icon="expand\_more">expand\_more</span>

</button>

</div>

<div class="grid grid-cols-7 gap-y-stack-md text-center">

<!-- Days Header -->

<div class="text-label-caps font-label-caps text-outline">S</div>

<div class="text-label-caps font-label-caps text-outline">M</div>

<div class="text-label-caps font-label-caps text-outline">T</div>

<div class="text-label-caps font-label-caps text-outline">W</div>

<div class="text-label-caps font-label-caps text-outline">T</div>

<div class="text-label-caps font-label-caps text-outline">F</div>

<div class="text-label-caps font-label-caps text-outline">S</div>

<!-- Dates Grid (Simplified for example) -->

<div class="text-body-md text-outline py-2">29</div>

<div class="text-body-md text-outline py-2">30</div>

<div class="text-body-md text-on-surface py-2 relative">1<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error"></span></div>

<div class="text-body-md text-on-surface py-2 relative">2<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error"></span></div>

<div class="text-body-md text-on-surface py-2 relative">3<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error"></span></div>

<div class="text-body-md text-on-surface py-2 relative">4<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-error"></span></div>

<div class="text-body-md text-on-surface py-2 relative">5</div>

<div class="text-body-md text-on-surface py-2 relative">6</div>

<div class="text-body-md text-on-surface py-2 relative">7</div>

<div class="text-body-md text-on-surface py-2 relative">8</div>

<div class="text-body-md text-on-surface py-2 relative">9</div>

<div class="text-body-md text-on-primary bg-primary rounded-full py-2 font-medium shadow-md">10</div>

<div class="text-body-md text-on-surface py-2 relative">11</div>

<div class="text-body-md text-on-surface py-2 relative">12</div>

</div>

</section>

<!-- Symptom Logger -->

<section class="flex flex-col gap-stack-md">

<h3 class="font-headline-md text-headline-md text-on-surface">Log Symptoms</h3>

<div class="flex overflow-x-auto gap-stack-md pb-2 -mx-margin-horizontal px-margin-horizontal snap-x scrollbar-hide">

<!-- Mood Group -->

<div class="flex flex-col gap-stack-sm min-w-\[max-content] snap-start">

<span class="text-label-caps font-label-caps text-secondary ml-1">Mood</span>

<div class="flex gap-2">

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">😊</button>

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">😐</button>

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">😔</button>

</div>

</div>

<!-- Energy Group -->

<div class="flex flex-col gap-stack-sm min-w-\[max-content] snap-start border-l border-outline-variant/30 pl-4">

<span class="text-label-caps font-label-caps text-secondary ml-1">Energy</span>

<div class="flex gap-2">

<button class="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-2xl shadow-sm border border-primary-container">⚡</button>

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">🔋</button>

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">🪫</button>

</div>

</div>

<!-- Body Group -->

<div class="flex flex-col gap-stack-sm min-w-\[max-content] snap-start border-l border-outline-variant/30 pl-4 pr-margin-horizontal">

<span class="text-label-caps font-label-caps text-secondary ml-1">Body</span>

<div class="flex gap-2">

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">🎈</button>

<button class="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-2xl hover:bg-secondary-container transition-colors shadow-sm border border-outline-variant/30">💆‍♀️</button>

</div>

</div>

</div>

</section>

</main>

<!-- BottomNavBar -->

<nav class="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-t-3xl shadow-\[0\_-4px\_12px\_rgba(0,0,0,0.05)] dark:shadow-none fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-3 pb-8 md:hidden">

<button class="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 px-5 py-1.5 hover:text-purple-600 dark:hover:text-purple-300">

<span class="material-symbols-outlined mb-1" data-icon="timer">timer</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Home</span>

</button>

<button class="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 px-5 py-1.5 hover:text-purple-600 dark:hover:text-purple-300">

<span class="material-symbols-outlined mb-1" data-icon="water\_drop">water\_drop</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Water</span>

</button>

<!-- Active Tab -->

<button class="flex flex-col items-center justify-center bg-purple-100 dark:bg-purple-900/50 text-\[#6750A4] dark:text-purple-200 rounded-2xl px-5 py-1.5 translate-y-\[-2px] transition-all duration-300 ease-out">

<span class="material-symbols-outlined mb-1" data-icon="calendar\_month" style="font-variation-settings: 'FILL' 1;">calendar\_month</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Cycle</span>

</button>

<button class="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 px-5 py-1.5 hover:text-purple-600 dark:hover:text-purple-300">

<span class="material-symbols-outlined mb-1" data-icon="group">group</span>

<span class="font-\['Manrope'] text-\[11px] font-semibold tracking-wide">Social</span>

</button>

</nav>

</body></html>

