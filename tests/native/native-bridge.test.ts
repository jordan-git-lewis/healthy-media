/**
 * Unit tests for the TypeScript native bridge (src/native-bridge/native-bridge.ts
 * and src/native-bridge/native-events.ts).
 *
 * Tests verify:
 *   - All bridge functions are exported with correct signatures
 *   - Errors from native modules are wrapped in NativeBridgeError or PermissionError
 *   - getDeviceManufacturer() is synchronous
 *   - openOEMPowerSettings() never throws (resolves false on any error)
 *   - Event listeners are registered via NativeEventEmitter and return subscriptions
 *   - index.ts re-exports all public symbols
 */

// ---- Mock react-native -------------------------------------------------------

const mockScanInstalledApps = jest.fn();
const mockHasUsageStatsPermission = jest.fn();
const mockRequestUsageStatsPermission = jest.fn();
const mockHasOverlayPermission = jest.fn();
const mockRequestOverlayPermission = jest.fn();
const mockIsBatteryOptimizationEnabled = jest.fn();
const mockRequestBatteryOptimizationExemption = jest.fn();
const mockGetDeviceManufacturer = jest.fn();
const mockOpenOEMPowerSettings = jest.fn();

const mockAddListener = jest.fn().mockReturnValue({ remove: jest.fn() });

jest.mock('react-native', () => ({
  NativeModules: {
    AppScannerModule: {
      scanInstalledApps: mockScanInstalledApps,
    },
    PermissionHelper: {
      hasUsageStatsPermission: mockHasUsageStatsPermission,
      requestUsageStatsPermission: mockRequestUsageStatsPermission,
      hasOverlayPermission: mockHasOverlayPermission,
      requestOverlayPermission: mockRequestOverlayPermission,
      isBatteryOptimizationEnabled: mockIsBatteryOptimizationEnabled,
      requestBatteryOptimizationExemption: mockRequestBatteryOptimizationExemption,
    },
    BatteryOptimizationHelper: {
      getDeviceManufacturer: mockGetDeviceManufacturer,
      openOEMPowerSettings: mockOpenOEMPowerSettings,
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
  })),
}));

// Import everything after mocks
import * as bridge from '../../src/native-bridge/native-bridge';
import * as events from '../../src/native-bridge/native-events';
import * as index from '../../src/native-bridge/index';
import { NativeBridgeError, PermissionError } from '../../src/shared/error-types';

// ---- Tests -------------------------------------------------------------------

describe('native-bridge.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  // ---------- scanInstalledApps -----------------------------------------------

  it('scanInstalledApps resolves with the native result', async () => {
    const apps = [{ packageName: 'com.test', appName: 'Test', iconUri: 'file:///test.png' }];
    mockScanInstalledApps.mockResolvedValueOnce(apps);
    const result = await bridge.scanInstalledApps();
    expect(result).toEqual(apps);
  });

  it('scanInstalledApps wraps native errors in NativeBridgeError', async () => {
    mockScanInstalledApps.mockRejectedValueOnce(new Error('PM failure'));
    await expect(bridge.scanInstalledApps()).rejects.toBeInstanceOf(NativeBridgeError);
  });

  // ---------- Permission methods ----------------------------------------------

  it('hasUsageStatsPermission wraps native errors in PermissionError', async () => {
    mockHasUsageStatsPermission.mockRejectedValueOnce(new Error('AppOps failure'));
    await expect(bridge.hasUsageStatsPermission()).rejects.toBeInstanceOf(PermissionError);
  });

  it('hasUsageStatsPermission resolves with native boolean', async () => {
    mockHasUsageStatsPermission.mockResolvedValueOnce(true);
    expect(await bridge.hasUsageStatsPermission()).toBe(true);
  });

  it('requestUsageStatsPermission wraps native errors in PermissionError', async () => {
    mockRequestUsageStatsPermission.mockRejectedValueOnce(new Error('No activity'));
    await expect(bridge.requestUsageStatsPermission()).rejects.toBeInstanceOf(PermissionError);
  });

  it('hasOverlayPermission resolves with native boolean', async () => {
    mockHasOverlayPermission.mockResolvedValueOnce(false);
    expect(await bridge.hasOverlayPermission()).toBe(false);
  });

  it('isBatteryOptimizationEnabled wraps native errors in PermissionError', async () => {
    mockIsBatteryOptimizationEnabled.mockRejectedValueOnce(new Error('PowerManager unavailable'));
    await expect(bridge.isBatteryOptimizationEnabled()).rejects.toBeInstanceOf(PermissionError);
  });

  // ---------- getDeviceManufacturer (synchronous) ----------------------------

  it('getDeviceManufacturer is synchronous and returns a string', () => {
    mockGetDeviceManufacturer.mockReturnValueOnce('samsung');
    const result = bridge.getDeviceManufacturer();
    expect(typeof result).toBe('string');
    expect(result).toBe('samsung');
  });

  // ---------- openOEMPowerSettings -------------------------------------------

  it('openOEMPowerSettings resolves with true for known OEM', async () => {
    mockOpenOEMPowerSettings.mockResolvedValueOnce(true);
    expect(await bridge.openOEMPowerSettings()).toBe(true);
  });

  it('openOEMPowerSettings resolves false (never rejects) on unexpected error', async () => {
    mockOpenOEMPowerSettings.mockRejectedValueOnce(new Error('crash'));
    // Should NOT throw — resolves false
    await expect(bridge.openOEMPowerSettings()).resolves.toBe(false);
  });

  // ---------- Monitoring/Overlay (stub interface) ----------------------------

  it('startMonitoringService throws NativeBridgeError (not yet implemented)', async () => {
    await expect(
      bridge.startMonitoringService({ blockedPackages: [], pollingIntervalMs: 1000 })
    ).rejects.toBeInstanceOf(NativeBridgeError);
  });

  it('showBlockingOverlay throws NativeBridgeError (not yet implemented)', async () => {
    await expect(
      bridge.showBlockingOverlay({
        appName: 'Instagram',
        packageName: 'com.instagram.android',
        taskProgress: null,
        timeRemaining: null,
        enforcementLevel: 'hard_block',
      })
    ).rejects.toBeInstanceOf(NativeBridgeError);
  });
});

// ---------------------------------------------------------------------------
// native-events.ts
// ---------------------------------------------------------------------------

describe('native-events.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  it('onBlockedAppDetected returns a subscription with a remove() method', () => {
    const sub = events.onBlockedAppDetected(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe('function');
  });

  it('onOverrideConfirmed returns a subscription with a remove() method', () => {
    const sub = events.onOverrideConfirmed(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe('function');
  });

  it('onServiceStopped returns a subscription with a remove() method', () => {
    const sub = events.onServiceStopped(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe('function');
  });

  it('onBlockedAppDetected registers with the correct event name', () => {
    const cb = jest.fn();
    events.onBlockedAppDetected(cb);
    expect(mockAddListener).toHaveBeenCalledWith('onBlockedAppDetected', cb);
  });

  it('onOverrideConfirmed registers with the correct event name', () => {
    const cb = jest.fn();
    events.onOverrideConfirmed(cb);
    expect(mockAddListener).toHaveBeenCalledWith('onOverrideConfirmed', cb);
  });

  it('onServiceStopped registers with the correct event name', () => {
    const cb = jest.fn();
    events.onServiceStopped(cb);
    expect(mockAddListener).toHaveBeenCalledWith('onServiceStopped', cb);
  });
});

// ---------------------------------------------------------------------------
// index.ts re-exports
// ---------------------------------------------------------------------------

describe('native-bridge index.ts', () => {
  it('re-exports all bridge functions', () => {
    expect(typeof index.scanInstalledApps).toBe('function');
    expect(typeof index.hasUsageStatsPermission).toBe('function');
    expect(typeof index.requestUsageStatsPermission).toBe('function');
    expect(typeof index.hasOverlayPermission).toBe('function');
    expect(typeof index.requestOverlayPermission).toBe('function');
    expect(typeof index.isBatteryOptimizationEnabled).toBe('function');
    expect(typeof index.requestBatteryOptimizationExemption).toBe('function');
    expect(typeof index.getDeviceManufacturer).toBe('function');
    expect(typeof index.openOEMPowerSettings).toBe('function');
    expect(typeof index.startMonitoringService).toBe('function');
    expect(typeof index.stopMonitoringService).toBe('function');
    expect(typeof index.isMonitoringServiceRunning).toBe('function');
    expect(typeof index.updateBlockedApps).toBe('function');
    expect(typeof index.showBlockingOverlay).toBe('function');
    expect(typeof index.dismissBlockingOverlay).toBe('function');
  });

  it('re-exports all event listener functions', () => {
    expect(typeof index.onBlockedAppDetected).toBe('function');
    expect(typeof index.onOverrideConfirmed).toBe('function');
    expect(typeof index.onServiceStopped).toBe('function');
  });
});
