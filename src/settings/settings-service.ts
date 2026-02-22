import type { SQLiteDatabase } from 'expo-sqlite';
import type { UserSettings } from './settings-types';
import type { MonitoringBridge } from '../native-bridge/monitoring-bridge';
import * as userSettingsRepository from '../database/repositories/user-settings-repository';
import { NativeBridgeError } from '../shared/error-types';

export async function loadSettings(db: SQLiteDatabase): Promise<UserSettings> {
  return userSettingsRepository.get(db);
}

export async function updateDayResetTime(
  db: SQLiteDatabase,
  time: string
): Promise<UserSettings> {
  return userSettingsRepository.update(db, { dayResetTime: time });
}

export async function updateSurveyResponse(
  db: SQLiteDatabase,
  response: string
): Promise<UserSettings> {
  return userSettingsRepository.update(db, {
    onboardingSurveyResponse: response,
  });
}

export async function completeOnboarding(
  db: SQLiteDatabase
): Promise<UserSettings> {
  return userSettingsRepository.update(db, { onboardingCompleted: true });
}

export async function setGlobalBlocking(
  db: SQLiteDatabase,
  enabled: boolean,
  bridge: MonitoringBridge
): Promise<UserSettings> {
  const previous = await userSettingsRepository.get(db);
  const updated = await userSettingsRepository.update(db, {
    globalBlockingEnabled: enabled,
  });

  try {
    if (enabled) {
      await bridge.startMonitoringService();
    } else {
      await bridge.stopMonitoringService();
    }
  } catch (error) {
    await userSettingsRepository.update(db, {
      globalBlockingEnabled: previous.globalBlockingEnabled,
    });
    throw new NativeBridgeError('Failed to toggle monitoring service', {
      cause: error,
    });
  }

  return updated;
}
