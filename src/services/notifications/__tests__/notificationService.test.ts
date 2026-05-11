jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 1 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'mock-id' } } },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/firebase', () => ({ db: '__MOCK_DB__' }));

import {
  buildFastingNotifications,
  buildHydrationReminders,
} from '../notificationService';

const HOUR = 3_600_000;
const MINUTE = 60_000;

describe('buildFastingNotifications', () => {
  it('returns 3 notifications for a future fast', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    expect(result).toHaveLength(3);
    expect(result[0].channel).toBe('fasting');
    expect(result[1].channel).toBe('fasting');
    expect(result[2].channel).toBe('fasting');
  });

  it('sets halfway notification at 50% of target', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    expect(result[0].triggerAt).toBe(startTime + target * 0.5);
    expect(result[0].title).toContain('Halfway');
  });

  it('sets 1-hour-before notification', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    expect(result[1].triggerAt).toBe(startTime + target - HOUR);
    expect(result[1].title).toContain('Almost');
  });

  it('sets completion notification at target end', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    expect(result[2].triggerAt).toBe(startTime + target);
    expect(result[2].title).toContain('complete');
  });

  it('skips past notifications', () => {
    const startTime = Date.now() - 10 * HOUR;
    const target = 16 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    for (const n of result) {
      expect(n.triggerAt).toBeGreaterThan(Date.now());
    }
  });

  it('skips 1-hour-before if too close to halfway (short fast)', () => {
    const startTime = Date.now() + HOUR;
    const target = 2 * HOUR;
    const result = buildFastingNotifications(startTime, target);

    const titles = result.map(n => n.title);
    expect(titles).toContain('Halfway there! 💪');
    expect(titles).toContain('Fast complete! 🎉');
    expect(titles).not.toContain('Almost done!');
  });
});

describe('buildHydrationReminders', () => {
  it('schedules reminders every 90 minutes during fast', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildHydrationReminders(startTime, target);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every(n => n.channel === 'hydration')).toBe(true);
  });

  it('spaces reminders at 90-minute intervals', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildHydrationReminders(startTime, target);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].triggerAt - result[i - 1].triggerAt).toBe(90 * MINUTE);
    }
  });

  it('first reminder is 90 minutes after start', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildHydrationReminders(startTime, target);

    expect(result[0].triggerAt).toBe(startTime + 90 * MINUTE);
  });

  it('does not schedule past the fast end time', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const endTime = startTime + target;
    const result = buildHydrationReminders(startTime, target);

    for (const n of result) {
      expect(n.triggerAt).toBeLessThan(endTime);
    }
  });

  it('skips past reminders for an in-progress fast', () => {
    const startTime = Date.now() - 5 * HOUR;
    const target = 16 * HOUR;
    const result = buildHydrationReminders(startTime, target);

    for (const n of result) {
      expect(n.triggerAt).toBeGreaterThan(Date.now());
    }
  });

  it('returns correct count for 16-hour fast from the start', () => {
    const startTime = Date.now() + HOUR;
    const target = 16 * HOUR;
    const result = buildHydrationReminders(startTime, target);

    // 90min intervals: 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15 = 10 reminders
    expect(result).toHaveLength(10);
  });
});
