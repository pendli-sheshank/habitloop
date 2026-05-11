import { getAuthErrorMessage } from '../authErrors';

describe('getAuthErrorMessage', () => {
  const knownCodes: [string, string][] = [
    ['auth/email-already-in-use',   'An account with this email already exists. Try signing in.'],
    ['auth/invalid-email',          'Please enter a valid email address.'],
    ['auth/weak-password',          'Password must be at least 8 characters.'],
    ['auth/wrong-password',         'Incorrect password. Please try again.'],
    ['auth/invalid-credential',     'Incorrect password. Please try again.'],
    ['auth/user-not-found',         'No account found with this email.'],
    ['auth/too-many-requests',      'Too many attempts. Please wait a few minutes and try again.'],
    ['auth/network-request-failed', 'No internet connection. Please check your network.'],
    ['auth/user-disabled',          'This account has been disabled. Please contact support.'],
    ['auth/popup-closed-by-user',   'Google sign-in was cancelled.'],
  ];

  it.each(knownCodes)('maps %s to the correct user-facing message', (code, expected) => {
    expect(getAuthErrorMessage(code)).toBe(expected);
  });

  it('returns the fallback message for an unknown error code', () => {
    expect(getAuthErrorMessage('auth/some-future-code')).toBe('Something went wrong. Please try again.');
  });

  it('returns the fallback message for an empty string', () => {
    expect(getAuthErrorMessage('')).toBe('Something went wrong. Please try again.');
  });
});
