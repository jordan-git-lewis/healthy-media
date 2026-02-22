const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.PACKAGE_USAGE_STATS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];

/**
 * Ensures a permission is present without duplicating it. Idempotent.
 */
function addPermissionIfMissing(permissions, permissionName) {
  const exists = permissions.some((p) => p.$['android:name'] === permissionName);
  if (exists) return permissions;
  return [...permissions, { $: { 'android:name': permissionName } }];
}

/**
 * Expo config plugin that injects Android permissions and component declarations
 * required by Healthy Media's screen-time monitoring features.
 *
 * Adds (FR-001, FR-013, FR-014):
 * - android.permission.PACKAGE_USAGE_STATS
 * - android.permission.SYSTEM_ALERT_WINDOW
 * - android.permission.FOREGROUND_SERVICE
 * - android.permission.RECEIVE_BOOT_COMPLETED
 * - android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 * - MonitoringService with android:process=":monitoring"
 * - BootReceiver with BOOT_COMPLETED intent filter
 */
const withHealthyMedia = (config) => {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;

    // Ensure uses-permission array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    // Add all required permissions (idempotently)
    for (const permission of PERMISSIONS) {
      manifest['uses-permission'] = addPermissionIfMissing(
        manifest['uses-permission'],
        permission
      );
    }

    // Ensure application array exists and has at least one entry
    if (!manifest.application || manifest.application.length === 0) {
      manifest.application = [
        { $: { 'android:name': '.MainApplication', 'android:label': '@string/app_name' } },
      ];
    }

    const application = manifest.application[0];

    // Ensure service array exists
    if (!application.service) {
      application.service = [];
    }

    // Add MonitoringService if not already present (idempotent)
    const monitoringServiceName = '.MonitoringService';
    const hasMonitoringService = application.service.some(
      (s) => s.$['android:name'] === monitoringServiceName
    );
    if (!hasMonitoringService) {
      application.service.push({
        $: {
          'android:name': monitoringServiceName,
          'android:process': ':monitoring',
          'android:exported': 'false',
        },
      });
    }

    // Ensure receiver array exists
    if (!application.receiver) {
      application.receiver = [];
    }

    // Add BootReceiver if not already present (idempotent)
    const bootReceiverName = '.BootReceiver';
    const hasBootReceiver = application.receiver.some(
      (r) => r.$['android:name'] === bootReceiverName
    );
    if (!hasBootReceiver) {
      application.receiver.push({
        $: {
          'android:name': bootReceiverName,
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }],
          },
        ],
      });
    }

    return androidConfig;
  });
};

module.exports = withHealthyMedia;
