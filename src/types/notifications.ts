export type NotificationChannel = 'fasting' | 'hydration' | 'social';

export interface ScheduledNotification {
  channel: NotificationChannel;
  title: string;
  body: string;
  triggerAt: number; // Unix ms
}
