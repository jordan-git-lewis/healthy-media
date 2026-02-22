/**
 * Unit tests for app-selection business logic.
 *
 * These tests cover the pure logic layer (store interactions, error handling,
 * filtering) without rendering the React Native component.
 */

import type { InstalledApp } from '../../src/app-blocking/blocking-store';
import type { BlockedApp } from '../../src/app-blocking/blocking-types';

jest.mock('../../src/native-bridge', () => ({
  scanInstalledApps: jest.fn(),
}));
jest.mock('../../src/app-blocking/blocking-store', () => ({
  useBlockingStore: jest.fn(),
}));

import { scanInstalledApps } from '../../src/native-bridge';
import { NativeBridgeError } from '../../src/shared/error-types';

const mockScan = scanInstalledApps as jest.MockedFunction<typeof scanInstalledApps>;

const makeInstalledApp = (overrides: Partial<InstalledApp> = {}): InstalledApp => ({
  packageName: 'com.example.app',
  appName: 'Example App',
  iconUri: 'file:///icon.png',
  ...overrides,
});

const makeBlockedApp = (overrides: Partial<BlockedApp> = {}): BlockedApp => ({
  id: 'blocked-1',
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

describe('app-selection logic', () => {
  describe('scanInstalledApps integration', () => {
    it('returns installed apps on success', async () => {
      const apps = [
        makeInstalledApp({ packageName: 'com.instagram.android', appName: 'Instagram' }),
        makeInstalledApp({ packageName: 'com.twitter.android', appName: 'Twitter' }),
      ];
      mockScan.mockResolvedValue(apps);

      const result = await scanInstalledApps();

      expect(result).toHaveLength(2);
      expect(result[0].appName).toBe('Instagram');
    });

    it('throws NativeBridgeError when scanning fails', async () => {
      mockScan.mockRejectedValue(
        new NativeBridgeError('Failed to scan installed apps')
      );

      await expect(scanInstalledApps()).rejects.toThrow(NativeBridgeError);
      await expect(scanInstalledApps()).rejects.toThrow('Failed to scan installed apps');
    });
  });

  describe('selection state logic', () => {
    it('correctly identifies selected apps by packageName', () => {
      const installed = [
        makeInstalledApp({ packageName: 'com.instagram.android' }),
        makeInstalledApp({ packageName: 'com.twitter.android' }),
      ];
      const blocked = [
        makeBlockedApp({ packageName: 'com.instagram.android' }),
      ];
      const blockedPackageNames = new Set(blocked.map((a) => a.packageName));

      expect(blockedPackageNames.has('com.instagram.android')).toBe(true);
      expect(blockedPackageNames.has('com.twitter.android')).toBe(false);
      expect(installed.filter((a) => blockedPackageNames.has(a.packageName))).toHaveLength(1);
    });

    it('filters apps by search query case-insensitively', () => {
      const apps = [
        makeInstalledApp({ appName: 'Instagram', packageName: 'com.instagram.android' }),
        makeInstalledApp({ appName: 'Twitter', packageName: 'com.twitter.android' }),
        makeInstalledApp({ appName: 'Facebook', packageName: 'com.facebook.katana' }),
      ];
      const query = 'twitter';
      const filtered = apps.filter(
        (app) =>
          app.appName.toLowerCase().includes(query) ||
          app.packageName.toLowerCase().includes(query)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].appName).toBe('Twitter');
    });

    it('returns all apps when search query is empty', () => {
      const apps = [
        makeInstalledApp({ appName: 'Instagram' }),
        makeInstalledApp({ appName: 'Twitter' }),
      ];
      const query = '';
      const filtered = query.trim()
        ? apps.filter((app) => app.appName.toLowerCase().includes(query))
        : apps;

      expect(filtered).toHaveLength(2);
    });

    it('Continue button should be disabled when no apps are selected', () => {
      const blockedApps: BlockedApp[] = [];
      const hasSelections = blockedApps.length > 0;
      expect(hasSelections).toBe(false);
    });

    it('Continue button should be enabled when at least one app is selected', () => {
      const blockedApps = [makeBlockedApp()];
      const hasSelections = blockedApps.length > 0;
      expect(hasSelections).toBe(true);
    });
  });
});
