import type { ProtocolMeta, FastingProtocol } from '@/types/fasting';

export const ALL_PROTOCOLS: ProtocolMeta[] = [
  // ── Daily TRF ────────────────────────────────────────────────
  {
    id: 'circadian',
    label: 'Circadian (13h)',
    fastHours: 13,
    eatHours: 11,
    category: 'daily-trf',
    difficulty: 'beginner',
    tagline: 'Sleep-aligned — ideal for digestion and beginners',
    benefits: ['Improves gut health', 'Aligns with circadian rhythm', 'Easy to maintain'],
    unlockAfterFasts: 0,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: null,
  },
  {
    id: '15:9',
    label: '15:9 (15h)',
    fastHours: 15,
    eatHours: 9,
    category: 'daily-trf',
    difficulty: 'beginner',
    tagline: 'Mild metabolic adaptation — great for office workers',
    benefits: ['Reduces insulin spikes', 'Easy habit building', 'Flexible eating window'],
    unlockAfterFasts: 0,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: null,
  },
  {
    id: '16:8',
    label: '16:8 (16h)',
    fastHours: 16,
    eatHours: 8,
    category: 'daily-trf',
    difficulty: 'intermediate',
    tagline: 'The gold standard — balances fat burning and flexibility',
    benefits: ['Proven fat-burning window', 'Improves insulin sensitivity', 'Sustainable long-term'],
    unlockAfterFasts: 0,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: null,
  },
  {
    id: '18:6',
    label: '18:6 (18h)',
    fastHours: 18,
    eatHours: 6,
    category: 'daily-trf',
    difficulty: 'intermediate',
    tagline: 'Deep flexibility — lowers insulin and builds discipline',
    benefits: ['Strong fat adaptation', 'Reduced inflammation', 'Mental clarity'],
    unlockAfterFasts: 3,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: null,
  },
  {
    id: '20:4',
    label: '20:4 (20h)',
    fastHours: 20,
    eatHours: 4,
    category: 'daily-trf',
    difficulty: 'advanced',
    tagline: 'Warrior mode — high focus with aggressive fat loss',
    benefits: ['Deep ketosis entry', 'Heightened mental focus', 'Aggressive fat loss'],
    unlockAfterFasts: 7,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: 'Consult a doctor if you have any metabolic conditions.',
  },
  {
    id: 'omad',
    label: 'OMAD (23h)',
    fastHours: 23,
    eatHours: 1,
    category: 'daily-trf',
    difficulty: 'advanced',
    tagline: 'One meal a day — maximum discipline, minimal routine',
    benefits: ['Simplifies meal planning', 'Deep hormonal reset', 'Strong autophagy signal'],
    unlockAfterFasts: 7,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: 'Ensure adequate nutrition in your one meal. Not recommended for active athletes.',
  },
  // ── Extended ─────────────────────────────────────────────────
  {
    id: '24h',
    label: '24h Fast',
    fastHours: 24,
    eatHours: null,
    category: 'extended',
    difficulty: 'advanced',
    tagline: 'Full day reset — dinner to dinner',
    benefits: ['Complete glycogen depletion', 'Initiates autophagy', 'Deep metabolic reset'],
    unlockAfterFasts: 15,
    requiresElectrolytes: false,
    requiresMedicalSupervision: false,
    warningText: 'Stay hydrated. Light electrolytes recommended.',
  },
  {
    id: '36h',
    label: '36h Fast',
    fastHours: 36,
    eatHours: null,
    category: 'extended',
    difficulty: 'expert',
    tagline: 'Monk fast — designed for metabolic reset',
    benefits: ['Strong autophagy activation', 'Growth hormone spike', 'Deep ketosis'],
    unlockAfterFasts: 30,
    requiresElectrolytes: true,
    requiresMedicalSupervision: false,
    warningText: 'Electrolytes required. Rest and avoid intense exercise.',
  },
  {
    id: '48h',
    label: '48h Fast',
    fastHours: 48,
    eatHours: null,
    category: 'extended',
    difficulty: 'expert',
    tagline: 'Deep fast — requires electrolytes and preparation',
    benefits: ['Peak autophagy', 'Immune system reset', 'Significant metabolic shift'],
    unlockAfterFasts: 30,
    requiresElectrolytes: true,
    requiresMedicalSupervision: false,
    warningText: 'Electrolytes required. Avoid strenuous activity. Break fast gently.',
  },
  {
    id: '72h',
    label: '72h Fast',
    fastHours: 72,
    eatHours: null,
    category: 'extended',
    difficulty: 'expert',
    tagline: 'Advanced — triggers deep ketosis and autophagy',
    benefits: ['Full ketosis', 'Immune cell regeneration', 'Maximum autophagy'],
    unlockAfterFasts: 50,
    requiresElectrolytes: true,
    requiresMedicalSupervision: false,
    warningText: 'Sodium, potassium, and magnesium required. Medical check recommended.',
  },
  {
    id: '120h',
    label: '5-Day Fast',
    fastHours: 120,
    eatHours: null,
    category: 'extended',
    difficulty: 'extreme',
    tagline: 'Expert level — recovery meal guidance essential',
    benefits: ['Stem cell activation', 'Deep cellular renewal', 'Metabolic reprogramming'],
    unlockAfterFasts: 75,
    requiresElectrolytes: true,
    requiresMedicalSupervision: true,
    warningText: 'Medical supervision strongly recommended. Electrolytes mandatory.',
  },
  {
    id: '168h',
    label: '7-Day Fast',
    fastHours: 168,
    eatHours: null,
    category: 'extended',
    difficulty: 'extreme',
    tagline: 'Extreme — requires medical supervision throughout',
    benefits: ['Maximum cellular renewal', 'Therapeutic autophagy', 'Complete metabolic reset'],
    unlockAfterFasts: 100,
    requiresElectrolytes: true,
    requiresMedicalSupervision: true,
    warningText: 'REQUIRES medical supervision. Do not attempt without professional guidance.',
  },
];

export const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  beginner:     { label: 'Beginner',     color: '#059669', bgColor: '#ECFDF5' },
  intermediate: { label: 'Intermediate', color: '#2563EB', bgColor: '#EFF6FF' },
  advanced:     { label: 'Advanced',     color: '#D97706', bgColor: '#FEF3C7' },
  expert:       { label: 'Expert',       color: '#DC2626', bgColor: '#FEF2F2' },
  extreme:      { label: 'Extreme',      color: '#7C3AED', bgColor: '#F5F3FF' },
};

export function getProtocolMeta(id: FastingProtocol): ProtocolMeta {
  return ALL_PROTOCOLS.find(p => p.id === id) ?? ALL_PROTOCOLS[2]; // fallback 16:8
}

export function getUnlockedProtocols(totalCompletedFasts: number): FastingProtocol[] {
  return ALL_PROTOCOLS
    .filter(p => totalCompletedFasts >= p.unlockAfterFasts)
    .map(p => p.id);
}

export function getNextUnlock(totalCompletedFasts: number): { protocol: ProtocolMeta; fastsNeeded: number } | null {
  const next = ALL_PROTOCOLS
    .filter(p => p.unlockAfterFasts > totalCompletedFasts)
    .sort((a, b) => a.unlockAfterFasts - b.unlockAfterFasts)[0];
  if (!next) return null;
  return { protocol: next, fastsNeeded: next.unlockAfterFasts - totalCompletedFasts };
}

// Flat list for simple pickers (onboarding, settings, group creation)
export const PROTOCOL_OPTIONS = ALL_PROTOCOLS.map(p => ({
  value: p.id,
  label: p.label,
  fastHours: p.fastHours,
  eatHours: p.eatHours ?? 0,
  description: p.tagline,
}));
