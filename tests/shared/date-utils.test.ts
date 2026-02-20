import { getAlignedDate, formatDate } from '../../src/shared/date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      expect(formatDate(date)).toBe('2026-01-15');
    });

    it('pads single-digit month and day', () => {
      const date = new Date(2026, 2, 5); // Mar 5, 2026
      expect(formatDate(date)).toBe('2026-03-05');
    });
  });

  describe('getAlignedDate', () => {
    it('returns current day when time is after reset time', () => {
      // 10:30 AM with reset at 04:00
      const timestamp = new Date(2026, 0, 15, 10, 30);
      expect(getAlignedDate(timestamp, '04:00')).toBe('2026-01-15');
    });

    it('returns previous day when time is before reset time', () => {
      // 02:30 AM with reset at 04:00
      const timestamp = new Date(2026, 0, 15, 2, 30);
      expect(getAlignedDate(timestamp, '04:00')).toBe('2026-01-14');
    });

    it('returns current day when time equals reset time', () => {
      // 04:00 AM with reset at 04:00
      const timestamp = new Date(2026, 0, 15, 4, 0);
      expect(getAlignedDate(timestamp, '04:00')).toBe('2026-01-15');
    });

    it('handles midnight reset time', () => {
      // 23:59 with reset at 00:00 — after reset, returns current day
      const late = new Date(2026, 0, 15, 23, 59);
      expect(getAlignedDate(late, '00:00')).toBe('2026-01-15');
    });

    it('handles midnight exactly with non-midnight reset', () => {
      // 00:00 with reset at 04:00 — before reset, returns previous day
      const midnight = new Date(2026, 0, 15, 0, 0);
      expect(getAlignedDate(midnight, '04:00')).toBe('2026-01-14');
    });
  });
});
