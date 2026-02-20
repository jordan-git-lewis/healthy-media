import { create } from 'zustand';
import type { UserSettings } from './settings-types';
import * as settingsService from './settings-service';
import { monitoringBridge } from '../native-bridge/monitoring-bridge';
import { getDatabase } from '../database/database';

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateDayResetTime: (time: string) => Promise<void>;
  toggleGlobalBlocking: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  async loadSettings() {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const settings = await settingsService.loadSettings(db);
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to load settings',
      });
    }
  },

  async updateDayResetTime(time: string) {
    set({ error: null });
    try {
      const db = await getDatabase();
      const settings = await settingsService.updateDayResetTime(db, time);
      set({ settings });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update day reset time',
      });
    }
  },

  async toggleGlobalBlocking(enabled: boolean) {
    const previous = get().settings;
    if (previous) {
      set({ settings: { ...previous, globalBlockingEnabled: enabled } });
    }
    set({ error: null });

    try {
      const db = await getDatabase();
      const settings = await settingsService.setGlobalBlocking(
        db,
        enabled,
        monitoringBridge
      );
      set({ settings });
    } catch (error) {
      if (previous) {
        set({ settings: previous });
      }
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to toggle global blocking',
      });
    }
  },
}));
