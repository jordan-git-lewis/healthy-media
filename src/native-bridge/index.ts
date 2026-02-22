export {
  requestUsageStatsPermission,
  requestOverlayPermission,
  hasUsageStatsPermission,
  hasOverlayPermission,
  isBatteryOptimizationEnabled,
  requestBatteryOptimizationExemption,
  getDeviceManufacturer,
  openOEMPowerSettings,
  scanInstalledApps,
  updateBlockedApps,
} from './native-bridge';
export type { InstalledApp } from './native-bridge';
