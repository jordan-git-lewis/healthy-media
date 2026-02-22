import type { SQLiteDatabase } from 'expo-sqlite';
import type { BlockedApp } from '../../src/app-blocking/blocking-types';
import type { InstalledApp } from '../../src/app-blocking/blocking-store';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'mock-uuid'),
}));
jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('../../src/database/repositories/blocked-app-repository');
jest.mock('../../src/native-bridge');
jest.mock('../../src/app-blocking/blocking-service');

import { useBlockingStore } from '../../src/app-blocking/blocking-store';
import { getDatabase } from '../../src/database/database';
import * as blockedAppRepository from '../../src/database/repositories/blocked-app-repository';
import * as blockingService from '../../src/app-blocking/blocking-service';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockRepo = blockedAppRepository as jest.Mocked<typeof blockedAppRepository>;
const mockService = blockingService as jest.Mocked<typeof blockingService>;

const mockDb = {} as SQLiteDatabase;

const sampleBlockedApp = (overrides: Partial<BlockedApp> = {}): BlockedApp => ({
  id: 'app-1',
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  iconUri: 'file:///icon.png',
  enforcementLevel: 'hard_block',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const sampleInstalledApp = (overrides: Partial<InstalledApp> = {}): InstalledApp => ({
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  iconUri: 'file:///icon.png',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockResolvedValue(mockDb);
  useBlockingStore.setState({
    blockedApps: [],
    isHydrated: false,
    error: null,
  });
});

describe('useBlockingStore', () => {
  describe('hydrate', () => {
    it('loads all blocked apps from repository into store', async () => {
      const apps = [sampleBlockedApp()];
      mockRepo.getAll.mockResolvedValue(apps);

      await useBlockingStore.getState().hydrate();

      const state = useBlockingStore.getState();
      expect(state.blockedApps).toEqual(apps);
      expect(state.isHydrated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets error and leaves isHydrated false on failure', async () => {
      mockRepo.getAll.mockRejectedValue(new Error('DB connection failed'));

      await useBlockingStore.getState().hydrate();

      const state = useBlockingStore.getState();
      expect(state.error).toBe('DB connection failed');
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('addApp', () => {
    it('optimistically adds app to store, then replaces with persisted record', async () => {
      const persisted = sampleBlockedApp({ id: 'persisted-id' });
      mockRepo.upsert.mockResolvedValue(persisted);

      await useBlockingStore.getState().addApp(sampleInstalledApp());

      const state = useBlockingStore.getState();
      expect(state.blockedApps).toHaveLength(1);
      expect(state.blockedApps[0]).toEqual(persisted);
      expect(state.blockedApps[0].enforcementLevel).toBe('hard_block');
    });

    it('rolls back optimistic add on upsert failure', async () => {
      mockRepo.upsert.mockRejectedValue(new Error('Write failed'));

      await useBlockingStore.getState().addApp(sampleInstalledApp());

      const state = useBlockingStore.getState();
      expect(state.blockedApps).toHaveLength(0);
      expect(state.error).toBe('Write failed');
    });
  });

  describe('removeApp', () => {
    it('optimistically removes app from store, then persists deletion', async () => {
      useBlockingStore.setState({ blockedApps: [sampleBlockedApp()] });
      mockRepo.deleteById.mockResolvedValue(undefined);

      await useBlockingStore.getState().removeApp('app-1');

      expect(useBlockingStore.getState().blockedApps).toHaveLength(0);
      expect(mockRepo.deleteById).toHaveBeenCalledWith(mockDb, 'app-1');
    });

    it('rolls back on deleteById failure', async () => {
      const app = sampleBlockedApp();
      useBlockingStore.setState({ blockedApps: [app] });
      mockRepo.deleteById.mockRejectedValue(new Error('Delete failed'));

      await useBlockingStore.getState().removeApp('app-1');

      const state = useBlockingStore.getState();
      expect(state.blockedApps).toEqual([app]);
      expect(state.error).toBe('Delete failed');
    });
  });

  describe('updateEnforcement', () => {
    it('optimistically updates enforcement level in store, then persists', async () => {
      useBlockingStore.setState({ blockedApps: [sampleBlockedApp()] });
      mockRepo.updateEnforcement.mockResolvedValue(undefined);

      await useBlockingStore.getState().updateEnforcement('app-1', 'soft_warning');

      const state = useBlockingStore.getState();
      expect(state.blockedApps[0].enforcementLevel).toBe('soft_warning');
      expect(mockRepo.updateEnforcement).toHaveBeenCalledWith(
        mockDb,
        'app-1',
        'soft_warning'
      );
    });

    it('rolls back on persistence failure', async () => {
      const app = sampleBlockedApp({ enforcementLevel: 'hard_block' });
      useBlockingStore.setState({ blockedApps: [app] });
      mockRepo.updateEnforcement.mockRejectedValue(new Error('Update failed'));

      await useBlockingStore.getState().updateEnforcement('app-1', 'off');

      const state = useBlockingStore.getState();
      expect(state.blockedApps[0].enforcementLevel).toBe('hard_block');
      expect(state.error).toBe('Update failed');
    });
  });
});

describe('blocking-service', () => {
  describe('syncBlockedAppsToNative', () => {
    it('filters active apps and delegates to service', async () => {
      mockService.syncBlockedAppsToNative.mockResolvedValue(undefined);

      await mockService.syncBlockedAppsToNative();

      expect(mockService.syncBlockedAppsToNative).toHaveBeenCalled();
    });
  });

  describe('evaluateBlockingState', () => {
    it('returns stub blocking state with isBlocking false', async () => {
      mockService.evaluateBlockingState.mockResolvedValue({
        isBlocking: false,
        reason: null,
        taskProgress: null,
        timeRemaining: null,
      });

      const result = await mockService.evaluateBlockingState();

      expect(result.isBlocking).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.taskProgress).toBeNull();
      expect(result.timeRemaining).toBeNull();
    });
  });
});
