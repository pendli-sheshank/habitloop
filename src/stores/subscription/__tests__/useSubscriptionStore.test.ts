import { useSubscriptionStore } from '../useSubscriptionStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  useSubscriptionStore.getState().clearSubscription();
});

describe('initial state', () => {
  it('defaults to pro tier (all features free)', () => {
    expect(useSubscriptionStore.getState().tier).toBe('pro');
  });

  it('isPremium is always true', () => {
    expect(useSubscriptionStore.getState().isPremium).toBe(true);
  });

  it('expiresAt is null by default', () => {
    expect(useSubscriptionStore.getState().expiresAt).toBeNull();
  });
});

describe('setSubscriptionState', () => {
  it('isPremium remains true even for expired status', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro',
      status: 'expired',
      expiresAt: '2025-01-01',
      rcCustomerId: 'rc-456',
    });
    expect(useSubscriptionStore.getState().isPremium).toBe(true);
  });

  it('isPremium remains true for free tier', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'free',
      status: 'active',
      expiresAt: null,
      rcCustomerId: null,
    });
    expect(useSubscriptionStore.getState().isPremium).toBe(true);
  });

  it('stores tier and status fields correctly', () => {
    const state = { tier: 'pro' as const, status: 'active' as const, expiresAt: '2027-06-30', rcCustomerId: 'cust-1' };
    useSubscriptionStore.getState().setSubscriptionState(state);
    const s = useSubscriptionStore.getState();
    expect(s.tier).toBe('pro');
    expect(s.status).toBe('active');
    expect(s.expiresAt).toBe('2027-06-30');
    expect(s.rcCustomerId).toBe('cust-1');
  });
});

describe('canAccess', () => {
  it('returns true for all premium features (all features free)', () => {
    const features = ['ai-meals', 'hormone-coaching', 'unlimited-groups', 'advanced-hydration'] as const;
    for (const f of features) {
      expect(useSubscriptionStore.getState().canAccess(f)).toBe(true);
    }
  });
});

describe('clearSubscription', () => {
  it('resets to pro/active with isPremium true', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'free', status: 'expired', expiresAt: '2025-01-01', rcCustomerId: 'rc-1',
    });
    useSubscriptionStore.getState().clearSubscription();

    const s = useSubscriptionStore.getState();
    expect(s.tier).toBe('pro');
    expect(s.status).toBe('active');
    expect(s.expiresAt).toBeNull();
    expect(s.rcCustomerId).toBeNull();
    expect(s.isPremium).toBe(true);
  });
});
