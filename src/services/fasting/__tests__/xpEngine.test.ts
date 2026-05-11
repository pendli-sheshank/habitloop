import {
  calcFastXp,
  calcStreakBonusXp,
  calcLevelFromXp,
  getLevelTitle,
  getXpForNextLevel,
  calcXpProgress,
  HYDRATION_GOAL_XP,
  STREAK_BONUS_7,
  STREAK_BONUS_30,
  CYCLE_LOG_XP,
  SYMPTOM_LOG_XP,
} from '../xpEngine';

describe('XP constants', () => {
  it('exports correct constant values', () => {
    expect(HYDRATION_GOAL_XP).toBe(20);
    expect(STREAK_BONUS_7).toBe(100);
    expect(STREAK_BONUS_30).toBe(500);
    expect(CYCLE_LOG_XP).toBe(15);
    expect(SYMPTOM_LOG_XP).toBe(10);
  });
});

describe('calcFastXp', () => {
  it('returns 30 for completed 12:12', () => {
    expect(calcFastXp('12:12', true)).toBe(30);
  });

  it('returns 50 for completed 14:10', () => {
    expect(calcFastXp('14:10', true)).toBe(50);
  });

  it('returns 80 for completed 16:8', () => {
    expect(calcFastXp('16:8', true)).toBe(80);
  });

  it('returns 60 for completed custom', () => {
    expect(calcFastXp('custom', true)).toBe(60);
  });

  it('returns 0 when not completed', () => {
    expect(calcFastXp('16:8', false)).toBe(0);
    expect(calcFastXp('12:12', false)).toBe(0);
    expect(calcFastXp('custom', false)).toBe(0);
  });
});

describe('calcStreakBonusXp', () => {
  it('returns 100 at 7-day milestone', () => {
    expect(calcStreakBonusXp(7)).toBe(100);
  });

  it('returns 500 at 30-day milestone', () => {
    expect(calcStreakBonusXp(30)).toBe(500);
  });

  it('returns 0 for non-milestone streaks', () => {
    expect(calcStreakBonusXp(1)).toBe(0);
    expect(calcStreakBonusXp(6)).toBe(0);
    expect(calcStreakBonusXp(8)).toBe(0);
    expect(calcStreakBonusXp(29)).toBe(0);
    expect(calcStreakBonusXp(31)).toBe(0);
  });
});

describe('calcLevelFromXp', () => {
  it('returns level 1 for 0 XP', () => {
    expect(calcLevelFromXp(0)).toBe(1);
  });

  it('returns level 1 just below level 2 threshold', () => {
    expect(calcLevelFromXp(499)).toBe(1);
  });

  it('returns level 2 at exactly 500 XP', () => {
    expect(calcLevelFromXp(500)).toBe(2);
  });

  it('returns level 3 at exactly 1500 XP', () => {
    expect(calcLevelFromXp(1500)).toBe(3);
  });

  it('returns level 4 at exactly 5000 XP', () => {
    expect(calcLevelFromXp(5000)).toBe(4);
  });

  it('returns level 4 for very high XP', () => {
    expect(calcLevelFromXp(99999)).toBe(4);
  });
});

describe('getLevelTitle', () => {
  it('returns Beginner for level 1', () => {
    expect(getLevelTitle(1)).toBe('Beginner');
  });

  it('returns Consistent for level 2', () => {
    expect(getLevelTitle(2)).toBe('Consistent');
  });

  it('returns Committed for level 3', () => {
    expect(getLevelTitle(3)).toBe('Committed');
  });

  it('returns HabitLoop Pro for level 4', () => {
    expect(getLevelTitle(4)).toBe('HabitLoop Pro');
  });

  it('falls back to Beginner for unknown level', () => {
    expect(getLevelTitle(99)).toBe('Beginner');
  });
});

describe('getXpForNextLevel', () => {
  it('returns 500 for level 1', () => {
    expect(getXpForNextLevel(1)).toBe(500);
  });

  it('returns 1500 for level 2', () => {
    expect(getXpForNextLevel(2)).toBe(1500);
  });

  it('returns 5000 for level 3', () => {
    expect(getXpForNextLevel(3)).toBe(5000);
  });

  it('returns null for max level', () => {
    expect(getXpForNextLevel(4)).toBeNull();
  });
});

describe('calcXpProgress', () => {
  it('returns level 1 progress for 0 XP', () => {
    const info = calcXpProgress(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Beginner');
    expect(info.currentLevelXp).toBe(0);
    expect(info.nextLevelXp).toBe(500);
    expect(info.progress).toBe(0);
  });

  it('returns correct progress midway through level 1', () => {
    const info = calcXpProgress(250);
    expect(info.level).toBe(1);
    expect(info.progress).toBe(0.5);
  });

  it('returns level 2 at exactly 500 XP', () => {
    const info = calcXpProgress(500);
    expect(info.level).toBe(2);
    expect(info.title).toBe('Consistent');
    expect(info.currentLevelXp).toBe(500);
    expect(info.nextLevelXp).toBe(1500);
    expect(info.progress).toBe(0);
  });

  it('returns correct progress midway through level 2', () => {
    const info = calcXpProgress(1000);
    expect(info.level).toBe(2);
    expect(info.progress).toBe(0.5);
  });

  it('returns max level with progress 1 at cap', () => {
    const info = calcXpProgress(5000);
    expect(info.level).toBe(4);
    expect(info.title).toBe('HabitLoop Pro');
    expect(info.progress).toBe(1);
  });

  it('returns max level with progress 1 beyond cap', () => {
    const info = calcXpProgress(99999);
    expect(info.level).toBe(4);
    expect(info.progress).toBe(1);
  });
});
