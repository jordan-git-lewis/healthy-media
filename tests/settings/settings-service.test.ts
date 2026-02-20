import type { SQLiteDatabase } from 'expo-sqlite';
import type { MonitoringBridge } from '../../src/native-bridge/monitoring-bridge';
import type { UserSettings } from '../../src/settings/settings-types';
import { NativeBridgeError } from '../../src/shared/error-types';
import * as settingsService from '../../src/settings/settings-service';
import * as userSettingsRepository from '../../src/database/repositories/user-settings-repository';

jest.mock('../../src/database/repositories/user-settings-repository');

const mockRepo = userSettingsRepository as jest.Mocked<
  typeof userSettingsRepository
>;

const mockDb = {} as SQLiteDatabase;

const sampleSettings: UserSettings = {
  id: '1',
  dayResetTime: '04:00',
  onboardingSurveyResponse: null,
  onboardingCompleted: true,
  globalBlockingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockBridge: jest.Mocked<MonitoringBridge> = {
  startMonitoringService: jest.fn(),
  stopMonitoringService: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('settingsService', () => {
  describe('loadSettings', () => {
    it('delegates to userSettingsRepository.get', async () => {
      mockRepo.get.mockResolvedValue(sampleSettings);

      const result = await settingsService.loadSettings(mockDb);

      expect(mockRepo.get).toHaveBeenCalledWith(mockDb);
      expect(result).toEqual(sampleSettings);
    });
  });

  describe('updateDayResetTime', () => {
    it('calls repository with correct params', async () => {
      const updated = { ...sampleSettings, dayResetTime: '05:00' };
      mockRepo.update.mockResolvedValue(updated);

      const result = await settingsService.updateDayResetTime(mockDb, '05:00');

      expect(mockRepo.update).toHaveBeenCalledWith(mockDb, {
        dayResetTime: '05:00',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('setGlobalBlocking', () => {
    it('persists enabled=true and calls startMonitoringService', async () => {
      const previous = { ...sampleSettings, globalBlockingEnabled: false };
      const updated = { ...sampleSettings, globalBlockingEnabled: true };
      mockRepo.get.mockResolvedValue(previous);
      mockRepo.update.mockResolvedValue(updated);
      mockBridge.startMonitoringService.mockResolvedValue(undefined);

      const result = await settingsService.setGlobalBlocking(
        mockDb,
        true,
        mockBridge
      );

      expect(mockRepo.update).toHaveBeenCalledWith(mockDb, {
        globalBlockingEnabled: true,
      });
      expect(mockBridge.startMonitoringService).toHaveBeenCalled();
      expect(mockBridge.stopMonitoringService).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('persists enabled=false and calls stopMonitoringService', async () => {
      const previous = { ...sampleSettings, globalBlockingEnabled: true };
      const updated = { ...sampleSettings, globalBlockingEnabled: false };
      mockRepo.get.mockResolvedValue(previous);
      mockRepo.update.mockResolvedValue(updated);
      mockBridge.stopMonitoringService.mockResolvedValue(undefined);

      const result = await settingsService.setGlobalBlocking(
        mockDb,
        false,
        mockBridge
      );

      expect(mockRepo.update).toHaveBeenCalledWith(mockDb, {
        globalBlockingEnabled: false,
      });
      expect(mockBridge.stopMonitoringService).toHaveBeenCalled();
      expect(mockBridge.startMonitoringService).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('rolls back DB and throws NativeBridgeError on bridge failure', async () => {
      const previous = { ...sampleSettings, globalBlockingEnabled: true };
      const updated = { ...sampleSettings, globalBlockingEnabled: false };
      mockRepo.get.mockResolvedValue(previous);
      mockRepo.update
        .mockResolvedValueOnce(updated)
        .mockResolvedValueOnce(previous);
      mockBridge.stopMonitoringService.mockRejectedValue(
        new Error('native crash')
      );

      await expect(
        settingsService.setGlobalBlocking(mockDb, false, mockBridge)
      ).rejects.toThrow(NativeBridgeError);

      expect(mockRepo.update).toHaveBeenCalledTimes(2);
      expect(mockRepo.update).toHaveBeenLastCalledWith(mockDb, {
        globalBlockingEnabled: true,
      });
    });
  });
});
