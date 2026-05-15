import { useOnboardingStore } from '@/stores/ui/useOnboardingStore';
import { PROTOCOL_OPTIONS } from '@/constants/protocols';

describe('step-3-protocol store integration', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('setProtocol persists selection', () => {
    it.each(['circadian', '15:9', '16:8'] as const)(
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
      useOnboardingStore.getState().setProtocol('circadian');
      useOnboardingStore.getState().setBodyStats(70, 'high');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('circadian');
    });

    it('retains protocol after setting display name', () => {
      useOnboardingStore.getState().setProtocol('15:9');
      useOnboardingStore.getState().setDisplayName('Jane');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('15:9');
    });
  });

  describe('protocol overwrites on re-entry', () => {
    it('allows changing protocol selection', () => {
      useOnboardingStore.getState().setProtocol('circadian');
      useOnboardingStore.getState().setProtocol('16:8');

      expect(useOnboardingStore.getState().defaultProtocol).toBe('16:8');
    });
  });

  describe('protocol included in onboarding data', () => {
    it('assembles selected protocol into OnboardingData', () => {
      useOnboardingStore.getState().setProtocol('15:9');
      const data = useOnboardingStore.getState().toOnboardingData();

      expect(data.defaultProtocol).toBe('15:9');
    });
  });
});

describe('PROTOCOL_OPTIONS constants', () => {
  it('has 12 protocols', () => {
    expect(PROTOCOL_OPTIONS).toHaveLength(12);
  });

  it('includes all daily TRF protocols', () => {
    const values = PROTOCOL_OPTIONS.map(o => o.value);
    expect(values).toContain('circadian');
    expect(values).toContain('15:9');
    expect(values).toContain('16:8');
    expect(values).toContain('18:6');
    expect(values).toContain('20:4');
    expect(values).toContain('omad');
  });

  it('includes all extended protocols', () => {
    const values = PROTOCOL_OPTIONS.map(o => o.value);
    expect(values).toContain('24h');
    expect(values).toContain('36h');
    expect(values).toContain('48h');
    expect(values).toContain('72h');
    expect(values).toContain('120h');
    expect(values).toContain('168h');
  });

  it('every option has a non-empty description', () => {
    for (const opt of PROTOCOL_OPTIONS) {
      expect(opt.description.length).toBeGreaterThan(0);
    }
  });

  it('every option has a positive fastHours', () => {
    for (const opt of PROTOCOL_OPTIONS) {
      expect(opt.fastHours).toBeGreaterThan(0);
    }
  });
});
