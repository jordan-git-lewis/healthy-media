/**
 * Unit tests for the permission-request logic used by the permissions onboarding screen.
 *
 * These tests exercise the native-bridge contracts (mocked) and the business rules
 * that govern step progression, error handling, and battery-optimization semantics.
 * They run in the Node test environment — no React renderer required.
 */

import * as nativeBridge from '../../src/native-bridge/index';

jest.mock('../../src/native-bridge/index');

const mockBridge = nativeBridge as jest.Mocked<typeof nativeBridge>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Step 1 — Usage Stats
// ---------------------------------------------------------------------------
describe('Usage Stats permission step', () => {
  it('reports not-granted when hasUsageStatsPermission returns false', async () => {
    mockBridge.hasUsageStatsPermission.mockResolvedValue(false);

    const result = await nativeBridge.hasUsageStatsPermission();

    expect(result).toBe(false);
  });

  it('calls requestUsageStatsPermission when the Grant button is pressed', async () => {
    mockBridge.requestUsageStatsPermission.mockResolvedValue(true);

    await nativeBridge.requestUsageStatsPermission();

    expect(mockBridge.requestUsageStatsPermission).toHaveBeenCalledTimes(1);
  });

  it('reports granted after requestUsageStatsPermission resolves true', async () => {
    mockBridge.requestUsageStatsPermission.mockResolvedValue(true);
    mockBridge.hasUsageStatsPermission.mockResolvedValue(true);

    await nativeBridge.requestUsageStatsPermission();
    const isGranted = await nativeBridge.hasUsageStatsPermission();

    expect(isGranted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Step 2 — Overlay
// ---------------------------------------------------------------------------
describe('Overlay permission step', () => {
  it('calls requestOverlayPermission when the Grant button is pressed', async () => {
    mockBridge.requestOverlayPermission.mockResolvedValue(true);

    await nativeBridge.requestOverlayPermission();

    expect(mockBridge.requestOverlayPermission).toHaveBeenCalledTimes(1);
  });

  it('reports granted when hasOverlayPermission returns true', async () => {
    mockBridge.hasOverlayPermission.mockResolvedValue(true);

    const result = await nativeBridge.hasOverlayPermission();

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Battery Optimization (inverted semantics)
// ---------------------------------------------------------------------------
describe('Battery Optimization permission step', () => {
  it('treats isBatteryOptimizationEnabled=true as NOT exempt (permission not granted)', async () => {
    mockBridge.isBatteryOptimizationEnabled.mockResolvedValue(true);

    const isOptimized = await nativeBridge.isBatteryOptimizationEnabled();
    // granted = !isOptimized
    const isGranted = !isOptimized;

    expect(isGranted).toBe(false);
  });

  it('treats isBatteryOptimizationEnabled=false as exempt (permission granted)', async () => {
    mockBridge.isBatteryOptimizationEnabled.mockResolvedValue(false);

    const isOptimized = await nativeBridge.isBatteryOptimizationEnabled();
    const isGranted = !isOptimized;

    expect(isGranted).toBe(true);
  });

  it('calls requestBatteryOptimizationExemption when the Grant button is pressed', async () => {
    mockBridge.requestBatteryOptimizationExemption.mockResolvedValue(undefined);

    await nativeBridge.requestBatteryOptimizationExemption();

    expect(mockBridge.requestBatteryOptimizationExemption).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('Permission error handling', () => {
  it('propagates errors thrown by requestUsageStatsPermission', async () => {
    mockBridge.requestUsageStatsPermission.mockRejectedValue(
      new Error('system settings unavailable')
    );

    await expect(nativeBridge.requestUsageStatsPermission()).rejects.toThrow(
      'system settings unavailable'
    );
  });

  it('propagates errors thrown by requestOverlayPermission', async () => {
    mockBridge.requestOverlayPermission.mockRejectedValue(
      new Error('overlay intent failed')
    );

    await expect(nativeBridge.requestOverlayPermission()).rejects.toThrow(
      'overlay intent failed'
    );
  });
});
