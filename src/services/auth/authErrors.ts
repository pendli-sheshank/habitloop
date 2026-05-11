const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use':   'An account with this email already exists. Try signing in.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/weak-password':          'Password must be at least 8 characters.',
  'auth/wrong-password':         'Incorrect password. Please try again.',
  'auth/invalid-credential':     'Incorrect password. Please try again.',
  'auth/user-not-found':         'No account found with this email.',
  'auth/too-many-requests':      'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'No internet connection. Please check your network.',
  'auth/user-disabled':          'This account has been disabled. Please contact support.',
  'auth/popup-closed-by-user':   'Google sign-in was cancelled.',
  'auth/configuration-not-found': 'This sign-in method is not enabled. Please contact support.',
  'auth/operation-not-allowed':   'This sign-in method is not enabled. Please contact support.',
};

export function getAuthErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}
