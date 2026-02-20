import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-123'),
}));

import * as repo from '../../../src/database/repositories/success-threshold-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SuccessThresholdRepository', () => {
  const sampleRow = {
    id: 'thresh-1',
    date: '2026-01-15',
    required_count: 3,
    total_count: 5,
    created_at: '2026-01-15T00:00:00.000Z',
  };

  describe('getByDate', () => {
    it('returns the threshold when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.getByDate(mockDb, '2026-01-15');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM SuccessThreshold WHERE date = ?',
        '2026-01-15'
      );
      expect(result).toEqual({
        id: 'thresh-1',
        date: '2026-01-15',
        requiredCount: 3,
        totalCount: 5,
        createdAt: '2026-01-15T00:00:00.000Z',
      });
    });

    it('returns null when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await repo.getByDate(mockDb, '2026-01-16');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('inserts a new threshold and returns it', async () => {
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
        requiredCount: 3,
        totalCount: 5,
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO SuccessThreshold'),
        'test-uuid-123',
        '2026-01-15',
        3,
        5,
        expect.any(String)
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(date) DO UPDATE'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      expect(result.requiredCount).toBe(3);
      expect(result.totalCount).toBe(5);
    });
  });
});
