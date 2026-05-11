import { getRouteRedirect } from '../routeGuard';

describe('getRouteRedirect', () => {
  describe('unknown status', () => {
    it('returns null — no redirect while Firebase resolves', () => {
      expect(getRouteRedirect('unknown', [])).toBeNull();
      expect(getRouteRedirect('unknown', ['(auth)', 'sign-in'])).toBeNull();
      expect(getRouteRedirect('unknown', ['(tabs)'])).toBeNull();
    });
  });

  describe('unauthenticated', () => {
    it('redirects to sign-in when not in auth group', () => {
      expect(getRouteRedirect('unauthenticated', ['(tabs)'])).toBe('/(auth)/sign-in');
    });

    it('redirects to sign-in from root', () => {
      expect(getRouteRedirect('unauthenticated', [])).toBe('/(auth)/sign-in');
    });

    it('does not redirect when already in auth group', () => {
      expect(getRouteRedirect('unauthenticated', ['(auth)', 'sign-in'])).toBeNull();
    });

    it('does not redirect when on register screen', () => {
      expect(getRouteRedirect('unauthenticated', ['(auth)', 'register'])).toBeNull();
    });

    it('does not redirect when on forgot-password screen', () => {
      expect(getRouteRedirect('unauthenticated', ['(auth)', 'forgot-password'])).toBeNull();
    });
  });

  describe('needs-onboarding', () => {
    it('redirects to onboarding step 1 when not on onboarding', () => {
      expect(getRouteRedirect('needs-onboarding', ['(tabs)'])).toBe(
        '/(auth)/onboarding/step-1-name',
      );
    });

    it('redirects to onboarding from sign-in', () => {
      expect(getRouteRedirect('needs-onboarding', ['(auth)', 'sign-in'])).toBe(
        '/(auth)/onboarding/step-1-name',
      );
    });

    it('does not redirect when already on onboarding', () => {
      expect(
        getRouteRedirect('needs-onboarding', ['(auth)', 'onboarding', 'step-1-name']),
      ).toBeNull();
    });

    it('does not redirect on any onboarding step', () => {
      expect(
        getRouteRedirect('needs-onboarding', ['(auth)', 'onboarding', 'step-3-protocol']),
      ).toBeNull();
    });
  });

  describe('authenticated', () => {
    it('redirects to tabs when still in auth group', () => {
      expect(getRouteRedirect('authenticated', ['(auth)', 'sign-in'])).toBe('/(tabs)/');
    });

    it('redirects to tabs from onboarding after completion', () => {
      expect(
        getRouteRedirect('authenticated', ['(auth)', 'onboarding', 'step-4-cycle']),
      ).toBe('/(tabs)/');
    });

    it('does not redirect when already in tabs', () => {
      expect(getRouteRedirect('authenticated', ['(tabs)'])).toBeNull();
    });

    it('does not redirect on tabs sub-routes', () => {
      expect(getRouteRedirect('authenticated', ['(tabs)', 'water'])).toBeNull();
    });
  });
});
