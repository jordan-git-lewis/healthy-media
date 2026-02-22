import type { SQLiteDatabase } from 'expo-sqlite';
import type { UserSettings } from '../../src/settings/settings-types';

jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('../../src/settings/settings-service');
jest.mock('../../src/native-bridge/monitoring-bridge', () => ({
  monitoringBridge: {
    startMonitoringService: jest.fn(),
    stopMonitoringService: jest.fn(),
  },
}));

import { useSettingsStore } from '../../src/settings/settings-store';
import { getDatabase } from '../../src/database/database';
import * as settingsService from '../../src/settings/settings-service';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockService = settingsService as jest.Mocked<typeof settingsService>;
const mockDb = {} as SQLiteDatabase;

const baseSettings: UserSettings = {
  id: '1',
  dayResetTime: '04:00',
  onboardingSurveyResponse: null,
  onboardingCompleted: false,
  globalBlockingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockResolvedValue(mockDb);
  useSettingsStore.setState({
    settings: null,
    isLoading: false,
    error: null,
  });
});

describe('useSettingsStore', () => {
  describe('updateSurveyResponse', () => {
    it('persists the response and updates store state', async () => {
      const updated: UserSettings = {
        ...baseSettings,
        onboardingSurveyResponse: 'student',
      };
      mockService.updateSurveyResponse.mockResolvedValue(updated);

      await useSettingsStore.getState().updateSurveyResponse('student');

      expect(mockService.updateSurveyResponse).toHaveBeenCalledWith(
        mockDb,
        'student'
      );
      expect(useSettingsStore.getState().settings).toEqual(updated);
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('sets error state when service throws', async () => {
      mockService.updateSurveyResponse.mockRejectedValue(
        new Error('DB write failed')
      );

      await useSettingsStore.getState().updateSurveyResponse('work');

      expect(useSettingsStore.getState().error).toBe('DB write failed');
      expect(useSettingsStore.getState().settings).toBeNull();
    });

    it('stores a generic error message for non-Error throws', async () => {
      mockService.updateSurveyResponse.mockRejectedValue('unexpected');

      await useSettingsStore.getState().updateSurveyResponse('general');

      expect(useSettingsStore.getState().error).toBe(
        'Failed to save survey response'
      );
    });
  });

  describe('completeOnboarding', () => {
    it('sets onboardingCompleted to true in store state', async () => {
      const updated: UserSettings = {
        ...baseSettings,
        onboardingCompleted: true,
      };
      mockService.completeOnboarding.mockResolvedValue(updated);

      await useSettingsStore.getState().completeOnboarding();

      expect(mockService.completeOnboarding).toHaveBeenCalledWith(mockDb);
      expect(useSettingsStore.getState().settings?.onboardingCompleted).toBe(
        true
      );
      expect(useSettingsStore.getState().error).toBeNull();
    });

    it('sets error state when service throws', async () => {
      mockService.completeOnboarding.mockRejectedValue(
        new Error('Onboarding update failed')
      );

      await useSettingsStore.getState().completeOnboarding();

      expect(useSettingsStore.getState().error).toBe(
        'Onboarding update failed'
      );
    });

    it('stores a generic error message for non-Error throws', async () => {
      mockService.completeOnboarding.mockRejectedValue(42);

      await useSettingsStore.getState().completeOnboarding();

      expect(useSettingsStore.getState().error).toBe(
        'Failed to complete onboarding'
      );
    });
  });
});
