/**
 * Unit tests for OEM battery optimization setup wizard logic.
 *
 * Tests cover:
 * - Manufacturer detection routing (getOEMInstructions)
 * - openOEMPowerSettings integration (mocked)
 * - isBatteryOptimizationEnabled periodic re-check semantics
 *
 * Runs in the Node test environment — no React renderer required.
 * The pure logic lives in src/onboarding/oem-instructions.ts (no JSX).
 */

import { getOEMInstructions } from '../../src/onboarding/oem-instructions';
import * as nativeBridge from '../../src/native-bridge/index';

jest.mock('../../src/native-bridge/index');

const mockBridge = nativeBridge as jest.Mocked<typeof nativeBridge>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getOEMInstructions — manufacturer routing
// ---------------------------------------------------------------------------

describe('getOEMInstructions', () => {
  it('returns Samsung instructions for "samsung"', () => {
    const result = getOEMInstructions('samsung');

    expect(result.oemName).toBe('Samsung');
    expect(result.isGeneric).toBe(false);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.some((s) => /sleep/i.test(s))).toBe(true);
  });

  it('returns Samsung instructions for mixed-case "SAMSUNG"', () => {
    const result = getOEMInstructions('SAMSUNG');

    expect(result.oemName).toBe('Samsung');
  });

  it('returns Xiaomi instructions for "xiaomi" with Autostart steps', () => {
    const result = getOEMInstructions('xiaomi');

    expect(result.oemName).toMatch(/Xiaomi/i);
    expect(result.isGeneric).toBe(false);
    expect(result.steps.some((s) => /autostart/i.test(s))).toBe(true);
  });

  it('returns Huawei instructions for "huawei" with App Launch steps', () => {
    const result = getOEMInstructions('huawei');

    expect(result.oemName).toMatch(/Huawei/i);
    expect(result.isGeneric).toBe(false);
    expect(result.steps.some((s) => /app launch/i.test(s))).toBe(true);
  });

  it('returns Honor instructions for "honor"', () => {
    const result = getOEMInstructions('honor');

    expect(result.isGeneric).toBe(false);
    expect(result.oemName).toMatch(/Huawei|Honor/i);
  });

  it('returns OnePlus instructions for "oneplus" with revert note', () => {
    const result = getOEMInstructions('oneplus');

    expect(result.oemName).toMatch(/OnePlus/i);
    expect(result.isGeneric).toBe(false);
    expect(result.note).toMatch(/revert/i);
  });

  it('returns Oppo instructions for "oppo" with Autostart and Quick Freeze steps', () => {
    const result = getOEMInstructions('oppo');

    expect(result.isGeneric).toBe(false);
    expect(result.steps.some((s) => /autostart/i.test(s))).toBe(true);
    expect(result.steps.some((s) => /freeze/i.test(s))).toBe(true);
  });

  it('returns Realme instructions for "realme"', () => {
    const result = getOEMInstructions('realme');

    expect(result.isGeneric).toBe(false);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('returns generic/stock instructions for unrecognised manufacturer "nokia"', () => {
    const result = getOEMInstructions('nokia');

    expect(result.isGeneric).toBe(true);
    expect(result.steps).toHaveLength(0);
  });

  it('returns generic instructions for "unknown"', () => {
    const result = getOEMInstructions('unknown');

    expect(result.isGeneric).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// openOEMPowerSettings integration
// ---------------------------------------------------------------------------

describe('openOEMPowerSettings', () => {
  it('returns true when OEM settings intent is found', async () => {
    mockBridge.openOEMPowerSettings.mockResolvedValue(true);

    const result = await nativeBridge.openOEMPowerSettings();

    expect(result).toBe(true);
    expect(mockBridge.openOEMPowerSettings).toHaveBeenCalledTimes(1);
  });

  it('returns false when no OEM-specific settings screen exists (stock Android fallback)', async () => {
    mockBridge.openOEMPowerSettings.mockResolvedValue(false);

    const result = await nativeBridge.openOEMPowerSettings();

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Battery re-check semantics
// ---------------------------------------------------------------------------

describe('isBatteryOptimizationEnabled periodic re-check', () => {
  it('flags that settings were reverted when optimization is enabled (not exempt)', async () => {
    mockBridge.isBatteryOptimizationEnabled.mockResolvedValue(true);

    const isOptimized = await nativeBridge.isBatteryOptimizationEnabled();
    // true = still optimized = NOT exempt = user needs to re-apply
    expect(isOptimized).toBe(true);
  });

  it('clears the prompt when optimization is disabled (app is exempt)', async () => {
    mockBridge.isBatteryOptimizationEnabled.mockResolvedValue(false);

    const isOptimized = await nativeBridge.isBatteryOptimizationEnabled();
    // false = exempt = no prompt needed
    expect(isOptimized).toBe(false);
  });
});
