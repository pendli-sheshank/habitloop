import { getUTCDayKey, getYesterdayKey } from '../dateUtils';

describe('getUTCDayKey', () => {
  it('returns yyyy-MM-dd for a given timestamp', () => {
    const ts = new Date('2026-05-07T10:30:00Z').getTime();
    expect(getUTCDayKey(ts)).toBe('2026-05-07');
  });

  it('returns correct date near midnight', () => {
    const ts = new Date('2026-05-07T23:59:59Z').getTime();
    expect(getUTCDayKey(ts)).toBe('2026-05-07');
  });

  it('returns correct date at start of day', () => {
    const ts = new Date('2026-05-07T00:00:00Z').getTime();
    expect(getUTCDayKey(ts)).toBe('2026-05-07');
  });
});

describe('getYesterdayKey', () => {
  it('returns the previous day', () => {
    const ts = new Date('2026-05-07T12:00:00Z').getTime();
    expect(getYesterdayKey(ts)).toBe('2026-05-06');
  });

  it('handles month boundary', () => {
    const ts = new Date('2026-06-01T12:00:00Z').getTime();
    expect(getYesterdayKey(ts)).toBe('2026-05-31');
  });

  it('handles year boundary', () => {
    const ts = new Date('2027-01-01T12:00:00Z').getTime();
    expect(getYesterdayKey(ts)).toBe('2026-12-31');
  });
});
