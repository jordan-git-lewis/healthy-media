import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseError } from '../../../src/shared/error-types';

import * as repo from '../../../src/database/repositories/user-settings-repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
} as unknown as jest.Mocked<SQLiteDatabase>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UserSettingsRepository', () => {
  const sampleRow = {
    id: '1',
    day_reset_time: '04:00',
    onboarding_survey_response: '{"q1":"a"}',
    onboarding_completed: 1,
    global_blocking_enabled: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  describe('get', () => {
    it('returns settings when found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(sampleRow);

      const result = await repo.get(mockDb);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM UserSettings WHERE id = ?',
        '1'
      );
      expect(result).toEqual({
        id: '1',
        dayResetTime: '04:00',
        onboardingSurveyResponse: '{"q1":"a"}',
        onboardingCompleted: true,
        globalBlockingEnabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('throws DatabaseError when not found', async () => {
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

      await expect(repo.get(mockDb)).rejects.toThrow(DatabaseError);
      await expect(repo.get(mockDb)).rejects.toThrow(
        'UserSettings record not found'
      );
    });
  });

  describe('update', () => {
    it('updates partial fields and returns full record', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        day_reset_time: '05:00',
        updated_at: '2026-01-02T00:00:00.000Z',
      });

      const result = await repo.update(mockDb, {
        dayResetTime: '05:00',
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE UserSettings SET'),
        '05:00',
        expect.any(String),
        '1'
      );
      expect(result.dayResetTime).toBe('05:00');
    });

    it('handles boolean fields correctly', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        global_blocking_enabled: 0,
      });

      const result = await repo.update(mockDb, {
        globalBlockingEnabled: false,
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('global_blocking_enabled = ?'),
        0,
        expect.any(String),
        '1'
      );
      expect(result.globalBlockingEnabled).toBe(false);
    });

    it('updates multiple fields at once', async () => {
      (mockDb.runAsync as jest.Mock).mockResolvedValue({
        changes: 1,
        lastInsertRowId: 0,
      });
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({
        ...sampleRow,
        onboarding_completed: 1,
        global_blocking_enabled: 0,
      });

      await repo.update(mockDb, {
        onboardingCompleted: true,
        globalBlockingEnabled: false,
      });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('onboarding_completed = ?'),
        1,
        0,
        expect.any(String),
        '1'
      );
    });
  });
});
