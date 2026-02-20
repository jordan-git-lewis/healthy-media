import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-789'),
}));

import * as repo from '../../../src/database/repositories/goal-task-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GoalTaskRepository', () => {
  const sampleRow = {
    id: 'task-1',
    name: 'Finish coding',
    date: '2026-01-07',
    is_completed: 0,
    completed_at: null,
    created_at: '2026-01-07T08:00:00.000Z',
    updated_at: '2026-01-07T08:00:00.000Z',
  };

  describe('getAll', () => {
    it('returns all tasks mapped to camelCase', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getAll(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM GoalTask'
      );
      expect(result).toEqual([
        {
          id: 'task-1',
          name: 'Finish coding',
          date: '2026-01-07',
          isCompleted: false,
          completedAt: null,
          createdAt: '2026-01-07T08:00:00.000Z',
          updatedAt: '2026-01-07T08:00:00.000Z',
        },
      ]);
    });

    it('returns empty array when no tasks exist', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const result = await repo.getAll(mockDb);
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns the task when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.getById(mockDb, 'task-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM GoalTask WHERE id = ?',
        'task-1'
      );
      expect(result?.name).toBe('Finish coding');
    });

    it('returns null when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await repo.getById(mockDb, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getByDate', () => {
    it('returns tasks for the given date', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getByDate(mockDb, '2026-01-07');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM GoalTask WHERE date = ?',
        '2026-01-07'
      );
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-01-07');
    });
  });

  describe('getIncompleteByDate', () => {
    it('returns only incomplete tasks for the given date', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getIncompleteByDate(mockDb, '2026-01-07');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM GoalTask WHERE date = ? AND is_completed = 0',
        '2026-01-07'
      );
      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(false);
    });

    it('returns empty array when all tasks are complete', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const result = await repo.getIncompleteByDate(mockDb, '2026-01-07');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('inserts a task with isCompleted=false and completedAt=null', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 1,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        id: 'test-uuid-789',
      });

      const result = await repo.create(mockDb, {
        name: 'Finish coding',
        date: '2026-01-07',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO GoalTask'),
        'test-uuid-789',
        'Finish coding',
        '2026-01-07',
        expect.any(String),
        expect.any(String)
      );
      expect(result.isCompleted).toBe(false);
      expect(result.completedAt).toBeNull();
    });
  });

  describe('update', () => {
    it('marks a task as completed', async () => {
      const completedAt = '2026-01-07T15:00:00.000Z';
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        is_completed: 1,
        completed_at: completedAt,
      });

      const result = await repo.update(mockDb, 'task-1', {
        isCompleted: true,
        completedAt,
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE GoalTask SET'),
        1,
        completedAt,
        expect.any(String),
        'task-1'
      );
      expect(result.isCompleted).toBe(true);
      expect(result.completedAt).toBe(completedAt);
    });

    it('updates the task name', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        name: 'Updated task name',
      });

      const result = await repo.update(mockDb, 'task-1', {
        name: 'Updated task name',
      });

      expect(result.name).toBe('Updated task name');
    });
  });

  describe('deleteById', () => {
    it('deletes the task by id', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });

      await repo.deleteById(mockDb, 'task-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM GoalTask WHERE id = ?',
        'task-1'
      );
    });
  });
});
