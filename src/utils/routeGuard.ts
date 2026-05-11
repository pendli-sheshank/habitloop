import type { AuthStatus } from '@/types/auth';

export type RouteRedirect =
  | '/(auth)/sign-in'
  | '/(auth)/onboarding/step-1-name'
  | '/(tabs)/'
  | null;

export function getRouteRedirect(
  authStatus: AuthStatus,
  segments: string[],
): RouteRedirect {
  if (authStatus === 'unknown') return null;

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[1] === 'onboarding';

  if (authStatus === 'unauthenticated' && !inAuthGroup) {
    return '/(auth)/sign-in';
  }
  if (authStatus === 'needs-onboarding' && !inOnboarding) {
    return '/(auth)/onboarding/step-1-name';
  }
  if (authStatus === 'authenticated' && inAuthGroup) {
    return '/(tabs)/';
  }

  return null;
}
