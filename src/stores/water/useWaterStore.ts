import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WaterLogEntry } from '@/types/water';

interface WaterState {
  todayDate: string;
  todayMl: number;
  goalMl: number;
  logs: WaterLogEntry[];
  goalMet: boolean;

  addLog: (entry: WaterLogEntry) => void;
  setGoalMl: (goalMl: number) => void;
  setGoalMet: (met: boolean) => void;
  resetDay: (date: string, goalMl: number) => void;
  clearWater: () => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set) => ({
      todayDate: '',
      todayMl: 0,
      goalMl: 2000,
      logs: [],
      goalMet: false,

      addLog: (entry) =>
        set((state) => ({
          todayMl: state.todayMl + entry.amountMl,
          logs: [...state.logs, entry],
        })),

      setGoalMl: (goalMl) => set({ goalMl }),

      setGoalMet: (goalMet) => set({ goalMet }),

      resetDay: (date, goalMl) =>
        set({
          todayDate: date,
          todayMl: 0,
          goalMl,
          logs: [],
          goalMet: false,
        }),

      clearWater: () =>
        set({
          todayDate: '',
          todayMl: 0,
          goalMl: 2000,
          logs: [],
          goalMet: false,
        }),
    }),
    {
      name: 'water-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
