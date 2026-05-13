import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SymptomEntry } from '@/types/cycle';

interface CycleState {
  // Persisted cycle config (mirrors users/{uid}/settings.cycle)
  lastPeriodStart: string | null;  // ISO date YYYY-MM-DD
  avgCycleLength: number;          // default 28
  avgPeriodLength: number;         // default 5

  // Session-only symptom cache (cleared at midnight via setTodaySymptoms)
  todaySymptoms: SymptomEntry | null;
  // Date string the cached symptoms belong to (YYYY-MM-DD)
  symptomDate: string | null;

  // Actions — pure state setters, no logic
  setLastPeriodStart: (date: string) => void;
  setAvgCycleLength: (n: number) => void;
  setAvgPeriodLength: (n: number) => void;
  setTodaySymptoms: (symptoms: SymptomEntry, date: string) => void;
  clearTodaySymptoms: () => void;
  clearCycle: () => void;
}

export const useCycleStore = create<CycleState>()(
  persist(
    (set) => ({
      lastPeriodStart: null,
      avgCycleLength: 28,
      avgPeriodLength: 5,
      todaySymptoms: null,
      symptomDate: null,

      setLastPeriodStart: (date) => set({ lastPeriodStart: date }),
      setAvgCycleLength: (n) => set({ avgCycleLength: n }),
      setAvgPeriodLength: (n) => set({ avgPeriodLength: n }),
      setTodaySymptoms: (symptoms, date) => set({ todaySymptoms: symptoms, symptomDate: date }),
      clearTodaySymptoms: () => set({ todaySymptoms: null, symptomDate: null }),
      clearCycle: () => set({
        lastPeriodStart: null,
        avgCycleLength: 28,
        avgPeriodLength: 5,
        todaySymptoms: null,
        symptomDate: null,
      }),
    }),
    {
      name: 'cycle-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
