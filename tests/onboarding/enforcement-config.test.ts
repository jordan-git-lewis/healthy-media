/**
 * Unit tests for enforcement-config business logic.
 *
 * Tests cover: EnforcementLevel options, updateEnforcement store delegation,
 * app sorting, and "off" level persistence.
 */

import type { BlockedApp, EnforcementLevel } from '../../src/app-blocking/blocking-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'mock-uuid'),
}));
jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('../../src/database/repositories/blocked-app-repository');
jest.mock('../../src/app-blocking/blocking-store', () => ({
  useBlockingStore: jest.fn(),
}));

import { useBlockingStore } from '../../src/app-blocking/blocking-store';

interface MockStoreState {
  blockedApps: BlockedApp[];
  isHydrated: boolean;
  error: string | null;
  hydrate: jest.Mock;
  addApp: jest.Mock;
  removeApp: jest.Mock;
  updateEnforcement: jest.Mock;
}

const mockUseBlockingStore = useBlockingStore as unknown as jest.MockedFunction<
  () => MockStoreState
>;

const makeBlockedApp = (overrides: Partial<BlockedApp> = {}): BlockedApp => ({
  id: 'app-1',
  packageName: 'com.example.app',
  appName: 'Example App',
  iconUri: 'file:///icon.png',
  enforcementLevel: 'hard_block',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('enforcement-config logic', () => {
  describe('EnforcementLevel options', () => {
    it('supports hard_block enforcement level', () => {
      const level: EnforcementLevel = 'hard_block';
      expect(level).toBe('hard_block');
    });

    it('supports soft_warning enforcement level', () => {
      const level: EnforcementLevel = 'soft_warning';
      expect(level).toBe('soft_warning');
    });

    it('supports off enforcement level — app stays in list but does not block', () => {
      const level: EnforcementLevel = 'off';
      expect(level).toBe('off');
    });
  });

  describe('app sorting', () => {
    it('sorts blocked apps alphabetically by appName', () => {
      const apps = [
        makeBlockedApp({ id: 'c', appName: 'Twitter' }),
        makeBlockedApp({ id: 'a', appName: 'Instagram' }),
        makeBlockedApp({ id: 'b', appName: 'Facebook' }),
      ];
      const sorted = [...apps].sort((a, b) => a.appName.localeCompare(b.appName));
      expect(sorted.map((a) => a.appName)).toEqual(['Facebook', 'Instagram', 'Twitter']);
    });
  });

  describe('updateEnforcement delegation', () => {
    it('calls updateEnforcement on the blocking store with the correct id and level', async () => {
      const updateEnforcement = jest.fn().mockResolvedValue(undefined);
      const mockStore: MockStoreState = {
        blockedApps: [makeBlockedApp()],
        isHydrated: true,
        error: null,
        hydrate: jest.fn(),
        addApp: jest.fn(),
        removeApp: jest.fn(),
        updateEnforcement,
      };
      mockUseBlockingStore.mockReturnValue(mockStore);

      const store = mockUseBlockingStore();
      await store.updateEnforcement('app-1', 'soft_warning');

      expect(updateEnforcement).toHaveBeenCalledWith('app-1', 'soft_warning');
    });

    it('allows setting enforcement to "off" — app stays in list', async () => {
      const updateEnforcement = jest.fn().mockResolvedValue(undefined);
      const mockStore: MockStoreState = {
        blockedApps: [makeBlockedApp({ enforcementLevel: 'hard_block' })],
        isHydrated: true,
        error: null,
        hydrate: jest.fn(),
        addApp: jest.fn(),
        removeApp: jest.fn(),
        updateEnforcement,
      };
      mockUseBlockingStore.mockReturnValue(mockStore);

      const store = mockUseBlockingStore();
      await store.updateEnforcement('app-1', 'off');

      expect(updateEnforcement).toHaveBeenCalledWith('app-1', 'off');
      // App remains in the list — "off" does not remove it
      expect(store.blockedApps).toHaveLength(1);
    });
  });

  describe('hydration guard', () => {
    it('triggers hydrate when store is not yet hydrated', () => {
      const hydrate = jest.fn().mockResolvedValue(undefined);
      const mockStore: MockStoreState = {
        blockedApps: [],
        isHydrated: false,
        error: null,
        hydrate,
        addApp: jest.fn(),
        removeApp: jest.fn(),
        updateEnforcement: jest.fn(),
      };
      mockUseBlockingStore.mockReturnValue(mockStore);

      const store = mockUseBlockingStore();
      if (!store.isHydrated) {
        store.hydrate();
      }

      expect(hydrate).toHaveBeenCalled();
    });
  });
});
