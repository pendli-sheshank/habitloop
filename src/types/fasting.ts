export type FastingProtocol = '12:12' | '14:10' | '16:8' | 'custom';

export type FastingStageId = 'fed' | 'early-fast' | 'metabolic-shift' | 'fat-burning';

export interface FastingStage {
  id: FastingStageId;
  label: string;
  color: string;
}

export interface FastSession {
  id: string;
  userId: string;
  startTime: number;       // Unix ms
  endTime: number | null;  // Unix ms, null if still active
  targetDurationMs: number;
  protocol: FastingProtocol;
  completed: boolean;
  xpEarned: number;
  cyclePhaseAtStart: string | null;
  createdAt: number;       // Unix ms
}

export interface FastCompletionResult {
  xpEarned: number;
  bonusXp: number;
  newStreak: number;
  longestStreak: number;
}

export interface ActiveFastState {
  startTime: number;       // Unix ms
  targetDurationMs: number;
  protocol: FastingProtocol;
}
