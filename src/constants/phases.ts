import { CyclePhase } from '@/types/cycle';
import type { CyclePhaseType, PhaseDisplayConfig } from '@/types/cycle';

export { CyclePhase };

export const PHASE_DISPLAY: Record<CyclePhaseType, PhaseDisplayConfig> = {
  menstruation: {
    phase:      'menstruation',
    label:      'Menstruation',
    color:      '#DC2626',
    colorLight: '#FEE2E2',
    emoji:      '🌸',
    dayRange:   'Days 1–5',
  },
  follicular: {
    phase:      'follicular',
    label:      'Follicular',
    color:      '#059669',
    colorLight: '#D1FAE5',
    emoji:      '🌱',
    dayRange:   'Days 6–13',
  },
  ovulation: {
    phase:      'ovulation',
    label:      'Ovulation',
    color:      '#D97706',
    colorLight: '#FEF3C7',
    emoji:      '✨',
    dayRange:   'Days 12–16',
  },
  luteal: {
    phase:      'luteal',
    label:      'Luteal',
    color:      '#6B21A8',
    colorLight: '#EDE9FE',
    emoji:      '🌙',
    dayRange:   'Days 17–28',
  },
};

export const SYMPTOM_LABELS: Record<keyof import('@/types/cycle').SymptomEntry, string> = {
  cramps:   'Cramps',
  bloating: 'Bloating',
  mood:     'Mood',
  energy:   'Energy',
  cravings: 'Cravings',
};

export const SYMPTOM_EMOJIS: Record<number, string> = {
  1: '😣',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😄',
};
