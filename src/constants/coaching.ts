import type { CoachingTip } from '@/types/subscription';

export const COACHING_TIPS: Record<string, CoachingTip[]> = {
  menstruation: [
    {
      id: 'mens-1',
      phase: 'menstruation',
      headline: 'Honour your body today',
      body: 'Oestrogen and progesterone are at their lowest. Shorter fasting windows (12:12) reduce cortisol stress and help maintain iron levels lost during your period.',
      actionLabel: 'Switch to 12:12',
    },
    {
      id: 'mens-2',
      phase: 'menstruation',
      headline: 'Prioritise iron-rich foods',
      body: 'Break your fast with iron-rich foods like lentils, spinach, or lean red meat paired with vitamin C to maximise absorption and replenish what your period takes.',
      actionLabel: 'See meal ideas',
    },
    {
      id: 'mens-3',
      phase: 'menstruation',
      headline: 'Warmth over intensity',
      body: 'Prostaglandins cause cramps and fatigue. Warm herbal teas, light stretching, and gentle walks support circulation without depleting already-low energy reserves.',
      actionLabel: 'Log symptoms',
    },
  ],
  follicular: [
    {
      id: 'foll-1',
      phase: 'follicular',
      headline: 'Your energy is rising',
      body: 'Rising oestrogen boosts insulin sensitivity — your best phase for longer fasting windows and carbohydrate metabolism. Try 16:8 to ride the metabolic wave.',
      actionLabel: 'Try 16:8 today',
    },
    {
      id: 'foll-2',
      phase: 'follicular',
      headline: 'Great time for new habits',
      body: 'Higher dopamine and serotonin in the follicular phase make it easier to start and stick to new routines. Nail your fasting schedule this week.',
      actionLabel: 'Set a reminder',
    },
    {
      id: 'foll-3',
      phase: 'follicular',
      headline: 'Fuel with complex carbs',
      body: 'Your body handles carbohydrates most efficiently now. Oats, sweet potato, and quinoa give sustained energy through your eating window without blood sugar spikes.',
      actionLabel: 'See meal ideas',
    },
  ],
  ovulation: [
    {
      id: 'ovul-1',
      phase: 'ovulation',
      headline: 'Peak strength window',
      body: 'Oestrogen peaks around day 14, boosting physical performance and pain tolerance. This is the optimal time for intense workouts — lean into your fasting schedule.',
      actionLabel: 'Log a fast',
    },
    {
      id: 'ovul-2',
      phase: 'ovulation',
      headline: 'Hydration matters more now',
      body: 'Ovulation raises your basal body temperature slightly, increasing fluid needs. Hit your water goal before breaking your fast to support hormonal balance.',
      actionLabel: 'Log water',
    },
    {
      id: 'ovul-3',
      phase: 'ovulation',
      headline: 'Anti-inflammatory eating',
      body: 'Oestrogen can trigger mild inflammation near ovulation. Omega-3-rich foods like salmon, chia seeds, and walnuts in your eating window help keep inflammation in check.',
      actionLabel: 'See meal ideas',
    },
  ],
  luteal: [
    {
      id: 'lute-1',
      phase: 'luteal',
      headline: 'Ease up on extended fasts',
      body: 'Progesterone increases your resting metabolic rate and appetite. Extending fasts beyond 14 hours may spike cortisol — stick to 12:12 or 14:10 this week.',
      actionLabel: 'Switch protocol',
    },
    {
      id: 'lute-2',
      phase: 'luteal',
      headline: 'Manage cravings strategically',
      body: 'Progesterone-driven cravings are real. Breaking your fast with protein and healthy fats blunts cravings for the rest of your eating window.',
      actionLabel: 'See meal ideas',
    },
    {
      id: 'lute-3',
      phase: 'luteal',
      headline: 'Magnesium is your ally',
      body: 'Magnesium levels drop before your period, worsening PMS symptoms. Dark chocolate, pumpkin seeds, and leafy greens in your eating window can ease bloating and mood.',
      actionLabel: 'Log symptoms',
    },
  ],
};

/** Returns up to `count` tips for the given phase (default all). */
export function getCoachingTipsForPhase(phase: string, count?: number): CoachingTip[] {
  const tips = COACHING_TIPS[phase] ?? COACHING_TIPS['follicular'];
  return count !== undefined ? tips.slice(0, count) : tips;
}
