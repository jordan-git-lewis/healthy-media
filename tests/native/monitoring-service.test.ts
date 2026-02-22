/**
 * Unit tests for MonitoringService native bridge (#36).
 *
 * Tests the TypeScript bridge wrappers in native-bridge.ts:
 *   - startMonitoringService forwards config to MonitoringServiceModule
 *   - stopMonitoringService delegates to MonitoringServiceModule
 *   - isMonitoringServiceRunning returns native boolean
 *   - updateBlockedApps forwards packages
 *   - Permission errors are surfaced as PermissionError
 *   - Native errors are wrapped in NativeBridgeError
 */

// ---- Mock react-native -------------------------------------------------------

const mockStartMonitoringService = jest.fn();
const mockStopMonitoringService = jest.fn();
const mockIsMonitoringServiceRunning = jest.fn();
const mockUpdateBlockedApps = jest.fn();

const mockAddListener = jest.fn().mockReturnValue({ remove: jest.fn() });

jest.mock('react-native', () => ({
  NativeModules: {
    AppScannerModule: { scanInstalledApps: jest.fn() },
    PermissionHelper: {
      hasUsageStatsPermission: jest.fn(),
      requestUsageStatsPermission: jest.fn(),
      hasOverlayPermission: jest.fn(),
      requestOverlayPermission: jest.fn(),
      isBatteryOptimizationEnabled: jest.fn(),
      requestBatteryOptimizationExemption: jest.fn(),
    },
    BatteryOptimizationHelper: {
      getDeviceManufacturer: jest.fn(),
      openOEMPowerSettings: jest.fn(),
    },
    MonitoringServiceModule: {
      startMonitoringService: mockStartMonitoringService,
      stopMonitoringService: mockStopMonitoringService,
      isMonitoringServiceRunning: mockIsMonitoringServiceRunning,
      updateBlockedApps: mockUpdateBlockedApps,
    },
    OverlayManagerModule: {
      showBlockingOverlay: jest.fn(),
      dismissBlockingOverlay: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
  })),
}));

import {
  startMonitoringService,
  stopMonitoringService,
  isMonitoringServiceRunning,
  updateBlockedApps,
} from '../../src/native-bridge/native-bridge';
import { NativeBridgeError, PermissionError } from '../../src/shared/error-types';

// ---- Tests -------------------------------------------------------------------

describe('startMonitoringService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves when MonitoringServiceModule succeeds', async () => {
    mockStartMonitoringService.mockResolvedValueOnce(undefined);
    await expect(
      startMonitoringService({ blockedPackages: ['com.instagram.android'], pollingIntervalMs: 500 })
    ).resolves.toBeUndefined();
    expect(mockStartMonitoringService).toHaveBeenCalledWith(
      ['com.instagram.android'],
      500
    );
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockStartMonitoringService.mockRejectedValueOnce(new Error('Service start failed'));
    await expect(
      startMonitoringService({ blockedPackages: [], pollingIntervalMs: 500 })
    ).rejects.toBeInstanceOf(NativeBridgeError);
  });

  it('surfaces permission rejections as PermissionError', async () => {
    const permErr = Object.assign(new Error('UsageStats required'), { code: 'PERMISSION_ERROR' });
    mockStartMonitoringService.mockRejectedValueOnce(permErr);
    await expect(
      startMonitoringService({ blockedPackages: [], pollingIntervalMs: 500 })
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe('stopMonitoringService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves when module stops successfully', async () => {
    mockStopMonitoringService.mockResolvedValueOnce(undefined);
    await expect(stopMonitoringService()).resolves.toBeUndefined();
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockStopMonitoringService.mockRejectedValueOnce(new Error('Not running'));
    await expect(stopMonitoringService()).rejects.toBeInstanceOf(NativeBridgeError);
  });
});

describe('isMonitoringServiceRunning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true when service is running', async () => {
    mockIsMonitoringServiceRunning.mockResolvedValueOnce(true);
    expect(await isMonitoringServiceRunning()).toBe(true);
  });

  it('returns false when service is stopped', async () => {
    mockIsMonitoringServiceRunning.mockResolvedValueOnce(false);
    expect(await isMonitoringServiceRunning()).toBe(false);
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockIsMonitoringServiceRunning.mockRejectedValueOnce(new Error('Query failed'));
    await expect(isMonitoringServiceRunning()).rejects.toBeInstanceOf(NativeBridgeError);
  });
});

describe('updateBlockedApps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards package list to MonitoringServiceModule', async () => {
    mockUpdateBlockedApps.mockResolvedValueOnce(undefined);
    const packages = ['com.facebook.katana', 'com.twitter.android'];
    await updateBlockedApps(packages);
    expect(mockUpdateBlockedApps).toHaveBeenCalledWith(packages);
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockUpdateBlockedApps.mockRejectedValueOnce(new Error('Not bound'));
    await expect(updateBlockedApps([])).rejects.toBeInstanceOf(NativeBridgeError);
  });
});
