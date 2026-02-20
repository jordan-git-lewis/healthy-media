import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-456'),
}));

import * as repo from '../../../src/database/repositories/time-schedule-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TimeScheduleRepository', () => {
  const sampleRow = {
    id: 'sched-1',
    name: 'Work Hours',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: '[1,2,3,4,5]',
    is_active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  describe('getAll', () => {
    it('returns all schedules mapped to camelCase with parsed daysOfWeek', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getAll(mockDb);

      expect(result).toEqual([
        {
          id: 'sched-1',
          name: 'Work Hours',
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('getById', () => {
    it('returns the schedule when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.getById(mockDb, 'sched-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM TimeSchedule WHERE id = ?',
        'sched-1'
      );
      expect(result?.name).toBe('Work Hours');
    });

    it('returns null when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await repo.getById(mockDb, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getActiveSchedules', () => {
    it('returns only active schedules', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getActiveSchedules(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM TimeSchedule WHERE is_active = 1'
      );
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('isTimeBlocked', () => {
    it('returns true when current time falls within an active schedule', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      // Wednesday (day 3) at 12:00
      const now = new Date('2026-01-07T12:00:00');

      const result = await repo.isTimeBlocked(mockDb, now);
      expect(result).toBe(true);
    });

    it('returns false when current time is outside schedule hours', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      // Wednesday (day 3) at 18:00 — after end_time 17:00
      const now = new Date('2026-01-07T18:00:00');

      const result = await repo.isTimeBlocked(mockDb, now);
      expect(result).toBe(false);
    });

    it('returns false when current day is not in schedule', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      // Sunday (day 0) at 12:00 — not in [1,2,3,4,5]
      const now = new Date('2026-01-04T12:00:00');

      const result = await repo.isTimeBlocked(mockDb, now);
      expect(result).toBe(false);
    });

    it('returns false when no active schedules exist', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const now = new Date('2026-01-07T12:00:00');

      const result = await repo.isTimeBlocked(mockDb, now);
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('inserts a schedule and returns it', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 1,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        id: 'test-uuid-456',
      });

      const result = await repo.create(mockDb, {
        name: 'Work Hours',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO TimeSchedule'),
        'test-uuid-456',
        'Work Hours',
        '09:00',
        '17:00',
        '[1,2,3,4,5]',
        1,
        expect.any(String),
        expect.any(String)
      );
      expect(result.name).toBe('Work Hours');
      expect(result.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('update', () => {
    it('updates specified fields and returns the updated schedule', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        name: 'Updated Name',
      });

      const result = await repo.update(mockDb, 'sched-1', {
        name: 'Updated Name',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE TimeSchedule SET'),
        'Updated Name',
        expect.any(String),
        'sched-1'
      );
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteById', () => {
    it('deletes the schedule by id', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });

      await repo.deleteById(mockDb, 'sched-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM TimeSchedule WHERE id = ?',
        'sched-1'
      );
    });
  });
});
