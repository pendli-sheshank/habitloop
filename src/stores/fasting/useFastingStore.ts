import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastingProtocol, ActiveFastState, FastCompletionResult } from '@/types/fasting';

interface FastingState {
  activeFast: ActiveFastState | null;
  lastCompletedAt: number | null;
  selectedProtocol: FastingProtocol;
  completedToday: boolean;
  lastCompletionResult: FastCompletionResult | null;

  setSelectedProtocol: (protocol: FastingProtocol) => void;
  startFast: (protocol: FastingProtocol, targetDurationMs: number) => void;
  completeFast: (result: FastCompletionResult) => void;
  cancelFast: () => void;
  resetDaily: () => void;
  clearFasting: () => void;
  clearCompletionResult: () => void;
}

export const useFastingStore = create<FastingState>()(
  persist(
    (set) => ({
      activeFast: null,
      lastCompletedAt: null,
      selectedProtocol: '16:8',
      completedToday: false,
      lastCompletionResult: null,

      setSelectedProtocol: (selectedProtocol) => set({ selectedProtocol }),

      startFast: (protocol, targetDurationMs) =>
        set({
          activeFast: {
            startTime: Date.now(),
            targetDurationMs,
            protocol,
          },
          lastCompletionResult: null,
        }),

      completeFast: (result) =>
        set({
          activeFast: null,
          lastCompletedAt: Date.now(),
          completedToday: true,
          lastCompletionResult: result,
        }),

      cancelFast: () =>
        set({ activeFast: null }),

      resetDaily: () =>
        set({ completedToday: false }),

      clearFasting: () =>
        set({
          activeFast: null,
          lastCompletedAt: null,
          selectedProtocol: '16:8',
          completedToday: false,
          lastCompletionResult: null,
        }),

      clearCompletionResult: () =>
        set({ lastCompletionResult: null }),
    }),
    {
      name: 'fasting-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
