/**
 * Unit tests for boot receiver and service lifecycle (#40).
 *
 * Tests the TypeScript bridge behaviour:
 *   - stopMonitoringService throws NativeBridgeError when service not running
 *   - startMonitoringService throws PermissionError when permissions not granted
 *   - isMonitoringServiceRunning returns current state
 *   - onServiceStopped event listener is registered and receives payloads
 *   - Service lifecycle events (user_stopped, system_killed, error) are typed correctly
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
} from '../../src/native-bridge/native-bridge';
import * as events from '../../src/native-bridge/native-events';
import { NativeBridgeError, PermissionError } from '../../src/shared/error-types';
import type { ServiceStoppedPayload } from '../../src/native-bridge/native-bridge-types';

// ---- Tests -------------------------------------------------------------------

beforeEach(() => jest.clearAllMocks());

// ---- Boot / Permissions lifecycle -------------------------------------------

describe('startMonitoringService — permission validation', () => {
  it('rejects with PermissionError when PERMISSION_ERROR code is returned', async () => {
    const permErr = Object.assign(new Error('UsageStats permission required'), {
      code: 'PERMISSION_ERROR',
    });
    mockStartMonitoringService.mockRejectedValueOnce(permErr);

    await expect(
      startMonitoringService({ blockedPackages: ['com.test.app'], pollingIntervalMs: 500 })
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it('resolves when permissions are granted and service starts', async () => {
    mockStartMonitoringService.mockResolvedValueOnce(undefined);

    await expect(
      startMonitoringService({ blockedPackages: ['com.test.app'], pollingIntervalMs: 500 })
    ).resolves.toBeUndefined();
  });
});

describe('stopMonitoringService — not running guard', () => {
  it('rejects with NativeBridgeError when service is not running', async () => {
    const notRunningErr = new Error('MonitoringService is not running');
    mockStopMonitoringService.mockRejectedValueOnce(notRunningErr);

    await expect(stopMonitoringService()).rejects.toBeInstanceOf(NativeBridgeError);
  });

  it('resolves when service is running and stop succeeds', async () => {
    mockStopMonitoringService.mockResolvedValueOnce(undefined);
    await expect(stopMonitoringService()).resolves.toBeUndefined();
  });
});

// ---- isMonitoringServiceRunning ---------------------------------------------

describe('isMonitoringServiceRunning', () => {
  it('returns false when service has been stopped', async () => {
    mockIsMonitoringServiceRunning.mockResolvedValueOnce(false);
    expect(await isMonitoringServiceRunning()).toBe(false);
  });

  it('returns true when service is running', async () => {
    mockIsMonitoringServiceRunning.mockResolvedValueOnce(true);
    expect(await isMonitoringServiceRunning()).toBe(true);
  });
});

// ---- onServiceStopped event -------------------------------------------------

describe('onServiceStopped event', () => {
  beforeEach(() => {
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  it('registers listener with correct event name', () => {
    const cb = jest.fn();
    events.onServiceStopped(cb);
    expect(mockAddListener).toHaveBeenCalledWith('onServiceStopped', cb);
  });

  it('returns a subscription with remove()', () => {
    const sub = events.onServiceStopped(() => {});
    expect(typeof sub.remove).toBe('function');
  });

  it('callback receives typed payload with user_stopped reason', () => {
    let capturedPayload: ServiceStoppedPayload | null = null;
    mockAddListener.mockImplementationOnce((_event: string, cb: (p: ServiceStoppedPayload) => void) => {
      cb({ reason: 'user_stopped', message: 'Stopped by user' });
      return { remove: jest.fn() };
    });

    events.onServiceStopped((payload) => {
      capturedPayload = payload;
    });

    expect(capturedPayload).toEqual({
      reason: 'user_stopped',
      message: 'Stopped by user',
    });
  });

  it('callback receives typed payload with system_killed reason', () => {
    let capturedPayload: ServiceStoppedPayload | null = null;
    mockAddListener.mockImplementationOnce((_event: string, cb: (p: ServiceStoppedPayload) => void) => {
      cb({ reason: 'system_killed', message: 'Service destroyed by system' });
      return { remove: jest.fn() };
    });

    events.onServiceStopped((payload) => {
      capturedPayload = payload;
    });

    expect(capturedPayload).toEqual({
      reason: 'system_killed',
      message: 'Service destroyed by system',
    });
  });

  it('callback receives typed payload with error reason', () => {
    let capturedPayload: ServiceStoppedPayload | null = null;
    mockAddListener.mockImplementationOnce((_event: string, cb: (p: ServiceStoppedPayload) => void) => {
      cb({ reason: 'error', message: 'Monitoring loop crashed' });
      return { remove: jest.fn() };
    });

    events.onServiceStopped((payload) => {
      capturedPayload = payload;
    });

    expect(capturedPayload).toEqual({
      reason: 'error',
      message: 'Monitoring loop crashed',
    });
  });
});
