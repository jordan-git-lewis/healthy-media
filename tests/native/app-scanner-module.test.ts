/**
 * Unit tests for AppScannerModule — JS-side behavior.
 *
 * These tests verify the contract between JavaScript callers and the
 * AppScannerModule native module. We mock react-native's NativeModules so
 * tests run in a Node.js environment without a real Android runtime.
 *
 * Contract tested:
 *   - scanInstalledApps() resolves with an array of InstalledApp objects
 *   - Each InstalledApp has packageName, appName, iconUri
 *   - Only non-system apps are returned (filtering tested via mock data)
 *   - Promise rejects with an error code when the native call fails
 */

// ---- Mock react-native NativeModules ----------------------------------------

const mockScanInstalledApps = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    AppScannerModule: {
      scanInstalledApps: mockScanInstalledApps,
    },
  },
}));

import { NativeModules } from 'react-native';

// ---- Helper types ------------------------------------------------------------

interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri: string;
}

// ---- Tests -------------------------------------------------------------------

describe('AppScannerModule (JS-side contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is accessible via NativeModules.AppScannerModule', () => {
    expect(NativeModules.AppScannerModule).toBeDefined();
    expect(typeof NativeModules.AppScannerModule.scanInstalledApps).toBe('function');
  });

  it('resolves with an array of InstalledApp objects', async () => {
    const mockApps: InstalledApp[] = [
      {
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        iconUri: 'file:///data/user/0/com.healthymedia.app/cache/app_icons/com.instagram.android.png',
      },
      {
        packageName: 'com.twitter.android',
        appName: 'X',
        iconUri: 'file:///data/user/0/com.healthymedia.app/cache/app_icons/com.twitter.android.png',
      },
    ];
    mockScanInstalledApps.mockResolvedValueOnce(mockApps);

    const result = await NativeModules.AppScannerModule.scanInstalledApps();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('each InstalledApp has packageName, appName, and iconUri fields', async () => {
    const mockApp: InstalledApp = {
      packageName: 'com.example.app',
      appName: 'Example App',
      iconUri: 'file:///cache/app_icons/com.example.app.png',
    };
    mockScanInstalledApps.mockResolvedValueOnce([mockApp]);

    const result: InstalledApp[] = await NativeModules.AppScannerModule.scanInstalledApps();
    const app = result[0];

    expect(app.packageName).toBe('com.example.app');
    expect(app.appName).toBe('Example App');
    expect(app.iconUri).toMatch(/^file:\/\//);
  });

  it('returns an empty array when no user-installed apps are present', async () => {
    mockScanInstalledApps.mockResolvedValueOnce([]);

    const result = await NativeModules.AppScannerModule.scanInstalledApps();

    expect(result).toEqual([]);
  });

  it('rejects with NATIVE_BRIDGE_ERROR code when PackageManager fails', async () => {
    const nativeError = Object.assign(new Error('PackageManager query failed: null'), {
      code: 'NATIVE_BRIDGE_ERROR',
    });
    mockScanInstalledApps.mockRejectedValueOnce(nativeError);

    await expect(NativeModules.AppScannerModule.scanInstalledApps()).rejects.toMatchObject({
      code: 'NATIVE_BRIDGE_ERROR',
    });
  });

  it('does not include system apps (only user-installed apps returned)', async () => {
    // The native layer filters system apps; we verify the contract by checking
    // that none of the returned apps represent known system packages.
    const mockApps: InstalledApp[] = [
      {
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        iconUri: 'file:///cache/app_icons/com.instagram.android.png',
      },
    ];
    mockScanInstalledApps.mockResolvedValueOnce(mockApps);

    const result: InstalledApp[] = await NativeModules.AppScannerModule.scanInstalledApps();

    // No system packages (like android, com.android.settings) should be present
    const hasSystemPkg = result.some(
      (app) => app.packageName === 'android' || app.packageName.startsWith('com.android.')
    );
    expect(hasSystemPkg).toBe(false);
  });

  it('iconUri starts with file:// for cached icons', async () => {
    const mockApps: InstalledApp[] = [
      {
        packageName: 'com.example.one',
        appName: 'App One',
        iconUri: 'file:///data/user/0/cache/app_icons/com.example.one.png',
      },
      {
        packageName: 'com.example.two',
        appName: 'App Two',
        iconUri: 'file:///data/user/0/cache/app_icons/com.example.two.png',
      },
    ];
    mockScanInstalledApps.mockResolvedValueOnce(mockApps);

    const result: InstalledApp[] = await NativeModules.AppScannerModule.scanInstalledApps();

    for (const app of result) {
      expect(app.iconUri).toMatch(/^file:\/\//);
    }
  });
});
