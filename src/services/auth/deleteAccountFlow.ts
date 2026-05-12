import * as Notifications from 'expo-notifications';
import { deleteAccount } from '@/services/auth/authService';
import { useUserStore } from '@/stores/user/useUserStore';

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // expo-notifications not available in some environments — safe to skip
  }
}

/**
 * Full account deletion sequence per CONTEXT.md §4.14:
 * 1. Delete Firestore data (atomic batch)
 * 2. Delete Firebase Auth account
 * 3. Cancel all scheduled notifications
 * 4. Clear Zustand stores
 *
 * If step 1 or 2 fails, throws — Auth account is preserved.
 * Steps 3-4 are best-effort cleanup after successful deletion.
 */
export async function performAccountDeletion(): Promise<void> {
  await deleteAccount();
  try { await cancelAllNotifications(); } catch { /* best-effort */ }
  useUserStore.getState().clearAuth();
}
