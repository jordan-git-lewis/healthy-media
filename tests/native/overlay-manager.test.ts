/**
 * Unit tests for OverlayManager native bridge (#37).
 *
 * Tests the TypeScript bridge wrappers in native-bridge.ts:
 *   - showBlockingOverlay forwards config to OverlayManagerModule with serialized JSON
 *   - dismissBlockingOverlay delegates to OverlayManagerModule
 *   - Permission errors surface as PermissionError
 *   - Native errors wrap as NativeBridgeError
 *   - onOverrideConfirmed event listener is registered correctly
 */

// ---- Mock react-native -------------------------------------------------------

const mockShowBlockingOverlay = jest.fn();
const mockDismissBlockingOverlay = jest.fn();
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
      startMonitoringService: jest.fn(),
      stopMonitoringService: jest.fn(),
      isMonitoringServiceRunning: jest.fn(),
      updateBlockedApps: jest.fn(),
    },
    OverlayManagerModule: {
      showBlockingOverlay: mockShowBlockingOverlay,
      dismissBlockingOverlay: mockDismissBlockingOverlay,
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
  })),
}));

import {
  showBlockingOverlay,
  dismissBlockingOverlay,
} from '../../src/native-bridge/native-bridge';
import * as events from '../../src/native-bridge/native-events';
import { NativeBridgeError, PermissionError } from '../../src/shared/error-types';
import type { OverlayConfig } from '../../src/native-bridge/native-bridge-types';

// ---- Helpers -----------------------------------------------------------------

function baseConfig(overrides: Partial<OverlayConfig> = {}): OverlayConfig {
  return {
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    taskProgress: null,
    timeRemaining: null,
    enforcementLevel: 'hard_block',
    ...overrides,
  };
}

// ---- Tests -------------------------------------------------------------------

describe('showBlockingOverlay', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls OverlayManagerModule with correct args when no task/time data', async () => {
    mockShowBlockingOverlay.mockResolvedValueOnce(undefined);
    await showBlockingOverlay(baseConfig());
    expect(mockShowBlockingOverlay).toHaveBeenCalledWith(
      'Instagram',
      'com.instagram.android',
      null,
      null,
      'hard_block'
    );
  });

  it('serializes taskProgress as JSON string', async () => {
    mockShowBlockingOverlay.mockResolvedValueOnce(undefined);
    const config = baseConfig({
      taskProgress: { completed: 2, total: 5, threshold: 3 },
    });
    await showBlockingOverlay(config);
    expect(mockShowBlockingOverlay).toHaveBeenCalledWith(
      'Instagram',
      'com.instagram.android',
      JSON.stringify({ completed: 2, total: 5, threshold: 3 }),
      null,
      'hard_block'
    );
  });

  it('serializes timeRemaining as JSON string', async () => {
    mockShowBlockingOverlay.mockResolvedValueOnce(undefined);
    const config = baseConfig({ timeRemaining: { minutes: 45 } });
    await showBlockingOverlay(config);
    expect(mockShowBlockingOverlay).toHaveBeenCalledWith(
      'Instagram',
      'com.instagram.android',
      null,
      JSON.stringify({ minutes: 45 }),
      'hard_block'
    );
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockShowBlockingOverlay.mockRejectedValueOnce(new Error('WindowManager error'));
    await expect(showBlockingOverlay(baseConfig())).rejects.toBeInstanceOf(NativeBridgeError);
  });

  it('surfaces PERMISSION_ERROR as PermissionError', async () => {
    const permErr = Object.assign(new Error('Overlay permission required'), {
      code: 'PERMISSION_ERROR',
    });
    mockShowBlockingOverlay.mockRejectedValueOnce(permErr);
    await expect(showBlockingOverlay(baseConfig())).rejects.toBeInstanceOf(PermissionError);
  });

  it('passes soft_warning enforcement level', async () => {
    mockShowBlockingOverlay.mockResolvedValueOnce(undefined);
    await showBlockingOverlay(baseConfig({ enforcementLevel: 'soft_warning' }));
    expect(mockShowBlockingOverlay).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      null,
      null,
      'soft_warning'
    );
  });
});

describe('dismissBlockingOverlay', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves when overlay is dismissed', async () => {
    mockDismissBlockingOverlay.mockResolvedValueOnce(undefined);
    await expect(dismissBlockingOverlay()).resolves.toBeUndefined();
    expect(mockDismissBlockingOverlay).toHaveBeenCalledTimes(1);
  });

  it('wraps native errors in NativeBridgeError', async () => {
    mockDismissBlockingOverlay.mockRejectedValueOnce(new Error('Not showing'));
    await expect(dismissBlockingOverlay()).rejects.toBeInstanceOf(NativeBridgeError);
  });
});

describe('onOverrideConfirmed event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  it('registers listener with correct event name', () => {
    const cb = jest.fn();
    events.onOverrideConfirmed(cb);
    expect(mockAddListener).toHaveBeenCalledWith('onOverrideConfirmed', cb);
  });

  it('returns a subscription with remove()', () => {
    const sub = events.onOverrideConfirmed(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe('function');
  });
});
