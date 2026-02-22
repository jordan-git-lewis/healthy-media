import { create } from 'zustand';
import type { BlockedApp, EnforcementLevel } from './blocking-types';
import * as blockedAppRepository from '../database/repositories/blocked-app-repository';
import { getDatabase } from '../database/database';
import { generateId } from '../shared/uuid-utils';

/** Minimal type for an installed app as returned by the native bridge. */
export interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri: string;
}

interface BlockingStore {
  blockedApps: BlockedApp[];
  isHydrated: boolean;
  error: string | null;
  hydrate(): Promise<void>;
  addApp(app: InstalledApp): Promise<void>;
  removeApp(id: string): Promise<void>;
  updateEnforcement(id: string, level: EnforcementLevel): Promise<void>;
}

export const useBlockingStore = create<BlockingStore>((set, get) => ({
  blockedApps: [],
  isHydrated: false,
  error: null,

  async hydrate() {
    set({ error: null });
    try {
      const db = await getDatabase();
      const blockedApps = await blockedAppRepository.getAll(db);
      set({ blockedApps, isHydrated: true });
    } catch (error) {
      set({
        isHydrated: false,
        error: error instanceof Error ? error.message : 'Failed to load blocked apps',
      });
    }
  },

  async addApp(app: InstalledApp) {
    const now = new Date().toISOString();
    const optimisticApp: BlockedApp = {
      id: generateId(),
      packageName: app.packageName,
      appName: app.appName,
      iconUri: app.iconUri,
      enforcementLevel: 'hard_block',
      createdAt: now,
      updatedAt: now,
    };
    const previous = get().blockedApps;
    set({ blockedApps: [...previous, optimisticApp], error: null });

    try {
      const db = await getDatabase();
      const persisted = await blockedAppRepository.upsert(db, {
        packageName: app.packageName,
        appName: app.appName,
        iconUri: app.iconUri,
        enforcementLevel: 'hard_block',
      });
      // Replace the optimistic entry with the persisted record
      set({
        blockedApps: get().blockedApps.map((a) =>
          a.id === optimisticApp.id ? persisted : a
        ),
      });
    } catch (error) {
      set({
        blockedApps: previous,
        error: error instanceof Error ? error.message : 'Failed to add app',
      });
    }
  },

  async removeApp(id: string) {
    const previous = get().blockedApps;
    set({ blockedApps: previous.filter((a) => a.id !== id), error: null });

    try {
      const db = await getDatabase();
      await blockedAppRepository.deleteById(db, id);
    } catch (error) {
      set({
        blockedApps: previous,
        error: error instanceof Error ? error.message : 'Failed to remove app',
      });
    }
  },

  async updateEnforcement(id: string, level: EnforcementLevel) {
    const previous = get().blockedApps;
    set({
      blockedApps: previous.map((a) =>
        a.id === id ? { ...a, enforcementLevel: level } : a
      ),
      error: null,
    });

    try {
      const db = await getDatabase();
      await blockedAppRepository.updateEnforcement(db, id, level);
    } catch (error) {
      set({
        blockedApps: previous,
        error: error instanceof Error ? error.message : 'Failed to update enforcement',
      });
    }
  },
}));
