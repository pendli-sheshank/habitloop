import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthStatus, AuthUser, UserProfile, StreakAggregate, Gender } from '@/types/auth';

interface UserState {
  authStatus: AuthStatus;
  user: AuthUser | null;
  profile: UserProfile | null;
  streakAggregate: StreakAggregate | null;
  isPremium: boolean;
  gender: Gender | null;

  setAuthStatus: (status: AuthStatus) => void;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setStreakAggregate: (aggregate: StreakAggregate | null) => void;
  setGender: (gender: Gender | null) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      authStatus:      'unknown',
      user:            null,
      profile:         null,
      streakAggregate: null,
      isPremium:       false,
      gender:          null,

      setAuthStatus:      (authStatus)      => set({ authStatus }),
      setUser:            (user)            => set({ user }),
      setProfile:         (profile)         => set({ profile }),
      setStreakAggregate: (streakAggregate) => set({ streakAggregate }),
      setGender:          (gender)          => set({ gender }),
      clearAuth: () => set({
        authStatus:      'unauthenticated',
        user:            null,
        profile:         null,
        streakAggregate: null,
        gender:          null,
      }),
    }),
    {
      name:    'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user:            state.user,
        profile:         state.profile,
        streakAggregate: state.streakAggregate,
        isPremium:       state.isPremium,
        gender:          state.gender,
      }),
    }
  )
);
