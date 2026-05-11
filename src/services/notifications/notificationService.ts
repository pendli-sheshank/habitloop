import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { ScheduledNotification } from '@/types/notifications';

// Lazy-load expo-notifications to avoid crash in Expo Go (SDK 53+).
// Remote notification support was removed from Expo Go — a dev build is required.
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (e) {
      console.warn('[notifications] expo-notifications not available (Expo Go):', e);
      return null;
    }
  }
  return Notifications;
}

const HOUR_MS = 3_600_000;
const HYDRATION_INTERVAL_MS = 90 * 60_000;

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const N = await getNotifications();
  if (!N) return;

  await N.setNotificationChannelAsync('fasting', {
    name: 'Fasting Reminders',
    importance: N.AndroidImportance.HIGH,
    sound: 'default',
  });

  await N.setNotificationChannelAsync('hydration', {
    name: 'Hydration Reminders',
    importance: N.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const N = await getNotifications();
  if (!N) return false;

  const { status: existing } = await N.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await N.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerPushToken(uid: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const N = await getNotifications();
  if (!N) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data: token } = await N.getExpoPushTokenAsync({ projectId });

  await updateDoc(doc(db, 'users', uid, 'profile', 'data'), {
    expoPushToken: token,
  });

  return token;
}

export function buildFastingNotifications(
  startTime: number,
  targetDurationMs: number,
): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const now = Date.now();

  const halfway = startTime + targetDurationMs * 0.5;
  if (halfway > now) {
    notifications.push({
      channel: 'fasting',
      title: 'Halfway there! 💪',
      body: 'You\'re halfway through your fast. Keep going!',
      triggerAt: halfway,
    });
  }

  const oneHourBefore = startTime + targetDurationMs - HOUR_MS;
  if (oneHourBefore > now && oneHourBefore > halfway) {
    notifications.push({
      channel: 'fasting',
      title: 'Almost done!',
      body: 'Just 1 hour left in your fasting window.',
      triggerAt: oneHourBefore,
    });
  }

  const complete = startTime + targetDurationMs;
  if (complete > now) {
    notifications.push({
      channel: 'fasting',
      title: 'Fast complete! 🎉',
      body: 'Congratulations! You\'ve completed your fast.',
      triggerAt: complete,
    });
  }

  return notifications;
}

export function buildHydrationReminders(
  startTime: number,
  targetDurationMs: number,
): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const now = Date.now();
  const endTime = startTime + targetDurationMs;

  let next = startTime + HYDRATION_INTERVAL_MS;
  while (next < endTime) {
    if (next > now) {
      notifications.push({
        channel: 'hydration',
        title: 'Time to hydrate 💧',
        body: 'Drink some water to stay on track during your fast.',
        triggerAt: next,
      });
    }
    next += HYDRATION_INTERVAL_MS;
  }

  return notifications;
}

async function scheduleNotification(n: ScheduledNotification): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  const secondsFromNow = Math.max(1, Math.round((n.triggerAt - Date.now()) / 1000));

  await N.scheduleNotificationAsync({
    content: {
      title: n.title,
      body: n.body,
      sound: 'default',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
      channelId: n.channel,
    },
  });
}

export async function scheduleFastingNotifications(
  startTime: number,
  targetDurationMs: number,
): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  await N.cancelAllScheduledNotificationsAsync();

  const fasting = buildFastingNotifications(startTime, targetDurationMs);
  const hydration = buildHydrationReminders(startTime, targetDurationMs);

  for (const n of [...fasting, ...hydration]) {
    await scheduleNotification(n);
  }
}
