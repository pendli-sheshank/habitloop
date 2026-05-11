import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUserStore } from '@/stores/user/useUserStore';
import { useWaterStore } from '@/stores/water/useWaterStore';
import { loadTodayWater } from '@/services/water/waterService';
import { getUTCDayKey } from '@/utils/dateUtils';

/**
 * Syncs the water store with Firestore on sign-in and handles
 * day-reset when the app foregrounds on a new UTC day.
 *
 * Wire once in root layout — runs whenever authStatus becomes 'authenticated'.
 */
export function useWaterSync(): void {
  const authStatus = useUserStore(s => s.authStatus);
  const userId = useUserStore(s => s.user?.uid);
  const todayDate = useWaterStore(s => s.todayDate);
  const goalMl = useWaterStore(s => s.goalMl);
  const resetDay = useWaterStore(s => s.resetDay);
  const addLog = useWaterStore(s => s.addLog);
  const setGoalMet = useWaterStore(s => s.setGoalMet);
  const hasLoadedRef = useRef(false);

  // Load today's water from Firestore on authentication
  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) {
      hasLoadedRef.current = false;
      return;
    }

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const today = getUTCDayKey(Date.now());

    // If the store's date is stale, reset first
    if (todayDate !== today) {
      resetDay(today, goalMl);
    }

    // Load from Firestore and reconcile
    loadTodayWater(userId)
      .then((data) => {
        if (!data) return; // No Firestore data for today — fresh day

        // Firestore has today's data — update store to match
        const currentDate = getUTCDayKey(Date.now());
        if (data.date === currentDate) {
          // Reset store to Firestore's values (Firestore is source of truth)
          resetDay(currentDate, data.waterGoalMl);

          // Restore the total as a single synthetic log entry
          if (data.waterMl > 0) {
            addLog({
              id: `sync-${Date.now()}`,
              amountMl: data.waterMl,
              loggedAt: Date.now(),
            });
          }

          if (data.waterGoalMet) {
            setGoalMet(true);
          }
        }
      })
      .catch((e) => {
        console.error('[useWaterSync] Failed to load today water:', e);
      });
  }, [authStatus, userId]);

  // Day-reset on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      const today = getUTCDayKey(Date.now());
      if (todayDate && todayDate !== today) {
        resetDay(today, goalMl);
      }
    });

    return () => subscription.remove();
  }, [todayDate, goalMl, resetDay]);
}
