export interface ProtocolOption {
  value: '12:12' | '14:10' | '16:8';
  label: string;
  fastHours: number;
  eatHours: number;
  description: string;
}

export const PROTOCOL_OPTIONS: readonly ProtocolOption[] = [
  {
    value: '12:12',
    label: '12 : 12',
    fastHours: 12,
    eatHours: 12,
    description: 'Gentle start — great for beginners or recovery days',
  },
  {
    value: '14:10',
    label: '14 : 10',
    fastHours: 14,
    eatHours: 10,
    description: 'Balanced approach — suits most lifestyles',
  },
  {
    value: '16:8',
    label: '16 : 8',
    fastHours: 16,
    eatHours: 8,
    description: 'Popular choice — maximizes fat-burning window',
  },
] as const;
