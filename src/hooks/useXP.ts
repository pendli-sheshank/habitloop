import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { useUserStore } from '@/stores/user/useUserStore';
import { calcXpProgress } from '@/services/fasting/xpEngine';
import type { StreakAggregate } from '@/types/auth';
import type { LevelInfo } from '@/types/gamification';

export function useXP(): { streakAggregate: StreakAggregate | null; levelInfo: LevelInfo | null } {
  const user = useUserStore(s => s.user);
  const streakAggregate = useUserStore(s => s.streakAggregate);
  const setStreakAggregate = useUserStore(s => s.setStreakAggregate);

  useEffect(() => {
    if (!user) {
      setStreakAggregate(null);
      return;
    }

    const ref = doc(db, 'users', user.uid, 'aggregates', 'streak');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setStreakAggregate(snap.data() as StreakAggregate);
        }
      },
      (err) => console.error('[useXP] streak snapshot error:', err),
    );

    return () => unsubscribe();
  }, [user, setStreakAggregate]);

  const levelInfo = streakAggregate ? calcXpProgress(streakAggregate.xpTotal) : null;

  return { streakAggregate, levelInfo };
}
