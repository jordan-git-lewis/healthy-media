/**
 * TypeScript stub for the native Android bridge.
 * Real implementations are in native/android/.../BatteryOptimizationHelper.kt
 * and the Expo config plugin wires the NativeModule.
 *
 * In development/test environments these stubs warn and return safe defaults
 * so that JS-only tests can run without a native runtime.
 */

const warn = (method: string) =>
  console.warn(`native-bridge: ${method}() is a stub — native module not yet linked`);

export async function requestUsageStatsPermission(): Promise<boolean> {
  warn('requestUsageStatsPermission');
  return false;
}

export async function requestOverlayPermission(): Promise<boolean> {
  warn('requestOverlayPermission');
  return false;
}

export async function hasUsageStatsPermission(): Promise<boolean> {
  warn('hasUsageStatsPermission');
  return false;
}

export async function hasOverlayPermission(): Promise<boolean> {
  warn('hasOverlayPermission');
  return false;
}

/** Returns true when battery optimization IS enabled (i.e. the app is NOT exempt). */
export async function isBatteryOptimizationEnabled(): Promise<boolean> {
  warn('isBatteryOptimizationEnabled');
  return true;
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  warn('requestBatteryOptimizationExemption');
}

/** Synchronous — reads Build.MANUFACTURER from the Kotlin side. */
export function getDeviceManufacturer(): string {
  warn('getDeviceManufacturer');
  return 'unknown';
}

/**
 * Opens OEM-specific battery / power manager settings screen.
 * Returns false when no OEM-specific intent is found (stock Android).
 */
export async function openOEMPowerSettings(): Promise<boolean> {
  warn('openOEMPowerSettings');
  return false;
}

/** Represents a user-installed application returned by AppScannerModule. */
export interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri: string;
}

/**
 * Returns all user-installed applications visible to PackageManager.
 * Stub: returns an empty array in non-native environments.
 */
export async function scanInstalledApps(): Promise<InstalledApp[]> {
  warn('scanInstalledApps');
  return [];
}

/**
 * Sends the current list of blocked package names to the native monitoring
 * service. Stub: no-op in non-native environments.
 */
export async function updateBlockedApps(packages: string[]): Promise<void> {
  warn('updateBlockedApps');
  void packages;
}
