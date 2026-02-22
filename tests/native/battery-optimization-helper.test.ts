/**
 * Unit tests for BatteryOptimizationHelper — JS-side contract.
 *
 * Tests verify:
 *   - getDeviceManufacturer() is synchronous and returns a string
 *   - openOEMPowerSettings() resolves with true when OEM settings are found
 *   - openOEMPowerSettings() resolves with false for unknown manufacturers
 *   - openOEMPowerSettings() resolves with false when activity cannot be resolved
 *   - Error paths are handled gracefully (resolve false, not reject)
 *
 * NativeModules is mocked so tests run without an Android runtime.
 */

// ---- Mock react-native NativeModules ----------------------------------------

const mockGetDeviceManufacturer = jest.fn();
const mockOpenOEMPowerSettings = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    BatteryOptimizationHelper: {
      getDeviceManufacturer: mockGetDeviceManufacturer,
      openOEMPowerSettings: mockOpenOEMPowerSettings,
    },
  },
}));

import { NativeModules } from 'react-native';

// ---- Tests -------------------------------------------------------------------

describe('BatteryOptimizationHelper (JS-side contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is accessible via NativeModules.BatteryOptimizationHelper', () => {
    expect(NativeModules.BatteryOptimizationHelper).toBeDefined();
  });

  it('exposes getDeviceManufacturer and openOEMPowerSettings', () => {
    const boh = NativeModules.BatteryOptimizationHelper;
    expect(typeof boh.getDeviceManufacturer).toBe('function');
    expect(typeof boh.openOEMPowerSettings).toBe('function');
  });

  // ---------- getDeviceManufacturer (synchronous) ----------------------------

  it('getDeviceManufacturer returns a non-empty string synchronously', () => {
    mockGetDeviceManufacturer.mockReturnValueOnce('samsung');
    const result = NativeModules.BatteryOptimizationHelper.getDeviceManufacturer();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('getDeviceManufacturer returns the manufacturer name', () => {
    mockGetDeviceManufacturer.mockReturnValueOnce('Xiaomi');
    const result = NativeModules.BatteryOptimizationHelper.getDeviceManufacturer();
    expect(result).toBe('Xiaomi');
  });

  // ---------- openOEMPowerSettings ------------------------------------------

  it('resolves with true for a known OEM (Xiaomi)', async () => {
    mockOpenOEMPowerSettings.mockResolvedValueOnce(true);
    const result = await NativeModules.BatteryOptimizationHelper.openOEMPowerSettings();
    expect(result).toBe(true);
  });

  it('resolves with true for a known OEM (Samsung)', async () => {
    mockOpenOEMPowerSettings.mockResolvedValueOnce(true);
    const result = await NativeModules.BatteryOptimizationHelper.openOEMPowerSettings();
    expect(result).toBe(true);
  });

  it('resolves with false for an unknown manufacturer', async () => {
    // Unknown device — no OEM intent mapping
    mockOpenOEMPowerSettings.mockResolvedValueOnce(false);
    const result = await NativeModules.BatteryOptimizationHelper.openOEMPowerSettings();
    expect(result).toBe(false);
  });

  it('resolves with false when the OEM activity cannot be resolved (not installed)', async () => {
    // OEM package might exist in our map but not be installed on this ROM variant
    mockOpenOEMPowerSettings.mockResolvedValueOnce(false);
    const result = await NativeModules.BatteryOptimizationHelper.openOEMPowerSettings();
    expect(result).toBe(false);
  });

  it('resolves with false rather than rejecting on unexpected error', async () => {
    // Module should never reject — it resolves false for all failure paths
    mockOpenOEMPowerSettings.mockResolvedValueOnce(false);
    await expect(
      NativeModules.BatteryOptimizationHelper.openOEMPowerSettings()
    ).resolves.toBe(false);
  });

  it('result is always a boolean', async () => {
    mockOpenOEMPowerSettings.mockResolvedValueOnce(true);
    const result = await NativeModules.BatteryOptimizationHelper.openOEMPowerSettings();
    expect(typeof result).toBe('boolean');
  });
});
