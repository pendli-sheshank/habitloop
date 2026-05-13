import { getHormoneCoachingTips, getDailyCoachingTip } from '../hormoneCoachingService';
import { COACHING_TIPS } from '@/constants/coaching';

// ─── getHormoneCoachingTips ───────────────────────────────────────────────────

describe('getHormoneCoachingTips', () => {
  it('returns all tips for a known phase', () => {
    const tips = getHormoneCoachingTips('menstruation');
    expect(tips).toHaveLength(COACHING_TIPS.menstruation.length);
  });

  it('returns a slice when count is provided', () => {
    const tips = getHormoneCoachingTips('follicular', 1);
    expect(tips).toHaveLength(1);
  });

  it('returns 0 items when count is 0', () => {
    expect(getHormoneCoachingTips('ovulation', 0)).toHaveLength(0);
  });

  it('falls back to follicular tips for an unknown phase', () => {
    const tips = getHormoneCoachingTips('unknown-phase' as never);
    expect(tips).toEqual(COACHING_TIPS.follicular);
  });

  it('returns tips for every known phase', () => {
    const phases = ['menstruation', 'follicular', 'ovulation', 'luteal'] as const;
    for (const phase of phases) {
      const tips = getHormoneCoachingTips(phase);
      expect(tips.length).toBeGreaterThan(0);
    }
  });

  it('each tip has the required fields', () => {
    const tips = getHormoneCoachingTips('luteal');
    for (const tip of tips) {
      expect(typeof tip.id).toBe('string');
      expect(typeof tip.headline).toBe('string');
      expect(typeof tip.body).toBe('string');
      expect(typeof tip.actionLabel).toBe('string');
    }
  });
});

// ─── getDailyCoachingTip ──────────────────────────────────────────────────────

describe('getDailyCoachingTip', () => {
  it('returns a tip for a known phase and dayKey', () => {
    const tip = getDailyCoachingTip('follicular', '2026-05-13');
    expect(tip).toBeDefined();
    expect(typeof tip.headline).toBe('string');
  });

  it('is deterministic — same phase + dayKey always returns the same tip', () => {
    const a = getDailyCoachingTip('luteal', '2026-05-13');
    const b = getDailyCoachingTip('luteal', '2026-05-13');
    expect(a.id).toBe(b.id);
  });

  it('returns a different tip for a different dayKey (when enough tips exist)', () => {
    // Find two dayKeys that map to different indices mod tipCount
    const tips = COACHING_TIPS.menstruation;
    const dayKeys = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
                     '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10'];
    const seen = new Set(dayKeys.map(dk => getDailyCoachingTip('menstruation', dk).id));
    // With 10 different dayKeys across a 3-tip set we must see at least 2 distinct tips
    expect(seen.size).toBeGreaterThanOrEqual(Math.min(2, tips.length));
  });

  it('index is always within the tip array bounds', () => {
    const dayKeys = ['2026-01-01', '2026-06-15', '2026-12-31', '2026-02-28'];
    const phases = ['menstruation', 'follicular', 'ovulation', 'luteal'] as const;
    for (const phase of phases) {
      for (const dk of dayKeys) {
        const tip = getDailyCoachingTip(phase, dk);
        const allTips = COACHING_TIPS[phase];
        expect(allTips.map(t => t.id)).toContain(tip.id);
      }
    }
  });
});
