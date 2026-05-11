# SKILLS.md — HabitLoop
> Execution contract for building HabitLoop without breaking builds, state, or architecture.
> Read this alongside CONTEXT.md before every Claude Code session.
> This file defines HOW to build. For WHAT to build, see CONTEXT.md.
>
> **Last Updated:** May 2026 — Aligned with Expo SDK 55 and latest React Native 0.76.x
> Latest docs: https://docs.expo.dev/

---

## 0. Stable Version Lock (IMPORTANT)

These versions are chosen to avoid Expo / React Native / Reanimated conflicts.
**Do not upgrade any of these without checking Expo SDK compatibility first.**

Latest stable: **Expo SDK 55** with React 18.2.0 and React Native 0.76.x

```json
{
  "expo": "~55.0.0",
  "react": "18.2.0",
  "react-native": "0.76.x",
  "typescript": "~5.4.0"
}
```

| Rule | Detail |
|---|---|
| React 19 | NOT supported — causes Expo breakage |
| React Native 0.77+ | NOT supported — Reanimated + Expo instability |
| SDK packages | Always use `npx expo install` — never `npm install` for Expo packages |
| Package manager | Pick one: npm OR yarn. Never mix. |
| Node.js | LTS version required for development |
| TypeScript | Install with `npx expo install typescript @types/react --dev` |

---

## 1. Project Initialization (Locked Flow)

```bash
npx create-expo-app@latest habitloop --template default@sdk-55
cd habitloop
```

**Note:** The `default@sdk-55` template includes base TypeScript configuration and example code. For Expo Go deployments, use `--template default@sdk-54` instead.

### Install all Phase 1 dependencies

```bash
# TypeScript setup
npx expo install typescript @types/react --dev

# Expo-managed packages — always use npx expo install
npx expo install \
  expo-router \
  expo-notifications \
  expo-task-manager \
  expo-location \
  expo-haptics \
  react-native-svg \
  react-native-reanimated \
  react-native-gesture-handler \
  react-native-safe-area-context \
  react-native-screens \
  react-native-paper \
  @react-native-async-storage/async-storage \
  @tanstack/react-query \
  @expo/vector-icons

# Non-Expo packages
npm install zustand date-fns firebase cyclia

# Configure TypeScript
npx expo customize tsconfig.json
```

### app.json

```json
{
  "expo": {
    "name": "HabitLoop",
    "slug": "habitloop",
    "scheme": "habitloop",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "color": "#6B21A8",
          "defaultChannel": "default"
        }
      ],
      "expo-location"
    ],
    "ios": {
      "bundleIdentifier": "com.habitloop.app",
      "supportsTablet": false,
      "entitlements": {
        "aps-environment": "production"
      },
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification", "fetch"],
        "NSLocationWhenInUseUsageDescription": "Used to set weather-adjusted hydration goals."
      }
    },
    "android": {
      "package": "com.habitloop.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6B21A8"
      },
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### babel.config.js — Reanimated plugin MUST be last

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // MUST BE LAST — never move this
    ],
  };
};
```

### tsconfig.json — strict mode always on

Generate using: `npx expo customize tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Important:** Restart Expo CLI after modifying `tsconfig.json` for changes to take effect. Enable `strict` mode in `compilerOptions` to reduce runtime errors. Path aliases and absolute imports are automatically supported by the framework.

---

## 2. Build Stability Rules (Non-Negotiable)

```
NEVER manually upgrade Expo SDK packages
NEVER mix npm + yarn in the same project
NEVER install a React Native library without checking Expo compatibility
NEVER add plugins to babel.config.js above react-native-reanimated/plugin
```

Before installing any new library:
```bash
# Try Expo-managed first
npx expo install <package-name>

# After any install, verify health
npx expo-doctor

# Check code quality
npx expo lint
```

### Code Quality & Linting

Use ESLint for identifying and fixing errors before production. After SDK 53, projects use Flat config format.

```bash
npx expo lint
```

This command runs ESLint and catches anything not aligned with Prettier formatting. Install the VS Code ESLint extension for real-time feedback. Create a `.eslintignore` file to exclude directories like `node_modules` and `/.expo` for performance optimization.

---

## 2.5 TypeScript File Conventions

**File Extensions:**
- `.tsx` for React components (contains JSX)
- `.ts` for non-JSX TypeScript files (services, utils, types, hooks)

**Path Aliases:**
Framework automatically supports path aliases defined in `tsconfig.json`. Use clean imports:
```typescript
// CORRECT
import { useUserStore } from '@/stores/user/useUserStore';
import { Colors } from '@/constants/theme';

// AVOID
import { useUserStore } from '../../../../stores/user/useUserStore';
```

---

## 3. Architecture Model — 4 Clean Layers

```
UI LAYER          -> screens, components (display only)
      |
STORE LAYER       -> Zustand (local UI state only — no logic)
      |
SERVICE LAYER     -> all business logic (streak, XP, hydration, cycle)
      |
DATA LAYER        -> Firestore reads/writes, API calls
```

| Layer | Allowed | Forbidden |
|---|---|---|
| UI | render, call hooks, call store actions | Firestore calls, business logic, calculations |
| Zustand stores | set state, store session snapshots, UI toggles | Firestore calls, calculations, business logic |
| Services | all logic, calculations, validations | direct UI state mutation, component imports |
| Data layer | Firestore reads/writes, API fetch | UI rendering, business logic |

---

## 4. Directory Structure (Final Stable)

```
habitloop/
app/
  _layout.tsx               # Root layout: providers, auth gate, hydration
  (auth)/
    _layout.tsx
    sign-in.tsx
    onboarding.tsx            # 4-step wizard
  (tabs)/
    _layout.tsx               # Bottom tab navigator
    index.tsx                 # Fasting screen
    water.tsx                 # Hydration screen
    cycle.tsx                 # Cycle screen (Phase 1B)
    social.tsx                # Social screen (Phase 2)
src/
  components/
    fasting/
      FastingTimer.tsx
      ProtocolPicker.tsx
      FastingStageLabel.tsx
      EatingWindowBanner.tsx
    water/
      HydrationRing.tsx
      WaterLogButton.tsx
      HydrationStreak.tsx
    cycle/
      PhaseCard.tsx
      CycleCalendar.tsx
      SymptomLogger.tsx
      FastingWarningBanner.tsx
    social/
      GroupCard.tsx
      Leaderboard.tsx
      ChallengeCard.tsx
    shared/
      XPBar.tsx
      BadgeChip.tsx
      StreakCounter.tsx
      AppButton.tsx
  stores/
    ui/
      useUIStore.ts           # screen state, modals, loading flags
    session/
      useFastingStore.ts      # active session snapshot only
    user/
      useUserStore.ts         # profile cache, auth state
  services/
    fasting/
      fastingSession.ts       # start/end session logic
      streakEngine.ts         # streak calculation
      xpEngine.ts             # XP award logic
    water/
      hydrationGoal.ts        # goal calculation
      weatherApi.ts           # Open-Meteo fetch
    cycle/
      cycleEngine.ts          # phase inference, recommendations
    gamification/
      badgeEngine.ts          # badge trigger evaluation
  hooks/
    useFastingTimer.ts        # wall-clock timer hook
    useHydrationGoal.ts       # weather-adjusted goal
    useCyclePhase.ts          # current phase derivation
    useXP.ts                  # XP award trigger
  types/
    fasting.ts
    water.ts
    cycle.ts
    gamification.ts
  constants/
    theme.ts                  # Colors, Spacing, Radius, FontSize
    protocols.ts              # Fasting protocol definitions
    phases.ts                 # Cycle phase constants
  utils/
    dateUtils.ts              # UTC key generation, day comparison
    formatters.ts             # time display formatting
dev/
  state.json                  # Persistent dev memory (Section 17)
SKILLS.md
CONTEXT.md
app.json
babel.config.js
tsconfig.json
```

---

## 5. TypeScript Rules

```typescript
// CORRECT
type FastingProtocol = '12:12' | '14:10' | '16:8' | 'custom';

interface FastSession {
  id: string;
  startTime: number;          // Unix ms — ALWAYS numbers, never Date objects
  targetDurationMs: number;
  protocol: FastingProtocol;
  completed: boolean;
  xpEarned: number;
}

// WRONG
const session: any = {};
function getXP(s) { return s.xp; }
```

### Enums — always const objects, never enum keyword

```typescript
// CORRECT
export const CyclePhase = {
  MENSTRUATION: 'menstruation',
  FOLLICULAR:   'follicular',
  OVULATION:    'ovulation',
  LUTEAL:       'luteal',
} as const;
export type CyclePhaseType = typeof CyclePhase[keyof typeof CyclePhase];

// WRONG
enum CyclePhase { MENSTRUATION, FOLLICULAR }
```

---

## 6. Theme and Styling

```typescript
// src/constants/theme.ts — import from here, never hardcode values
export const Colors = {
  primary:      '#6B21A8',
  primaryLight: '#EDE9FE',
  primaryMid:   '#A78BFA',
  accent:       '#059669',
  warning:      '#D97706',
  danger:       '#DC2626',
  dark:         '#1E1B4B',
  gray:         '#6B7280',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F3F4F6',
  border:       '#E5E7EB',
  text:         '#111827',
  textMuted:    '#6B7280',
} as const;

export const Spacing  = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius   = { sm: 8, md: 12, lg: 20, full: 9999 } as const;
export const FontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, display: 40 } as const;
```

```typescript
// CORRECT — StyleSheet.create at module level
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt, padding: Spacing.md },
});

// WRONG — never inline styles with hardcoded values
// <View style={{ flex: 1, backgroundColor: '#6B21A8' }} />
```

---

## 7. State Management (Zustand Safe Model)

### Rule 1: Stores must be dumb

```
Stores hold:   state snapshots, UI toggles
Stores never:  Firestore calls, business logic, calculations
```

### Rule 2: Store separation

```
session store  -> active fast session only (startTime, protocol, status)
user store     -> profile cache only
ui store       -> screen-level state (modals, loading flags, tab state)
```

### Store anatomy

```typescript
// src/stores/session/useFastingStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastSession, FastingProtocol } from '@/types/fasting';

interface FastingState {
  activeSession: FastSession | null;
  selectedProtocol: FastingProtocol;
  setActiveSession: (session: FastSession | null) => void;
  setProtocol: (protocol: FastingProtocol) => void;
  _hydrate: () => void;
}

export const useFastingStore = create<FastingState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      selectedProtocol: '16:8',
      setActiveSession: (session) => set({ activeSession: session }),
      setProtocol: (protocol) => set({ selectedProtocol: protocol }),
      _hydrate: () => {
        const { activeSession } = get();
        if (!activeSession) return;
        const elapsed = Date.now() - activeSession.startTime;
        if (elapsed >= activeSession.targetDurationMs) {
          set({ activeSession: { ...activeSession, completed: true } });
        }
      },
    }),
    {
      name: 'fasting-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Selector rule — always specific, never full destructure

```typescript
// CORRECT
const protocol = useFastingStore(s => s.selectedProtocol);

// WRONG — causes unnecessary re-renders
const { selectedProtocol, activeSession } = useFastingStore();
```

---

## 8. Persistent Session Safety (Critical)

```
Everything time-based uses Unix ms (number type)

startTime: number    CORRECT
endTime:   number    CORRECT
new Date() in logic  WRONG
Date objects in store WRONG
formatted strings in logic WRONG
```

---

## 9. Timer Engine Rule (Wall-Clock Only)

```typescript
// src/hooks/useFastingTimer.ts
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFastingStore } from '@/stores/session/useFastingStore';

export function useFastingTimer() {
  const activeSession = useFastingStore(s => s.activeSession);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) { setRemaining(0); setElapsed(0); return; }

    const tick = () => {
      const now = Date.now();
      const elapsedMs = now - activeSession.startTime;
      const remainingMs = Math.max(0, activeSession.targetDurationMs - elapsedMs);
      setElapsed(elapsedMs);
      setRemaining(remainingMs);
    };

    tick();
    const interval = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') tick();
    });

    return () => { clearInterval(interval); sub.remove(); };
  }, [activeSession]);

  const progress = activeSession
    ? Math.min((Date.now() - activeSession.startTime) / activeSession.targetDurationMs, 1)
    : 0;

  return { remaining, elapsed, progress, isActive: !!activeSession };
}
```

```
Rules:
  NO background timers
  NO trust in setInterval for correctness
  ONLY: remaining = target - (Date.now() - startTime)
```

---

## 10. Notification Rules (Fixed System)

```
Rules:
  1. Cancel all notifications when session changes
  2. Reschedule from scratch — never patch existing schedules
  3. Channel must exist before scheduling (Android 8+)
```

```typescript
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';

export async function setupNotifications() {
  await Notifications.setNotificationChannelAsync('fasting', {
    name: 'Fasting Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('hydration', {
    name: 'Hydration Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleFastingReminders(startTime: number, targetMs: number) {
  // Step 1: Always cancel first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Step 2: Schedule from scratch
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Halfway there!', body: "You're halfway through your fast.", channelId: 'fasting' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(startTime + targetMs * 0.5) },
  });

  if (targetMs > 3_600_000) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Almost done!', body: '1 hour left in your fast.', channelId: 'fasting' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(startTime + targetMs - 3_600_000) },
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Fast Complete!', body: 'Time to break your fast.', channelId: 'fasting' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(startTime + targetMs) },
  });
}
```

---

## 11. Firestore Strategy (Optimized V2)

### Structure

```
users/{id}
  profile
  settings
  aggregates/
    today      -> fast read: today's water, fast status, streak count
    streak     -> fast read: current streak, longest streak

fastSessions/{id}   -> append-only
waterEvents/{id}    -> append-only
cycleLogs/{id}      -> append-only
```

### Rules

```
logs       = append-only, never modified after write
aggregates = updated on each event, always fast to read
streak     = NEVER computed from scanning logs — read from aggregates
```

### Firebase init

```typescript
// src/services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
```

---

## 12. Streak Engine (Final Rule)

```typescript
// src/services/fasting/streakEngine.ts
import { format } from 'date-fns';

export function getUTCDayKey(timestampMs: number): string {
  return format(new Date(timestampMs), 'yyyy-MM-dd');
}

export function updateStreak(
  currentStreak: number,
  lastStreakDate: string | null,
  sessionDate: string
): { newStreak: number; newLastDate: string } {
  // Idempotent — same day never increments twice
  if (lastStreakDate === sessionDate) {
    return { newStreak: currentStreak, newLastDate: lastStreakDate };
  }

  const yesterday = format(new Date(Date.now() - 86_400_000), 'yyyy-MM-dd');
  const isConsecutive = lastStreakDate === yesterday;
  const newStreak = isConsecutive ? currentStreak + 1 : 1;

  return { newStreak, newLastDate: sessionDate };
}
```

```
Rules:
  idempotent     — same UTC day never increments twice
  timezone-safe  — always use UTC key yyyy-MM-dd
  no log scans   — read from aggregates.streak only
```

---

## 13. Gamification Rules

```
XP awarded ONLY after Firestore write succeeds
XP NEVER stored only in Zustand (source of truth = Firestore)
Leaderboard computed server-side (Phase 2 — Cloud Functions)
Badge triggers evaluated in badgeEngine.ts, not in UI
```

```typescript
// src/services/fasting/xpEngine.ts
import type { FastingProtocol } from '@/types/fasting';

const XP_TABLE: Record<FastingProtocol, number> = {
  '12:12':  30,
  '14:10':  50,
  '16:8':   80,
  'custom': 60,
};

export const HYDRATION_GOAL_XP = 20;
export const STREAK_BONUS_7    = 100;
export const STREAK_BONUS_30   = 500;
export const CYCLE_LOG_XP      = 15;
export const SYMPTOM_LOG_XP    = 10;

export function calcFastXP(protocol: FastingProtocol, completed: boolean): number {
  return completed ? XP_TABLE[protocol] : 0;
}
```

---

## 14. Cycle Engine

```typescript
// src/services/cycle/cycleEngine.ts
import { differenceInDays } from 'date-fns';
import { CyclePhase } from '@/constants/phases';
import type { CyclePhaseType } from '@/types/cycle';

export function getCurrentPhase(
  lastPeriodStart: Date,
  avgCycleLength: number,
  avgPeriodLength = 5
): CyclePhaseType {
  const dayOfCycle = differenceInDays(new Date(), lastPeriodStart) + 1;
  if (dayOfCycle <= avgPeriodLength) return CyclePhase.MENSTRUATION;
  if (dayOfCycle <= 13)              return CyclePhase.FOLLICULAR;
  if (dayOfCycle <= 16)              return CyclePhase.OVULATION;
  return CyclePhase.LUTEAL;
}

export interface PhaseRecommendation {
  phase:               CyclePhaseType;
  recommendedProtocol: '12:12' | '14:10' | '16:8';
  warningLevel:        'none' | 'caution' | 'avoid';
  message:             string;
}

const RECOMMENDATIONS: Record<CyclePhaseType, PhaseRecommendation> = {
  menstruation: { phase: 'menstruation', recommendedProtocol: '12:12', warningLevel: 'avoid',
    message: 'Your body needs extra care. Stick to a gentle 12:12 and prioritize recovery.' },
  follicular: { phase: 'follicular', recommendedProtocol: '16:8', warningLevel: 'none',
    message: 'Estrogen is rising — great window for fasting. 16:8 is well tolerated.' },
  ovulation: { phase: 'ovulation', recommendedProtocol: '16:8', warningLevel: 'none',
    message: 'Peak energy phase. Any protocol works well right now.' },
  luteal: { phase: 'luteal', recommendedProtocol: '14:10', warningLevel: 'caution',
    message: 'Appetite increases are normal. Shorter windows reduce hormonal stress.' },
};

export function getFastingRecommendation(phase: CyclePhaseType): PhaseRecommendation {
  return RECOMMENDATIONS[phase];
}
```

```
Rules:
  No overlapping phases      — deterministic day ranges only
  Cyclia = advisory only     — not source of truth for phase
  Wrap all Cyclia calls in try/catch with manual fallback
```

---

## 15. Error Handling Rule

```
UI layer   — never throws, always catches
Services   — always wrapped in try/catch
On error   — fallback to cached state, log to console.error
No silent swallows — every catch must log
```

```typescript
// CORRECT pattern
async function safeSaveFastSession(userId: string, session: FastSession): Promise<void> {
  try {
    await saveFastSession(userId, session);
  } catch (e) {
    console.error('[Firestore] Failed to save fast session:', e);
    await cacheFailedWrite('fastSession', session);
  }
}
```

---

## 15.5 Development Environment Best Practices

**Installation & Setup:**
- Node.js LTS version required
- Use `npx expo install` for all Expo packages
- After adding new packages, run `npx expo-doctor` to verify compatibility
- Run `npx expo lint` before committing code changes

**VS Code Configuration:**
- Install the official Expo extension for enhanced development experience
- Install ESLint extension for real-time linting feedback
- The extension will provide warnings inline and can restart the server when needed

**Development Workflow:**
1. Make code changes
2. Run `npx expo lint` to check code quality
3. Review ESLint and Prettier formatting issues
4. Run tests with `npm test`
5. Commit when all checks pass

**Project Health Checks:**
```bash
# Type checking
npx tsc --noEmit

# SDK compatibility
npx expo-doctor

# Code quality
npx expo lint

# Tests
npm test
```

---

## 16. Testing Rule

Minimum required coverage before every deploy:

```typescript
// Required test files:
// src/services/fasting/__tests__/streakEngine.test.ts
// src/services/fasting/__tests__/xpEngine.test.ts
// src/services/water/__tests__/hydrationGoal.test.ts
// src/services/cycle/__tests__/cycleEngine.test.ts

describe('streakEngine', () => {
  it('increments on consecutive UTC day', () => {
    const result = updateStreak(3, '2026-05-04', '2026-05-05');
    expect(result.newStreak).toBe(4);
  });
  it('is idempotent for same day', () => {
    const result = updateStreak(3, '2026-05-05', '2026-05-05');
    expect(result.newStreak).toBe(3);
  });
  it('resets streak on gap', () => {
    const result = updateStreak(5, '2026-05-01', '2026-05-05');
    expect(result.newStreak).toBe(1);
  });
});
```

---

## 17. Persistent Development Memory System

This prevents architecture drift across Claude Code sessions.

**Every session must read /dev/state.json at the start and update it after every feature.**

### File: /dev/state.json (initial state)

```json
{
  "phase": "phase-1",
  "lastFeature": "",
  "completedModules": [],
  "pendingModules": [
    "firebase-init",
    "auth-service",
    "auth-error-handler",
    "user-store",
    "profile-service",
    "sign-in-screen",
    "register-screen",
    "forgot-password-screen",
    "onboarding-step-1-name",
    "onboarding-step-2-body",
    "onboarding-step-3-protocol",
    "onboarding-step-4-cycle",
    "route-guard",
    "profile-init-batch",
    "account-deletion-flow",
    "fasting-timer-core",
    "fasting-store",
    "fasting-service",
    "notifications-setup",
    "streak-engine",
    "xp-engine",
    "hydration-tracker",
    "hydration-goal-calc",
    "water-store",
    "water-service",
    "tab-navigation",
    "home-screen-ui",
    "water-screen-ui",
    "settings-screen",
    "profile-edit-screen"
  ],
  "knownIssues": [],
  "buildStatus": "not-started",
  "lastTested": null,
  "lastUpdated": null
}
```

### Rules

```
READ  state.json at start of every session
WRITE state.json after every completed feature
NEVER skip — prevents "lost progress architecture drift"
```

---

## 18. Feature Execution Order (Mandatory Step Flow)

Every new feature follows these 8 steps in order. Do not skip.

```
STEP 1 — DESIGN
  Define service function signatures and store shape before writing code

STEP 2 — TYPE DEFINITIONS
  Write all types in /src/types/ first

STEP 3 — SERVICE LOGIC
  Write and test the pure business logic function in /src/services/

STEP 4 — STORE HOOK
  Add state to the correct Zustand store (no logic — store only)

STEP 5 — UI COMPONENT
  Build the component using the hook, not the service directly

STEP 6 — FIRESTORE HOOK
  Wire TanStack Query or direct Firestore write for persistence

STEP 7 — TEST
  Write and run unit tests for the service logic

STEP 8 — UPDATE STATE SNAPSHOT
  Update /dev/state.json: mark module complete, update buildStatus
```

---

## 19. Build Process (Anti-Break System)

Before every commit — all three must pass:

```bash
npx tsc --noEmit      # zero type errors required
npx expo-doctor       # Expo SDK compatibility check
npm test              # all unit tests must pass
```

EAS build flow:

```bash
npm install -g eas-cli
eas login
eas build:configure

# Development build (required for push notifications — not Expo Go)
eas build --platform all --profile development

# Preview (internal testing)
eas build --platform all --profile preview

# Production
eas build --platform all --profile production

# OTA update (JS-only changes, no App Store review)
eas update --branch production --message "Description of change"
```

---

## 20. Build Stability — Expo/Metro/React Native Critical Errors

### 20.1 Strict Setup Rules (Non-Negotiable)

```
1. Use stable React Native setup ONLY
2. Prefer Expo managed workflow — do NOT mix Expo managed + bare React Native
3. Lock all versions — no floating versions
4. Node.js: 18 or 20 LTS only (no other versions)
5. React Native + Expo SDK MUST match official compatibility table
6. Never upgrade packages blindly without checking compatibility
```

### 20.2 Dependency Management & Installation (Critical Flow)

**REQUIRED Clean Install Procedure:**
```bash
# Step 1: Complete cleanup
rm -rf node_modules
rm -f package-lock.json  # or yarn.lock
npx expo cache clean    # Clear Expo cache

# Step 2: Fresh install with verified versions
npm install             # Fresh install from package.json

# Step 3: Verify health BEFORE running
npx expo-doctor         # Must pass all checks
npx tsc --noEmit        # Type check must pass

# Step 4: Start with cache reset
npx expo start -c       # -c flag clears Metro cache
```

**Rule:** If build fails, ALWAYS suspect these in order:
1. **Version mismatch** — check compatibility table
2. **Metro cache** — run with `-c` flag
3. **Native module incompatibility** — check Expo docs
4. Do NOT randomly reinstall without diagnosing root cause

### 20.3 Version Locking Strategy

**Never introduce unknown native libraries without checking compatibility first.**

Before installing ANY package:
```bash
# Check official compatibility
# https://docs.expo.dev/versions/latest/

npx expo install <package-name>  # Always use expo install for Expo packages
```

**Forbidden combinations:**
```
React 19 + Expo SDK 55 ❌
React Native 0.77+ + Expo SDK 55 ❌
Expo managed + bare React Native ❌
Mixed package managers (npm + yarn) ❌
Node.js versions other than 18/20 LTS ❌
```

### 20.4 Import & Circular Dependency Rules

```
All imports must resolve correctly BEFORE adding new features
No broken imports allowed
No circular imports allowed
Single entry file only (App.js or index.js, never both)
No duplicated config files (app.json, babel.config.js, tsconfig.json)
No mixed navigation setups (file-based + stack configured separately)
```

**Common import errors to prevent:**
```typescript
// WRONG — circular or broken import
import { useUserStore } from '@/hooks/useUser';  // hooks imports from stores
import { someStore } from '@/stores/userStore';  // stores import from hooks

// CORRECT — unidirectional dependency
// components import from hooks
// hooks import from stores
// stores never import from components or hooks
```

### 20.5 Firebase Initialization Crash (Silent Killer)

**Problem:** Firebase initializes invisibly during import, breaking Expo build

**Prevention:**
1. Firebase init MUST be in `src/services/firebase.ts` ONLY
2. Never import Firebase at component level
3. Always wrap Firebase calls in try/catch
4. Import Firebase only in service files, NOT in screens

```typescript
// CORRECT — isolated Firebase init
// src/services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
```

```typescript
// WRONG — Firebase imported at screen level
// screens/home.tsx
import { db } from 'firebase/firestore';  // ❌ BREAKS BUILD
```

### 20.6 Architecture Consistency Rules

Keep architecture lean:
```
Single entry point → App.js or app/_layout.tsx
No duplicated configuration
No mixed patterns (e.g., file-based routing + manual Stack)
Prefer simplicity over extra libraries
```

**If unsure whether to add a library: DON'T.** 

Libraries to avoid in Phase 1:
- Native modules without Expo support
- Beta or experimental Expo packages
- Libraries requiring Xcode/Android Studio configuration
- Any package without Expo compatibility documentation

### 20.7 Metro Cache Issues

Metro bundler can silently cache stale code. If behavior doesn't match code:

```bash
# Clear Metro cache
npx expo start -c

# Restart in clean state
rm -rf ~/.expo/cache
npx expo start -c
```

### 20.8 Common Build Errors & Solutions

| Error | Root Cause | Fix |
|---|---|---|
| `Metro has encountered an unexpected error` | Stale Metro cache | Run `npx expo start -c` |
| `Cannot find module '@/services/firebase'` | Import path doesn't resolve | Check `tsconfig.json` paths, verify file exists |
| `You attempted to use a native module that Expo doesn't support` | Incompatible native library | Remove package, find Expo-compatible alternative |
| `Invariant Violation: Expo not initialized` | Firebase init at wrong level | Move Firebase init to `src/services/firebase.ts` only |
| `RNPM: Linking (Expo)` repeated on start | Module linking conflict | Run clean install procedure (Section 20.2) |
| `Babel transform failed` | Plugin ordering wrong | Ensure `react-native-reanimated/plugin` is LAST |
| `ReferenceError: Firebase is not defined` | Firebase imported incorrectly | Import from `@/services/firebase`, never direct import |
| `TypeError: Cannot read property 'db' of undefined` | Firebase init timing issue | Wrap Firebase calls in try/catch, check initialization order |
| `Duplicate "React" import` | Mixed React imports | Use `import React from 'react'` OR skip if not using JSX |
| `TypeScript errors after upgrade` | Version mismatch | Run `npx tsc --noEmit` after any upgrade |

---

## 21. Common Failure Prevention Table (Business Logic)

| Problem | Root Cause | Fix |
|---|---|---|
| Timer desync after app kill | Using setInterval for wall clock | Use `Date.now() - startTime` only |
| Streak double-counts | No UTC key idempotency check | `lastStreakDate === sessionDate` guard |
| Notification duplication | Patching instead of cancelling | `cancelAllScheduledNotificationsAsync()` first |
| Firestore slow reads | Computing streak from logs | Use `aggregates/today` and `aggregates/streak` |
| State mismatch between screens | Merged store domains | Keep session / user / ui stores separate |
| Reanimated crash on start | Plugin not last in babel | `reanimated/plugin` must be last in plugins array |
| Push notifications silent on Android | No channel set | `setNotificationChannelAsync` before any schedule call |
| Lost progress between sessions | No dev memory | Read and update `/dev/state.json` every session |
