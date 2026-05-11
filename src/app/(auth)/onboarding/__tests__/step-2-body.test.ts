import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';

describe('step-2-body store integration', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('setBodyStats persists weight and activity', () => {
    it('stores weight and low activity', () => {
      useOnboardingStore.getState().setBodyStats(55, 'low');
      const s = useOnboardingStore.getState();
      expect(s.weightKg).toBe(55);
      expect(s.activityLevel).toBe('low');
    });

    it('stores weight and moderate activity', () => {
      useOnboardingStore.getState().setBodyStats(70, 'moderate');
      const s = useOnboardingStore.getState();
      expect(s.weightKg).toBe(70);
      expect(s.activityLevel).toBe('moderate');
    });

    it('stores weight and high activity', () => {
      useOnboardingStore.getState().setBodyStats(85, 'high');
      const s = useOnboardingStore.getState();
      expect(s.weightKg).toBe(85);
      expect(s.activityLevel).toBe('high');
    });
  });

  describe('water goal preview matches store calculation', () => {
    function previewCalc(weightKg: number, activityLevel: 'low' | 'moderate' | 'high'): number {
      const base = weightKg * 33;
      const activityBonus = activityLevel === 'high' ? 600 : activityLevel === 'moderate' ? 300 : 0;
      return Math.round((base + activityBonus) / 50) * 50;
    }

    it.each([
      { weight: 50, activity: 'low' as const },
      { weight: 60, activity: 'moderate' as const },
      { weight: 70, activity: 'high' as const },
      { weight: 80, activity: 'low' as const },
      { weight: 100, activity: 'moderate' as const },
    ])('preview matches store for $weight kg / $activity', ({ weight, activity }) => {
      useOnboardingStore.getState().setBodyStats(weight, activity);
      const storeGoal = useOnboardingStore.getState().toOnboardingData().calculatedWaterGoalMl;
      const previewGoal = previewCalc(weight, activity);
      expect(previewGoal).toBe(storeGoal);
    });
  });

  describe('water goal edge cases', () => {
    it('handles very low weight', () => {
      useOnboardingStore.getState().setBodyStats(30, 'low');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 30 * 33 = 990, rounded to nearest 50 = 1000
      expect(data.calculatedWaterGoalMl).toBe(1000);
    });

    it('handles very high weight', () => {
      useOnboardingStore.getState().setBodyStats(150, 'high');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 150 * 33 + 600 = 5550, rounded to nearest 50 = 5550
      expect(data.calculatedWaterGoalMl).toBe(5550);
    });

    it('returns 0 for zero weight', () => {
      useOnboardingStore.getState().setBodyStats(0, 'moderate');
      const data = useOnboardingStore.getState().toOnboardingData();
      // 0 * 33 + 300 = 300, rounded to nearest 50 = 300
      expect(data.calculatedWaterGoalMl).toBe(300);
    });
  });

  describe('step-2 data survives back navigation', () => {
    it('retains body stats after setting other onboarding fields', () => {
      useOnboardingStore.getState().setBodyStats(65, 'moderate');
      useOnboardingStore.getState().setProtocol('14:10');

      const s = useOnboardingStore.getState();
      expect(s.weightKg).toBe(65);
      expect(s.activityLevel).toBe('moderate');
    });

    it('allows overwriting body stats on re-entry', () => {
      useOnboardingStore.getState().setBodyStats(65, 'moderate');
      useOnboardingStore.getState().setBodyStats(72, 'high');

      const s = useOnboardingStore.getState();
      expect(s.weightKg).toBe(72);
      expect(s.activityLevel).toBe('high');
    });
  });
});
