/**
 * Public API for the Healthy Media native bridge.
 *
 * Re-exports all types, bridge functions, and event listeners so consumers
 * can import from a single path:
 *
 *   import { scanInstalledApps, hasUsageStatsPermission } from '../native-bridge';
 *   import type { InstalledApp, MonitoringConfig } from '../native-bridge';
 *
 * Note: src/native-bridge/monitoring-bridge.ts is kept as-is; existing code
 * continues to import from it. New code should use this index.ts entry point.
 */

// Types
export type {
  InstalledApp,
  MonitoringConfig,
  OverlayConfig,
  BlockedAppDetectedPayload,
  OverrideConfirmedPayload,
  ServiceStoppedPayload,
} from './native-bridge-types';

// Bridge functions
export {
  // App scanning
  scanInstalledApps,
  // Monitoring service
  startMonitoringService,
  stopMonitoringService,
  isMonitoringServiceRunning,
  updateBlockedApps,
  // Overlay
  showBlockingOverlay,
  dismissBlockingOverlay,
  // Permissions
  hasUsageStatsPermission,
  requestUsageStatsPermission,
  hasOverlayPermission,
  requestOverlayPermission,
  // Battery optimization
  isBatteryOptimizationEnabled,
  requestBatteryOptimizationExemption,
  getDeviceManufacturer,
  openOEMPowerSettings,
} from './native-bridge';

// Event listeners
export { onBlockedAppDetected, onOverrideConfirmed, onServiceStopped } from './native-events';
