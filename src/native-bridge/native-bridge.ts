/**
 * Type-safe TypeScript interface wrapping all Healthy Media Kotlin native modules.
 *
 * Centralizes every native call with:
 *   - Correct TypeScript signatures
 *   - Error mapping to NativeBridgeError / PermissionError
 *   - JSDoc for all public functions
 *
 * Native modules accessed:
 *   NativeModules.AppScannerModule       (AppScannerModule.kt)
 *   NativeModules.PermissionHelper       (PermissionHelper.kt)
 *   NativeModules.BatteryOptimizationHelper (BatteryOptimizationHelper.kt)
 *
 * MonitoringService and overlay methods are declared here for the full interface
 * contract; their native Kotlin implementations come in a later parent issue.
 *
 * IMPORTANT: Keep src/native-bridge/monitoring-bridge.ts as-is — other code
 * imports from it. This file (native-bridge.ts) is the canonical new interface.
 */

import { NativeModules } from 'react-native';
import { NativeBridgeError, PermissionError } from '../shared/error-types';
import type {
  InstalledApp,
  MonitoringConfig,
  OverlayConfig,
} from './native-bridge-types';

// ---------------------------------------------------------------------------
// Module references
// ---------------------------------------------------------------------------

const AppScannerModule = NativeModules.AppScannerModule as {
  scanInstalledApps: () => Promise<InstalledApp[]>;
};

const PermissionHelperModule = NativeModules.PermissionHelper as {
  hasUsageStatsPermission: () => Promise<boolean>;
  requestUsageStatsPermission: () => Promise<boolean>;
  hasOverlayPermission: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
  isBatteryOptimizationEnabled: () => Promise<boolean>;
  requestBatteryOptimizationExemption: () => Promise<void>;
};

const BatteryOptimizationHelperModule = NativeModules.BatteryOptimizationHelper as {
  getDeviceManufacturer: () => string;
  openOEMPowerSettings: () => Promise<boolean>;
};

const MonitoringServiceModule = NativeModules.MonitoringServiceModule as {
  startMonitoringService: (packages: string[], intervalMs: number) => Promise<void>;
  stopMonitoringService: () => Promise<void>;
  isMonitoringServiceRunning: () => Promise<boolean>;
  updateBlockedApps: (packages: string[]) => Promise<void>;
};

const OverlayManagerModule = NativeModules.OverlayManagerModule as {
  showBlockingOverlay: (
    appName: string,
    packageName: string,
    taskProgressJson: string | null,
    timeRemainingJson: string | null,
    enforcementLevel: string
  ) => Promise<void>;
  dismissBlockingOverlay: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// App Scanning
// ---------------------------------------------------------------------------

/**
 * Returns all user-installed applications with their package name, display
 * label, and a file:// URI pointing to their cached icon.
 *
 * @throws {NativeBridgeError} if the PackageManager query fails.
 */
export async function scanInstalledApps(): Promise<InstalledApp[]> {
  try {
    return await AppScannerModule.scanInstalledApps();
  } catch (cause) {
    throw new NativeBridgeError('Failed to scan installed apps', { cause });
  }
}

// ---------------------------------------------------------------------------
// Monitoring Service
// ---------------------------------------------------------------------------

/**
 * Starts the foreground monitoring service with the given configuration.
 *
 * Validates permissions before starting — throws PermissionError if
 * UsageStats permission has not been granted.
 *
 * @param config - Blocked packages and polling interval.
 * @throws {PermissionError} if UsageStats permission is not granted.
 * @throws {NativeBridgeError} if the service cannot be started.
 */
export async function startMonitoringService(config: MonitoringConfig): Promise<void> {
  try {
    await MonitoringServiceModule.startMonitoringService(
      config.blockedPackages,
      config.pollingIntervalMs
    );
  } catch (cause) {
    if (cause instanceof PermissionError) throw cause;
    const err = cause as { code?: string; message?: string };
    if (err?.code === 'PERMISSION_ERROR') {
      throw new PermissionError(err.message ?? 'Permission required to start monitoring service', { cause });
    }
    throw new NativeBridgeError('Failed to start monitoring service', { cause });
  }
}

/**
 * Stops the foreground monitoring service.
 *
 * @throws {NativeBridgeError} if the service is not running or cannot be stopped.
 */
export async function stopMonitoringService(): Promise<void> {
  try {
    await MonitoringServiceModule.stopMonitoringService();
  } catch (cause) {
    throw new NativeBridgeError('Failed to stop monitoring service', { cause });
  }
}

/**
 * Returns true if the monitoring service is currently running.
 *
 * @throws {NativeBridgeError} if the service state cannot be queried.
 */
export async function isMonitoringServiceRunning(): Promise<boolean> {
  try {
    return await MonitoringServiceModule.isMonitoringServiceRunning();
  } catch (cause) {
    throw new NativeBridgeError('Failed to query monitoring service state', { cause });
  }
}

/**
 * Updates the list of blocked packages while the service is running.
 *
 * @param packages - Array of package names to block.
 * @throws {NativeBridgeError} if the update fails.
 */
export async function updateBlockedApps(packages: string[]): Promise<void> {
  try {
    await MonitoringServiceModule.updateBlockedApps(packages);
  } catch (cause) {
    throw new NativeBridgeError('Failed to update blocked apps', { cause });
  }
}

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

/**
 * Shows the blocking overlay with the given configuration.
 *
 * @param config - Overlay content and enforcement level.
 * @throws {PermissionError} if SYSTEM_ALERT_WINDOW permission is not granted.
 * @throws {NativeBridgeError} if the overlay cannot be shown.
 */
export async function showBlockingOverlay(config: OverlayConfig): Promise<void> {
  try {
    await OverlayManagerModule.showBlockingOverlay(
      config.appName,
      config.packageName,
      config.taskProgress !== null ? JSON.stringify(config.taskProgress) : null,
      config.timeRemaining !== null ? JSON.stringify(config.timeRemaining) : null,
      config.enforcementLevel
    );
  } catch (cause) {
    if (cause instanceof PermissionError) throw cause;
    const err = cause as { code?: string; message?: string };
    if (err?.code === 'PERMISSION_ERROR') {
      throw new PermissionError(err.message ?? 'Overlay permission required', { cause });
    }
    throw new NativeBridgeError('Failed to show blocking overlay', { cause });
  }
}

/**
 * Dismisses the blocking overlay.
 *
 * @throws {NativeBridgeError} if the overlay cannot be dismissed.
 */
export async function dismissBlockingOverlay(): Promise<void> {
  try {
    await OverlayManagerModule.dismissBlockingOverlay();
  } catch (cause) {
    throw new NativeBridgeError('Failed to dismiss blocking overlay', { cause });
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Checks whether the app has PACKAGE_USAGE_STATS access.
 *
 * @throws {PermissionError} if the check fails.
 */
export async function hasUsageStatsPermission(): Promise<boolean> {
  try {
    return await PermissionHelperModule.hasUsageStatsPermission();
  } catch (cause) {
    throw new PermissionError('Failed to check UsageStats permission', { cause });
  }
}

/**
 * Opens the Usage Access settings screen and resolves with the resulting
 * permission state once the user returns to the app.
 *
 * @throws {PermissionError} if the settings screen cannot be opened.
 */
export async function requestUsageStatsPermission(): Promise<boolean> {
  try {
    return await PermissionHelperModule.requestUsageStatsPermission();
  } catch (cause) {
    throw new PermissionError('Failed to request UsageStats permission', { cause });
  }
}

/**
 * Checks whether the app has SYSTEM_ALERT_WINDOW (overlay) permission.
 *
 * @throws {PermissionError} if the check fails.
 */
export async function hasOverlayPermission(): Promise<boolean> {
  try {
    return await PermissionHelperModule.hasOverlayPermission();
  } catch (cause) {
    throw new PermissionError('Failed to check overlay permission', { cause });
  }
}

/**
 * Opens the Manage Overlay Permission settings screen and resolves with the
 * resulting permission state once the user returns to the app.
 *
 * @throws {PermissionError} if the settings screen cannot be opened.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  try {
    return await PermissionHelperModule.requestOverlayPermission();
  } catch (cause) {
    throw new PermissionError('Failed to request overlay permission', { cause });
  }
}

// ---------------------------------------------------------------------------
// Battery Optimization
// ---------------------------------------------------------------------------

/**
 * Returns true when battery optimization IS active for this app
 * (i.e. the app is NOT on the exemption whitelist).
 *
 * @throws {PermissionError} if the state cannot be queried.
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean> {
  try {
    return await PermissionHelperModule.isBatteryOptimizationEnabled();
  } catch (cause) {
    throw new PermissionError('Failed to check battery optimization state', { cause });
  }
}

/**
 * Opens the system dialog requesting the user to exempt this app from
 * battery optimization.
 *
 * @throws {PermissionError} if the dialog cannot be opened.
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  try {
    return await PermissionHelperModule.requestBatteryOptimizationExemption();
  } catch (cause) {
    throw new PermissionError('Failed to request battery optimization exemption', { cause });
  }
}

/**
 * Returns the device manufacturer string synchronously (e.g. "samsung", "Xiaomi").
 * Sourced from Build.MANUFACTURER via BatteryOptimizationHelper.
 */
export function getDeviceManufacturer(): string {
  return BatteryOptimizationHelperModule.getDeviceManufacturer();
}

/**
 * Attempts to open the OEM-specific battery / auto-start management screen.
 *
 * Returns true if the OEM screen was found and launched, false otherwise.
 * Never throws — callers should fall back to standard Android settings when
 * this returns false.
 */
export async function openOEMPowerSettings(): Promise<boolean> {
  try {
    return await BatteryOptimizationHelperModule.openOEMPowerSettings();
  } catch {
    return false;
  }
}
