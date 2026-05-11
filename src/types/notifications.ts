export type NotificationChannel = 'fasting' | 'hydration';

export interface ScheduledNotification {
  channel: NotificationChannel;
  title: string;
  body: string;
  triggerAt: number; // Unix ms
}
