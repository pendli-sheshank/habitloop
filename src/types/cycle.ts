import type { FastingProtocol } from '@/types/fasting';

export const CyclePhase = {
  MENSTRUATION: 'menstruation',
  FOLLICULAR:   'follicular',
  OVULATION:    'ovulation',
  LUTEAL:       'luteal',
} as const;

export type CyclePhaseType = typeof CyclePhase[keyof typeof CyclePhase];

export type SymptomScale = 1 | 2 | 3 | 4 | 5;

export interface SymptomEntry {
  cramps:   SymptomScale | null;
  bloating: SymptomScale | null;
  mood:     SymptomScale | null;
  energy:   SymptomScale | null;
  cravings: SymptomScale | null;
}

export interface CycleLog {
  id: string;
  userId: string;
  periodStartDate: string;           // ISO date YYYY-MM-DD
  periodEndDate:   string | null;    // ISO date, null until period ends
  cycleLength:     number | null;    // computed from previous log
  symptoms: Record<string, SymptomEntry>; // keyed by YYYY-MM-DD
}

export interface PhaseRecommendation {
  phase:               CyclePhaseType;
  recommendedProtocol: FastingProtocol;
  warningLevel:        'none' | 'caution' | 'avoid';
  message:             string;
}

export interface PhaseDisplayConfig {
  phase:       CyclePhaseType;
  label:       string;
  color:       string;
  colorLight:  string;
  emoji:       string;
  dayRange:    string;
}
