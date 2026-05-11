import { useUserStore } from '../useUserStore';
import type { AuthUser, UserProfile } from '@/types/auth';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockUser: AuthUser = {
  uid:         'test-uid-123',
  email:       'test@example.com',
  displayName: 'Test User',
  photoURL:    null,
  provider:    'email',
  createdAt:   1000000,
};

const mockProfile: UserProfile = {
  displayName:        'Test User',
  email:              'test@example.com',
  photoURL:           null,
  provider:           'email',
  onboardingComplete: true,
  createdAt:          1000000,
  lastActiveAt:       1000000,
  expoPushToken:      null,
};

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      authStatus: 'unknown',
      user:       null,
      profile:    null,
      isPremium:  false,
    });
  });

  describe('initial state', () => {
    it('authStatus starts as unknown', () => {
      expect(useUserStore.getState().authStatus).toBe('unknown');
    });

    it('user starts as null', () => {
      expect(useUserStore.getState().user).toBeNull();
    });

    it('profile starts as null', () => {
      expect(useUserStore.getState().profile).toBeNull();
    });

    it('isPremium is false in Phase 1', () => {
      expect(useUserStore.getState().isPremium).toBe(false);
    });
  });

  describe('setAuthStatus', () => {
    it('transitions to authenticated', () => {
      useUserStore.getState().setAuthStatus('authenticated');
      expect(useUserStore.getState().authStatus).toBe('authenticated');
    });

    it('transitions to needs-onboarding', () => {
      useUserStore.getState().setAuthStatus('needs-onboarding');
      expect(useUserStore.getState().authStatus).toBe('needs-onboarding');
    });

    it('transitions to unauthenticated', () => {
      useUserStore.getState().setAuthStatus('unauthenticated');
      expect(useUserStore.getState().authStatus).toBe('unauthenticated');
    });
  });

  describe('setUser', () => {
    it('stores the user object', () => {
      useUserStore.getState().setUser(mockUser);
      const user = useUserStore.getState().user;
      expect(user?.uid).toBe('test-uid-123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.provider).toBe('email');
    });

    it('accepts null to clear the user', () => {
      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setUser(null);
      expect(useUserStore.getState().user).toBeNull();
    });
  });

  describe('setProfile', () => {
    it('stores the profile object', () => {
      useUserStore.getState().setProfile(mockProfile);
      const profile = useUserStore.getState().profile;
      expect(profile?.onboardingComplete).toBe(true);
      expect(profile?.email).toBe('test@example.com');
    });

    it('accepts null to clear the profile', () => {
      useUserStore.getState().setProfile(mockProfile);
      useUserStore.getState().setProfile(null);
      expect(useUserStore.getState().profile).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('resets authStatus to unauthenticated', () => {
      useUserStore.getState().setAuthStatus('authenticated');
      useUserStore.getState().clearAuth();
      expect(useUserStore.getState().authStatus).toBe('unauthenticated');
    });

    it('clears user and profile', () => {
      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setProfile(mockProfile);
      useUserStore.getState().clearAuth();
      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().profile).toBeNull();
    });

    it('does not change isPremium', () => {
      useUserStore.getState().clearAuth();
      expect(useUserStore.getState().isPremium).toBe(false);
    });
  });
});
