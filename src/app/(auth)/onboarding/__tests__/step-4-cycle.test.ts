import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';

describe('step-4-cycle store integration', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('setCycleAndNotifications persists values', () => {
    it('stores date and notifications enabled', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-15', true);
      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBe('2026-04-15');
      expect(s.notificationsEnabled).toBe(true);
    });

    it('stores null date and notifications disabled', () => {
      useOnboardingStore.getState().setCycleAndNotifications(null, false);
      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBeNull();
      expect(s.notificationsEnabled).toBe(false);
    });
  });

  describe('cycle data in onboarding output', () => {
    it('includes lastPeriodStart when gender is female', () => {
      useOnboardingStore.getState().setGender('female');
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-10', true);
      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBe('2026-04-10');
    });

    it('nullifies lastPeriodStart when gender is male', () => {
      useOnboardingStore.getState().setGender('male');
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-10', true);
      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBeNull();
    });

    it('nullifies lastPeriodStart when gender is other', () => {
      useOnboardingStore.getState().setGender('other');
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-10', true);
      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBeNull();
    });

    it('includes notificationsEnabled in output', () => {
      useOnboardingStore.getState().setCycleAndNotifications(null, true);
      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.notificationsEnabled).toBe(true);
    });
  });

  describe('cycle data survives other field changes', () => {
    it('retains cycle data after changing protocol', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-15', true);
      useOnboardingStore.getState().setProtocol('12:12');

      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBe('2026-04-15');
      expect(s.notificationsEnabled).toBe(true);
    });

    it('retains cycle data after changing body stats', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-03-20', false);
      useOnboardingStore.getState().setBodyStats(70, 'high');

      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBe('2026-03-20');
      expect(s.notificationsEnabled).toBe(false);
    });
  });

  describe('cycle data overwrites on re-entry', () => {
    it('allows updating date and notification preference', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-01', false);
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-20', true);

      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBe('2026-04-20');
      expect(s.notificationsEnabled).toBe(true);
    });
  });

  describe('full onboarding data assembly', () => {
    it('assembles all 4 steps into complete OnboardingData', () => {
      const s = useOnboardingStore.getState();
      s.setDisplayName('Jane');
      s.setGender('female');
      s.setBodyStats(65, 'moderate');
      s.setProtocol('14:10');
      s.setCycleAndNotifications('2026-04-10', true);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.displayName).toBe('Jane');
      expect(data.gender).toBe('female');
      expect(data.weightKg).toBe(65);
      expect(data.activityLevel).toBe('moderate');
      expect(data.defaultProtocol).toBe('14:10');
      expect(data.lastPeriodStart).toBe('2026-04-10');
      expect(data.notificationsEnabled).toBe(true);
      expect(data.calculatedWaterGoalMl).toBeGreaterThan(0);
    });

    it('assembles with skipped cycle (null date)', () => {
      const s = useOnboardingStore.getState();
      s.setDisplayName('Jane');
      s.setGender('female');
      s.setBodyStats(60, 'low');
      s.setProtocol('16:8');
      s.setCycleAndNotifications(null, false);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBeNull();
      expect(data.notificationsEnabled).toBe(false);
    });
  });

  describe('reset clears cycle data', () => {
    it('resets lastPeriodStart and notificationsEnabled', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-15', true);
      useOnboardingStore.getState().reset();

      const s = useOnboardingStore.getState();
      expect(s.lastPeriodStart).toBeNull();
      expect(s.notificationsEnabled).toBe(false);
    });
  });
});

describe('date validation logic', () => {
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function isValidDate(text: string): boolean {
    if (!DATE_PATTERN.test(text)) return false;
    const d = new Date(text + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    const [y, m, day] = text.split('-').map(Number);
    if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return false;
    return d <= new Date();
  }

  it('accepts valid past date', () => {
    expect(isValidDate('2026-04-15')).toBe(true);
  });

  it('accepts today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isValidDate(today)).toBe(true);
  });

  it('rejects future date', () => {
    expect(isValidDate('2099-01-01')).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(isValidDate('04-15-2026')).toBe(false);
    expect(isValidDate('2026/04/15')).toBe(false);
    expect(isValidDate('April 15')).toBe(false);
  });

  it('rejects invalid calendar date', () => {
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-02-30')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDate('')).toBe(false);
  });
});
