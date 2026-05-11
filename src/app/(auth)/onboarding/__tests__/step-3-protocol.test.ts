import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';

describe('step-3-protocol store integration', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('setProtocol persists selection', () => {
    it.each(['12:12', '14:10', '16:8'] as const)(
      'stores %s protocol',
      (protocol) => {
        useOnboardingStore.getState().setProtocol(protocol);
        expect(useOnboardingStore.getState().defaultProtocol).toBe(protocol);
      },
    );
  });

  describe('default protocol', () => {
    it('defaults to 16:8', () => {
      expect(useOnboardingStore.getState().defaultProtocol).toBe('16:8');
    });
  });

  describe('protocol survives other field changes', () => {
    it('retains protocol after setting body stats', () => {
      useOnboardingStore.getState().setProtocol('12:12');
      useOnboardingStore.getState().setBodyStats(70, 'high');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('12:12');
    });

    it('retains protocol after setting display name', () => {
      useOnboardingStore.getState().setProtocol('14:10');
      useOnboardingStore.getState().setDisplayName('Jane');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('14:10');
    });
  });

  describe('protocol overwrites on re-entry', () => {
    it('allows changing protocol selection', () => {
      useOnboardingStore.getState().setProtocol('12:12');
      useOnboardingStore.getState().setProtocol('16:8');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('16:8');
    });
  });

  describe('protocol included in onboarding data', () => {
    it('assembles selected protocol into OnboardingData', () => {
      useOnboardingStore.getState().setProtocol('14:10');
      const data = useOnboardingStore.getState().toOnboardingData();

      expect(data.defaultProtocol).toBe('14:10');
    });
  });
});

describe('PROTOCOL_OPTIONS constants', () => {
  it('has exactly 3 options', () => {
    expect(PROTOCOL_OPTIONS).toHaveLength(3);
  });

  it('contains all three protocols', () => {
    const values = PROTOCOL_OPTIONS.map(o => o.value);
    expect(values).toEqual(['12:12', '14:10', '16:8']);
  });

  it('fast + eat hours sum to 24 for each protocol', () => {
    for (const opt of PROTOCOL_OPTIONS) {
      expect(opt.fastHours + opt.eatHours).toBe(24);
    }
  });

  it('every option has a non-empty description', () => {
    for (const opt of PROTOCOL_OPTIONS) {
      expect(opt.description.length).toBeGreaterThan(0);
    }
  });
});
