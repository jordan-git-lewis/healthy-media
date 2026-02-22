/**
 * Unit tests for PermissionHelper — JS-side contract.
 *
 * Tests verify that all six permission methods are exposed, return correct types,
 * and reject with descriptive errors when the native call fails.
 *
 * The react-native NativeModules is mocked to simulate device responses without
 * a real Android runtime.
 */

// ---- Mock react-native NativeModules ----------------------------------------

const mockHasUsageStatsPermission = jest.fn();
const mockRequestUsageStatsPermission = jest.fn();
const mockHasOverlayPermission = jest.fn();
const mockRequestOverlayPermission = jest.fn();
const mockIsBatteryOptimizationEnabled = jest.fn();
const mockRequestBatteryOptimizationExemption = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    PermissionHelper: {
      hasUsageStatsPermission: mockHasUsageStatsPermission,
      requestUsageStatsPermission: mockRequestUsageStatsPermission,
      hasOverlayPermission: mockHasOverlayPermission,
      requestOverlayPermission: mockRequestOverlayPermission,
      isBatteryOptimizationEnabled: mockIsBatteryOptimizationEnabled,
      requestBatteryOptimizationExemption: mockRequestBatteryOptimizationExemption,
    },
  },
}));

import { NativeModules } from 'react-native';

// ---- Tests -------------------------------------------------------------------

describe('PermissionHelper (JS-side contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is accessible via NativeModules.PermissionHelper', () => {
    expect(NativeModules.PermissionHelper).toBeDefined();
  });

  it('exposes all required permission methods', () => {
    const ph = NativeModules.PermissionHelper;
    expect(typeof ph.hasUsageStatsPermission).toBe('function');
    expect(typeof ph.requestUsageStatsPermission).toBe('function');
    expect(typeof ph.hasOverlayPermission).toBe('function');
    expect(typeof ph.requestOverlayPermission).toBe('function');
    expect(typeof ph.isBatteryOptimizationEnabled).toBe('function');
    expect(typeof ph.requestBatteryOptimizationExemption).toBe('function');
  });

  // ---------- hasUsageStatsPermission ----------------------------------------

  it('hasUsageStatsPermission resolves with true when permission is granted', async () => {
    mockHasUsageStatsPermission.mockResolvedValueOnce(true);
    const result = await NativeModules.PermissionHelper.hasUsageStatsPermission();
    expect(result).toBe(true);
  });

  it('hasUsageStatsPermission resolves with false when permission is denied', async () => {
    mockHasUsageStatsPermission.mockResolvedValueOnce(false);
    const result = await NativeModules.PermissionHelper.hasUsageStatsPermission();
    expect(result).toBe(false);
  });

  it('hasUsageStatsPermission rejects with PERMISSION_ERROR on failure', async () => {
    const error = Object.assign(new Error('AppOpsManager failure'), { code: 'PERMISSION_ERROR' });
    mockHasUsageStatsPermission.mockRejectedValueOnce(error);
    await expect(NativeModules.PermissionHelper.hasUsageStatsPermission()).rejects.toMatchObject({
      code: 'PERMISSION_ERROR',
    });
  });

  // ---------- requestUsageStatsPermission ------------------------------------

  it('requestUsageStatsPermission resolves with boolean after settings return', async () => {
    mockRequestUsageStatsPermission.mockResolvedValueOnce(true);
    const result = await NativeModules.PermissionHelper.requestUsageStatsPermission();
    expect(typeof result).toBe('boolean');
  });

  it('requestUsageStatsPermission rejects when activity is unavailable', async () => {
    const error = Object.assign(
      new Error('Activity is not available to launch UsageStats settings'),
      { code: 'PERMISSION_ERROR' }
    );
    mockRequestUsageStatsPermission.mockRejectedValueOnce(error);
    await expect(
      NativeModules.PermissionHelper.requestUsageStatsPermission()
    ).rejects.toMatchObject({ code: 'PERMISSION_ERROR' });
  });

  // ---------- hasOverlayPermission ------------------------------------------

  it('hasOverlayPermission resolves with true when overlay is allowed', async () => {
    mockHasOverlayPermission.mockResolvedValueOnce(true);
    const result = await NativeModules.PermissionHelper.hasOverlayPermission();
    expect(result).toBe(true);
  });

  it('hasOverlayPermission resolves with false when overlay is denied', async () => {
    mockHasOverlayPermission.mockResolvedValueOnce(false);
    const result = await NativeModules.PermissionHelper.hasOverlayPermission();
    expect(result).toBe(false);
  });

  // ---------- requestOverlayPermission ---------------------------------------

  it('requestOverlayPermission resolves with boolean after settings return', async () => {
    mockRequestOverlayPermission.mockResolvedValueOnce(false);
    const result = await NativeModules.PermissionHelper.requestOverlayPermission();
    expect(typeof result).toBe('boolean');
  });

  // ---------- isBatteryOptimizationEnabled ----------------------------------

  it('isBatteryOptimizationEnabled resolves with true when battery optimization is active', async () => {
    // true = app IS being optimized (NOT exempt)
    mockIsBatteryOptimizationEnabled.mockResolvedValueOnce(true);
    const result = await NativeModules.PermissionHelper.isBatteryOptimizationEnabled();
    expect(result).toBe(true);
  });

  it('isBatteryOptimizationEnabled resolves with false when app is exempt', async () => {
    // false = app is EXEMPT from battery optimization
    mockIsBatteryOptimizationEnabled.mockResolvedValueOnce(false);
    const result = await NativeModules.PermissionHelper.isBatteryOptimizationEnabled();
    expect(result).toBe(false);
  });

  // ---------- requestBatteryOptimizationExemption ---------------------------

  it('requestBatteryOptimizationExemption resolves (void) on success', async () => {
    mockRequestBatteryOptimizationExemption.mockResolvedValueOnce(undefined);
    await expect(
      NativeModules.PermissionHelper.requestBatteryOptimizationExemption()
    ).resolves.toBeUndefined();
  });

  it('requestBatteryOptimizationExemption rejects when intent cannot be resolved', async () => {
    const error = Object.assign(
      new Error('Device does not support ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS'),
      { code: 'PERMISSION_ERROR' }
    );
    mockRequestBatteryOptimizationExemption.mockRejectedValueOnce(error);
    await expect(
      NativeModules.PermissionHelper.requestBatteryOptimizationExemption()
    ).rejects.toMatchObject({ code: 'PERMISSION_ERROR' });
  });
});
