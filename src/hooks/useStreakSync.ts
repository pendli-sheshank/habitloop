import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/stores/user/useUserStore';
import type { StreakAggregate } from '@/types/auth';

/**
 * Subscribes to the user's streak aggregate document and keeps
 * useUserStore.streakAggregate in sync. Wire once in root layout.
 */
export function useStreakSync(): void {
  const authStatus = useUserStore(s => s.authStatus);
  const userId = useUserStore(s => s.user?.uid);
  const setStreakAggregate = useUserStore(s => s.setStreakAggregate);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return;

    const ref = doc(db, 'users', userId, 'aggregates', 'streak');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setStreakAggregate(snap.data() as StreakAggregate);
        }
      },
      (err) => console.error('[useStreakSync] snapshot error:', err),
    );

    return () => unsubscribe();
  }, [authStatus, userId, setStreakAggregate]);
}
