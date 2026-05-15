import { useOnboardingStore } from '../useOnboardingStore';

const initialState = {
  displayName: '',
  gender: 'female' as const,
  weightKg: 0,
  activityLevel: 'moderate' as const,
  defaultProtocol: '16:8' as const,
  lastPeriodStart: null,
  notificationsEnabled: false,
};

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with empty displayName', () => {
      expect(useOnboardingStore.getState().displayName).toBe('');
    });

    it('defaults gender to female', () => {
      expect(useOnboardingStore.getState().gender).toBe('female');
    });

    it('defaults protocol to 16:8', () => {
      expect(useOnboardingStore.getState().defaultProtocol).toBe('16:8');
    });
  });

  describe('setters', () => {
    it('setDisplayName stores trimmed name', () => {
      useOnboardingStore.getState().setDisplayName('Jane');
      expect(useOnboardingStore.getState().displayName).toBe('Jane');
    });

    it('setGender updates gender', () => {
      useOnboardingStore.getState().setGender('male');
      expect(useOnboardingStore.getState().gender).toBe('male');
    });

    it('setBodyStats updates weight and activity', () => {
      useOnboardingStore.getState().setBodyStats(70, 'high');
      expect(useOnboardingStore.getState().weightKg).toBe(70);
      expect(useOnboardingStore.getState().activityLevel).toBe('high');
    });

    it('setProtocol updates default protocol', () => {
      useOnboardingStore.getState().setProtocol('circadian');
      expect(useOnboardingStore.getState().defaultProtocol).toBe('circadian');
    });

    it('setCycleAndNotifications updates both fields', () => {
      useOnboardingStore.getState().setCycleAndNotifications('2026-04-15', true);
      expect(useOnboardingStore.getState().lastPeriodStart).toBe('2026-04-15');
      expect(useOnboardingStore.getState().notificationsEnabled).toBe(true);
    });
  });

  describe('toOnboardingData', () => {
    it('assembles complete OnboardingData', () => {
      const s = useOnboardingStore.getState();
      s.setDisplayName('Jane');
      s.setGender('female');
      s.setBodyStats(65, 'moderate');
      s.setProtocol('15:9');
      s.setCycleAndNotifications('2026-04-10', true);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.displayName).toBe('Jane');
      expect(data.gender).toBe('female');
      expect(data.weightKg).toBe(65);
      expect(data.activityLevel).toBe('moderate');
      expect(data.defaultProtocol).toBe('15:9');
      expect(data.lastPeriodStart).toBe('2026-04-10');
      expect(data.notificationsEnabled).toBe(true);
    });

    it('nullifies lastPeriodStart when gender is male', () => {
      const s = useOnboardingStore.getState();
      s.setGender('male');
      s.setCycleAndNotifications('2026-04-10', true);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBeNull();
    });

    it('nullifies lastPeriodStart when gender is other', () => {
      const s = useOnboardingStore.getState();
      s.setGender('other');
      s.setCycleAndNotifications('2026-04-10', false);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBeNull();
    });

    it('preserves lastPeriodStart when gender is female', () => {
      const s = useOnboardingStore.getState();
      s.setGender('female');
      s.setCycleAndNotifications('2026-04-10', true);

      const data = useOnboardingStore.getState().toOnboardingData();
      expect(data.lastPeriodStart).toBe('2026-04-10');
    });
  });

  describe('water goal calculation', () => {
    it('calculates base goal from weight (weightKg * 33)', () => {
      useOnboardingStore.getState().setBodyStats(60, 'low');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 60 * 33 = 1980, rounded to nearest 50 = 2000
      expect(data.calculatedWaterGoalMl).toBe(2000);
    });

    it('adds 300ml bonus for moderate activity', () => {
      useOnboardingStore.getState().setBodyStats(60, 'moderate');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 60 * 33 + 300 = 2280, rounded to nearest 50 = 2300
      expect(data.calculatedWaterGoalMl).toBe(2300);
    });

    it('adds 600ml bonus for high activity', () => {
      useOnboardingStore.getState().setBodyStats(60, 'high');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 60 * 33 + 600 = 2580, rounded to nearest 50 = 2600
      expect(data.calculatedWaterGoalMl).toBe(2600);
    });

    it('rounds to nearest 50ml', () => {
      useOnboardingStore.getState().setBodyStats(55, 'low');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 55 * 33 = 1815, rounded to nearest 50 = 1800
      expect(data.calculatedWaterGoalMl).toBe(1800);
    });
  });

  describe('reset', () => {
    it('restores all fields to initial state', () => {
      const s = useOnboardingStore.getState();
      s.setDisplayName('Jane');
      s.setGender('male');
      s.setBodyStats(75, 'high');
      s.setProtocol('circadian');
      s.setCycleAndNotifications('2026-04-10', true);

      useOnboardingStore.getState().reset();
      const state = useOnboardingStore.getState();
      expect(state.displayName).toBe(initialState.displayName);
      expect(state.gender).toBe(initialState.gender);
      expect(state.weightKg).toBe(initialState.weightKg);
      expect(state.activityLevel).toBe(initialState.activityLevel);
      expect(state.defaultProtocol).toBe(initialState.defaultProtocol);
      expect(state.lastPeriodStart).toBe(initialState.lastPeriodStart);
      expect(state.notificationsEnabled).toBe(initialState.notificationsEnabled);
    });
  });
});
