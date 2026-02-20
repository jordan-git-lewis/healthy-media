import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-123'),
}));

import * as repo from '../../../src/database/repositories/override-event-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OverrideEventRepository', () => {
  const sampleRow = {
    id: 'evt-1',
    package_name: 'com.instagram.android',
    app_name: 'Instagram',
    timestamp: '2026-01-15T10:30:00.000Z',
    date: '2026-01-15',
    active_schedule_id: 'sched-1',
    task_context: 'goal-task-1',
  };

  describe('create', () => {
    it('inserts a new override event and returns it', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 1,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        id: 'test-uuid-123',
      });

      const result = await repo.create(mockDb, {
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        timestamp: '2026-01-15T10:30:00.000Z',
        date: '2026-01-15',
        activeScheduleId: 'sched-1',
        taskContext: 'goal-task-1',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO OverrideEvent'),
        'test-uuid-123',
        'com.instagram.android',
        'Instagram',
        '2026-01-15T10:30:00.000Z',
        '2026-01-15',
        'sched-1',
        'goal-task-1'
      );
      expect(result.packageName).toBe('com.instagram.android');
      expect(result.activeScheduleId).toBe('sched-1');
    });
  });

  describe('getByDate', () => {
    it('returns all events for a given date', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getByDate(mockDb, '2026-01-15');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM OverrideEvent WHERE date = ?',
        '2026-01-15'
      );
      expect(result).toHaveLength(1);
      expect(result[0].packageName).toBe('com.instagram.android');
    });

    it('returns empty array when no events exist', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const result = await repo.getByDate(mockDb, '2026-01-16');
      expect(result).toEqual([]);
    });
  });

  describe('getCountByDate', () => {
    it('returns the count of events for a given date', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await repo.getCountByDate(mockDb, '2026-01-15');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM OverrideEvent WHERE date = ?',
        '2026-01-15'
      );
      expect(result).toBe(5);
    });

    it('returns 0 when no events exist', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await repo.getCountByDate(mockDb, '2026-01-16');
      expect(result).toBe(0);
    });
  });
});
