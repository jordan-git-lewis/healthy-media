import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-123'),
}));

import * as repo from '../../../src/database/repositories/daily-record-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DailyRecordRepository', () => {
  const sampleRow = {
    id: 'rec-1',
    date: '2026-01-15',
    goal_tasks_completed: 3,
    goal_tasks_total: 5,
    success_threshold: 3,
    override_count: 2,
    time_schedule_adherence: 0.85,
    status: 'partial_success',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T23:59:00.000Z',
  };

  describe('getByDate', () => {
    it('returns the record when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.getByDate(mockDb, '2026-01-15');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM DailyRecord WHERE date = ?',
        '2026-01-15'
      );
      expect(result).toEqual({
        id: 'rec-1',
        date: '2026-01-15',
        goalTasksCompleted: 3,
        goalTasksTotal: 5,
        successThreshold: 3,
        overrideCount: 2,
        timeScheduleAdherence: 0.85,
        status: 'partial_success',
        createdAt: '2026-01-15T00:00:00.000Z',
        updatedAt: '2026-01-15T23:59:00.000Z',
      });
    });

    it('returns null when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await repo.getByDate(mockDb, '2026-01-16');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('inserts a new record and returns it', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 1,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        id: 'test-uuid-123',
      });

      const result = await repo.upsert(mockDb, {
        date: '2026-01-15',
        goalTasksCompleted: 3,
        goalTasksTotal: 5,
        successThreshold: 3,
        overrideCount: 2,
        timeScheduleAdherence: 0.85,
        status: 'partial_success',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO DailyRecord'),
        'test-uuid-123',
        '2026-01-15',
        3,
        5,
        3,
        2,
        0.85,
        'partial_success',
        expect.any(String),
        expect.any(String)
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(date) DO UPDATE'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      expect(result.goalTasksCompleted).toBe(3);
      expect(result.status).toBe('partial_success');
    });
  });

  describe('getByDateRange', () => {
    it('returns records within the date range ordered by date', async () => {
      const row2 = { ...sampleRow, id: 'rec-2', date: '2026-01-16' };
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow, row2]);

      const result = await repo.getByDateRange(
        mockDb,
        '2026-01-15',
        '2026-01-16'
      );

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM DailyRecord WHERE date >= ? AND date <= ? ORDER BY date',
        '2026-01-15',
        '2026-01-16'
      );
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-01-15');
      expect(result[1].date).toBe('2026-01-16');
    });

    it('returns empty array when no records in range', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const result = await repo.getByDateRange(
        mockDb,
        '2026-02-01',
        '2026-02-28'
      );
      expect(result).toEqual([]);
    });
  });
});
