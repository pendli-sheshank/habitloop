import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Group, LeaderboardEntry } from '@/types/group';

interface GroupState {
  // Persisted — survives app restarts
  groups: Group[];
  selectedGroupId: string | null;

  // Session cache — keyed by groupId, cleared on day rollover
  todayCheckIns: Record<string, boolean>;   // groupId → checked in today?
  checkInDate: string | null;               // YYYY-MM-DD the cache belongs to

  // Leaderboard cache — keyed by groupId, refreshed on screen focus
  leaderboards: Record<string, LeaderboardEntry[]>;

  // Actions — pure state setters, no logic or Firestore calls
  setGroups: (groups: Group[]) => void;
  upsertGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  setSelectedGroupId: (id: string | null) => void;
  setCheckIn: (groupId: string, done: boolean, date: string) => void;
  clearCheckInCache: () => void;
  setLeaderboard: (groupId: string, entries: LeaderboardEntry[]) => void;
  clearGroups: () => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      selectedGroupId: null,
      todayCheckIns: {},
      checkInDate: null,
      leaderboards: {},

      setGroups: (groups) => set({ groups }),

      upsertGroup: (group) => set((state) => {
        const others = state.groups.filter(g => g.id !== group.id);
        return { groups: [...others, group] };
      }),

      removeGroup: (groupId) => set((state) => ({
        groups: state.groups.filter(g => g.id !== groupId),
        selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
        leaderboards: Object.fromEntries(
          Object.entries(state.leaderboards).filter(([id]) => id !== groupId),
        ),
      })),

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      setCheckIn: (groupId, done, date) => set((state) => {
        // Clear stale cache when the date rolls over
        const currentDate = state.checkInDate;
        const freshCache = currentDate === date ? state.todayCheckIns : {};
        return {
          todayCheckIns: { ...freshCache, [groupId]: done },
          checkInDate: date,
        };
      }),

      clearCheckInCache: () => set({ todayCheckIns: {}, checkInDate: null }),

      setLeaderboard: (groupId, entries) => set((state) => ({
        leaderboards: { ...state.leaderboards, [groupId]: entries },
      })),

      clearGroups: () => set({
        groups: [],
        selectedGroupId: null,
        todayCheckIns: {},
        checkInDate: null,
        leaderboards: {},
      }),
    }),
    {
      name: 'group-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Leaderboards are large and stale quickly — exclude from persistence
      partialize: (state) => ({
        groups: state.groups,
        selectedGroupId: state.selectedGroupId,
        todayCheckIns: state.todayCheckIns,
        checkInDate: state.checkInDate,
      }),
    },
  ),
);
