import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('../../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid-123'),
}));

import * as repo from '../../../src/database/repositories/blocked-app-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BlockedAppRepository', () => {
  const sampleRow = {
    id: 'abc-123',
    package_name: 'com.instagram.android',
    app_name: 'Instagram',
    icon_uri: '/icons/instagram.png',
    enforcement_level: 'hard_block',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  describe('getAll', () => {
    it('returns all blocked apps mapped to camelCase', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getAll(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM BlockedApp'
      );
      expect(result).toEqual([
        {
          id: 'abc-123',
          packageName: 'com.instagram.android',
          appName: 'Instagram',
          iconUri: '/icons/instagram.png',
          enforcementLevel: 'hard_block',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('returns empty array when no apps exist', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);

      const result = await repo.getAll(mockDb);
      expect(result).toEqual([]);
    });
  });

  describe('getByPackageName', () => {
    it('returns the app when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.getByPackageName(
        mockDb,
        'com.instagram.android'
      );

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM BlockedApp WHERE package_name = ?',
        'com.instagram.android'
      );
      expect(result?.packageName).toBe('com.instagram.android');
    });

    it('returns null when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await repo.getByPackageName(mockDb, 'com.unknown');
      expect(result).toBeNull();
    });
  });

  describe('getActivelyBlocked', () => {
    it('returns apps where enforcement_level is not off', async () => {
      (mockDb.getAllAsync as jest.Mock).mockResolvedValue([sampleRow]);

      const result = await repo.getActivelyBlocked(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM BlockedApp WHERE enforcement_level != 'off'"
      );
      expect(result).toHaveLength(1);
      expect(result[0].enforcementLevel).toBe('hard_block');
    });
  });

  describe('upsert', () => {
    it('inserts a new app and returns it', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 1,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        id: 'test-uuid-123',
      });

      const result = await repo.upsert(mockDb, {
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        iconUri: '/icons/instagram.png',
        enforcementLevel: 'hard_block',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO BlockedApp'),
        'test-uuid-123',
        'com.instagram.android',
        'Instagram',
        '/icons/instagram.png',
        'hard_block',
        expect.any(String),
        expect.any(String)
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(package_name) DO UPDATE'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      expect(result.packageName).toBe('com.instagram.android');
    });
  });

  describe('updateEnforcement', () => {
    it('updates the enforcement level and timestamp', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });

      await repo.updateEnforcement(mockDb, 'abc-123', 'soft_warning');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE BlockedApp SET enforcement_level = ?, updated_at = ? WHERE id = ?',
        'soft_warning',
        expect.any(String),
        'abc-123'
      );
    });
  });

  describe('deleteById', () => {
    it('deletes the app by id', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });

      await repo.deleteById(mockDb, 'abc-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM BlockedApp WHERE id = ?',
        'abc-123'
      );
    });
  });
});
