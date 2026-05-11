import { performAccountDeletion, cancelAllNotifications } from '../deleteAccountFlow';

const mockDeleteAccount = jest.fn();
const mockCancelAll = jest.fn();
const mockClearAuth = jest.fn();

jest.mock('@/services/auth/authService', () => ({
  deleteAccount: () => mockDeleteAccount(),
}));

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
}));

jest.mock('@/stores/user/useUserStore', () => ({
  useUserStore: {
    getState: () => ({ clearAuth: mockClearAuth }),
  },
}));

describe('cancelAllNotifications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls expo-notifications cancelAllScheduledNotificationsAsync', async () => {
    mockCancelAll.mockResolvedValue(undefined);
    await cancelAllNotifications();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});

describe('performAccountDeletion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('executes deletion sequence in order: deleteAccount → cancel notifications → clear store', async () => {
    const callOrder: string[] = [];
    mockDeleteAccount.mockImplementation(() => { callOrder.push('deleteAccount'); return Promise.resolve(); });
    mockCancelAll.mockImplementation(() => { callOrder.push('cancelNotifications'); return Promise.resolve(); });
    mockClearAuth.mockImplementation(() => { callOrder.push('clearAuth'); });

    await performAccountDeletion();

    expect(callOrder).toEqual(['deleteAccount', 'cancelNotifications', 'clearAuth']);
  });

  it('throws if deleteAccount fails — does not clear store or notifications', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('Firestore delete failed'));

    await expect(performAccountDeletion()).rejects.toThrow('Firestore delete failed');

    expect(mockCancelAll).not.toHaveBeenCalled();
    expect(mockClearAuth).not.toHaveBeenCalled();
  });

  it('still clears store even if cancelAllNotifications fails (best-effort)', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    mockCancelAll.mockRejectedValue(new Error('notification error'));

    await performAccountDeletion();

    expect(mockClearAuth).toHaveBeenCalledTimes(1);
  });
});
