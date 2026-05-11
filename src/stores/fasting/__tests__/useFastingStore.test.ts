import { useFastingStore } from '../useFastingStore';
import type { FastCompletionResult } from '@/types/fasting';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockResult: FastCompletionResult = {
  xpEarned: 80,
  bonusXp: 0,
  newStreak: 1,
  longestStreak: 1,
};

describe('useFastingStore', () => {
  beforeEach(() => {
    useFastingStore.getState().clearFasting();
  });

  describe('initial state', () => {
    it('has no active fast', () => {
      expect(useFastingStore.getState().activeFast).toBeNull();
    });

    it('has no last completed timestamp', () => {
      expect(useFastingStore.getState().lastCompletedAt).toBeNull();
    });

    it('defaults to 16:8 protocol', () => {
      expect(useFastingStore.getState().selectedProtocol).toBe('16:8');
    });

    it('has not completed today', () => {
      expect(useFastingStore.getState().completedToday).toBe(false);
    });
  });

  describe('setSelectedProtocol', () => {
    it('updates selected protocol', () => {
      useFastingStore.getState().setSelectedProtocol('12:12');
      expect(useFastingStore.getState().selectedProtocol).toBe('12:12');
    });
  });

  describe('startFast', () => {
    it('sets active fast with startTime, protocol, and duration', () => {
      const before = Date.now();
      useFastingStore.getState().startFast('14:10', 14 * 3_600_000);
      const state = useFastingStore.getState();

      expect(state.activeFast).not.toBeNull();
      expect(state.activeFast!.protocol).toBe('14:10');
      expect(state.activeFast!.targetDurationMs).toBe(14 * 3_600_000);
      expect(state.activeFast!.startTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('completeFast', () => {
    it('clears active fast and marks completed today', () => {
      useFastingStore.getState().startFast('16:8', 16 * 3_600_000);
      useFastingStore.getState().completeFast(mockResult);
      const state = useFastingStore.getState();

      expect(state.activeFast).toBeNull();
      expect(state.completedToday).toBe(true);
      expect(state.lastCompletedAt).not.toBeNull();
    });
  });

  describe('cancelFast', () => {
    it('clears active fast without marking completed', () => {
      useFastingStore.getState().startFast('16:8', 16 * 3_600_000);
      useFastingStore.getState().cancelFast();
      const state = useFastingStore.getState();

      expect(state.activeFast).toBeNull();
      expect(state.completedToday).toBe(false);
      expect(state.lastCompletedAt).toBeNull();
    });
  });

  describe('resetDaily', () => {
    it('resets completedToday without clearing active fast', () => {
      useFastingStore.getState().startFast('16:8', 16 * 3_600_000);
      useFastingStore.getState().completeFast(mockResult);
      useFastingStore.getState().startFast('12:12', 12 * 3_600_000);
      useFastingStore.getState().resetDaily();
      const state = useFastingStore.getState();

      expect(state.completedToday).toBe(false);
      expect(state.activeFast).not.toBeNull();
    });
  });

  describe('clearFasting', () => {
    it('resets all state to defaults', () => {
      useFastingStore.getState().startFast('14:10', 14 * 3_600_000);
      useFastingStore.getState().completeFast(mockResult);
      useFastingStore.getState().setSelectedProtocol('12:12');
      useFastingStore.getState().clearFasting();
      const state = useFastingStore.getState();

      expect(state.activeFast).toBeNull();
      expect(state.lastCompletedAt).toBeNull();
      expect(state.selectedProtocol).toBe('16:8');
      expect(state.completedToday).toBe(false);
    });
  });
});
