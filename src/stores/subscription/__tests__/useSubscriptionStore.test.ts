import { useSubscriptionStore } from '../useSubscriptionStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function resetStore() {
  useSubscriptionStore.setState({
    tier: 'free',
    status: 'unknown',
    expiresAt: null,
    rcCustomerId: null,
    isPremium: false,
  });
}

beforeEach(resetStore);

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('defaults to free tier', () => {
    expect(useSubscriptionStore.getState().tier).toBe('free');
  });

  it('isPremium is false by default', () => {
    expect(useSubscriptionStore.getState().isPremium).toBe(false);
  });

  it('expiresAt is null by default', () => {
    expect(useSubscriptionStore.getState().expiresAt).toBeNull();
  });
});

// ─── setSubscriptionState ─────────────────────────────────────────────────────

describe('setSubscriptionState', () => {
  it('sets isPremium true when tier=pro and status=active', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro',
      status: 'active',
      expiresAt: '2027-01-01',
      rcCustomerId: 'rc-123',
    });
    const s = useSubscriptionStore.getState();
    expect(s.isPremium).toBe(true);
    expect(s.tier).toBe('pro');
    expect(s.expiresAt).toBe('2027-01-01');
    expect(s.rcCustomerId).toBe('rc-123');
  });

  it('isPremium is false when tier=pro but status=expired', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro',
      status: 'expired',
      expiresAt: '2025-01-01',
      rcCustomerId: 'rc-456',
    });
    expect(useSubscriptionStore.getState().isPremium).toBe(false);
  });

  it('isPremium is false when tier=pro but status=grace_period', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro',
      status: 'grace_period',
      expiresAt: '2026-06-01',
      rcCustomerId: 'rc-789',
    });
    expect(useSubscriptionStore.getState().isPremium).toBe(false);
  });

  it('isPremium is false for free tier regardless of status', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'free',
      status: 'active',
      expiresAt: null,
      rcCustomerId: null,
    });
    expect(useSubscriptionStore.getState().isPremium).toBe(false);
  });

  it('stores all fields correctly', () => {
    const state = { tier: 'pro' as const, status: 'active' as const, expiresAt: '2027-06-30', rcCustomerId: 'cust-1' };
    useSubscriptionStore.getState().setSubscriptionState(state);
    const s = useSubscriptionStore.getState();
    expect(s.tier).toBe('pro');
    expect(s.status).toBe('active');
    expect(s.expiresAt).toBe('2027-06-30');
    expect(s.rcCustomerId).toBe('cust-1');
  });
});

// ─── canAccess ────────────────────────────────────────────────────────────────

describe('canAccess', () => {
  it('returns false for all premium features when free', () => {
    const features = ['ai-meals', 'hormone-coaching', 'unlimited-groups', 'advanced-hydration'] as const;
    for (const f of features) {
      expect(useSubscriptionStore.getState().canAccess(f)).toBe(false);
    }
  });

  it('returns true for all premium features when pro+active', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro', status: 'active', expiresAt: null, rcCustomerId: null,
    });
    const features = ['ai-meals', 'hormone-coaching', 'unlimited-groups', 'advanced-hydration'] as const;
    for (const f of features) {
      expect(useSubscriptionStore.getState().canAccess(f)).toBe(true);
    }
  });

  it('returns false for premium features after downgrade to free', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro', status: 'active', expiresAt: null, rcCustomerId: null,
    });
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'free', status: 'expired', expiresAt: null, rcCustomerId: null,
    });
    expect(useSubscriptionStore.getState().canAccess('ai-meals')).toBe(false);
  });
});

// ─── clearSubscription ────────────────────────────────────────────────────────

describe('clearSubscription', () => {
  it('resets all fields to free defaults', () => {
    useSubscriptionStore.getState().setSubscriptionState({
      tier: 'pro', status: 'active', expiresAt: '2027-01-01', rcCustomerId: 'rc-1',
    });
    useSubscriptionStore.getState().clearSubscription();

    const s = useSubscriptionStore.getState();
    expect(s.tier).toBe('free');
    expect(s.status).toBe('unknown');
    expect(s.expiresAt).toBeNull();
    expect(s.rcCustomerId).toBeNull();
    expect(s.isPremium).toBe(false);
  });
});
