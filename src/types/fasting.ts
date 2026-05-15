export type FastingProtocol =
  | 'circadian'   // 13 h
  | '15:9'        // 15 h
  | '16:8'        // 16 h
  | '18:6'        // 18 h
  | '20:4'        // 20 h
  | 'omad'        // 23 h
  | '24h'
  | '36h'
  | '48h'
  | '72h'
  | '120h'
  | '168h';

export type ProtocolCategory = 'daily-trf' | 'extended';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'extreme';

export type BodyStateId =
  | 'fed'
  | 'early-fast'
  | 'metabolic-shift'
  | 'fat-burning'
  | 'ketosis'
  | 'deep-ketosis'
  | 'autophagy'
  | 'reset';

export interface FastingStage {
  id: BodyStateId;
  label: string;
  description: string;
  color: string;
}

export interface FastSession {
  id: string;
  userId: string;
  startTime: number;
  endTime: number | null;
  targetDurationMs: number;
  protocol: FastingProtocol;
  completed: boolean;
  xpEarned: number;
  streakMultiplier: number;
  cyclePhaseAtStart: string | null;
  createdAt: number;
}

export interface FastCompletionResult {
  xpEarned: number;
  bonusXp: number;
  streakMultiplier: number;
  newStreak: number;
  longestStreak: number;
}

export interface ActiveFastState {
  startTime: number;
  targetDurationMs: number;
  protocol: FastingProtocol;
}

export interface ProtocolMeta {
  id: FastingProtocol;
  label: string;
  fastHours: number;
  eatHours: number | null;   // null for extended (no defined eating window)
  category: ProtocolCategory;
  difficulty: DifficultyLevel;
  tagline: string;           // one-line description shown in picker
  benefits: string[];        // 2-3 short bullet benefits
  unlockAfterFasts: number;  // 0 = always unlocked
  requiresElectrolytes: boolean;
  requiresMedicalSupervision: boolean;
  warningText: string | null;
}
