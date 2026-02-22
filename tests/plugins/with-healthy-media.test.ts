/**
 * Unit tests for the withHealthyMedia Expo config plugin.
 *
 * Tests the plugin modifier by constructing a minimal AndroidManifest structure
 * (matching @expo/config-plugins' AndroidManifest type where data lives under
 * modResults.manifest), running the modifier directly, and asserting on the result.
 *
 * The @expo/config-plugins module is mocked so that withAndroidManifest captures
 * the modifier for synchronous invocation in tests.
 */

// ---- Types matching @expo/config-plugins' AndroidManifest shape --------------

interface UsesPermission {
  $: { 'android:name': string };
}

interface IntentFilter {
  action?: Array<{ $: { 'android:name': string } }>;
}

interface ServiceEntry {
  $: Record<string, string>;
}

interface ReceiverEntry {
  $: Record<string, string>;
  'intent-filter'?: IntentFilter[];
}

interface ApplicationEntry {
  $: Record<string, string>;
  service?: ServiceEntry[];
  receiver?: ReceiverEntry[];
}

interface ManifestInner {
  $: Record<string, string>;
  'uses-permission'?: UsesPermission[];
  application?: ApplicationEntry[];
}

interface AndroidManifestWrapper {
  manifest: ManifestInner;
}

interface ModResults {
  modResults: AndroidManifestWrapper;
}

// ---- Mock @expo/config-plugins -----------------------------------------------
// Captures the modifier passed to withAndroidManifest for synchronous test invocation.

const capturedState = { modifier: null as unknown };

jest.mock('@expo/config-plugins', () => ({
  withAndroidManifest: (_config: unknown, modifier: unknown) => {
    capturedState.modifier = modifier;
    return { __pluginApplied: true };
  },
}));

// Import plugin AFTER mock is set up
import withHealthyMedia from '../../plugins/with-healthy-media';

// ---- Helpers -----------------------------------------------------------------

function makeMinimalModResults(overrides: Partial<ManifestInner> = {}): ModResults {
  return {
    modResults: {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        'uses-permission': [],
        application: [
          {
            $: { 'android:name': '.MainApplication', 'android:label': '@string/app_name' },
            service: [],
            receiver: [],
          },
        ],
        ...overrides,
      },
    },
  };
}

function runPlugin(modResults: ModResults): ModResults {
  capturedState.modifier = null;
  withHealthyMedia({} as Parameters<typeof withHealthyMedia>[0]);
  const mod = capturedState.modifier as (c: ModResults) => ModResults;
  if (!mod) throw new Error('Plugin did not call withAndroidManifest');
  return mod(modResults);
}

// ---- Tests -------------------------------------------------------------------

describe('withHealthyMedia config plugin', () => {
  const REQUIRED_PERMISSIONS = [
    'android.permission.PACKAGE_USAGE_STATS',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  ];

  it('adds all 5 required permissions to an empty manifest', () => {
    const result = runPlugin(makeMinimalModResults());
    const permissionNames = (result.modResults.manifest['uses-permission'] ?? []).map(
      (p) => p.$['android:name']
    );
    for (const perm of REQUIRED_PERMISSIONS) {
      expect(permissionNames).toContain(perm);
    }
  });

  it('does not duplicate permissions when run a second time (idempotent)', () => {
    const first = runPlugin(makeMinimalModResults());
    const second = runPlugin(first);
    const permissionNames = (second.modResults.manifest['uses-permission'] ?? []).map(
      (p) => p.$['android:name']
    );
    for (const perm of REQUIRED_PERMISSIONS) {
      const count = permissionNames.filter((n) => n === perm).length;
      expect(count).toBe(1);
    }
  });

  it('declares MonitoringService with :monitoring process', () => {
    const result = runPlugin(makeMinimalModResults());
    const services = result.modResults.manifest.application![0].service ?? [];
    const monService = services.find((s) => s.$['android:name'] === '.MonitoringService');
    expect(monService).toBeDefined();
    expect(monService!.$['android:process']).toBe(':monitoring');
    expect(monService!.$['android:exported']).toBe('false');
  });

  it('does not duplicate MonitoringService on repeated runs', () => {
    const first = runPlugin(makeMinimalModResults());
    const second = runPlugin(first);
    const services = second.modResults.manifest.application![0].service ?? [];
    const count = services.filter((s) => s.$['android:name'] === '.MonitoringService').length;
    expect(count).toBe(1);
  });

  it('declares BootReceiver with BOOT_COMPLETED intent filter', () => {
    const result = runPlugin(makeMinimalModResults());
    const receivers = result.modResults.manifest.application![0].receiver ?? [];
    const bootReceiver = receivers.find((r) => r.$['android:name'] === '.BootReceiver');
    expect(bootReceiver).toBeDefined();
    expect(bootReceiver!.$['android:exported']).toBe('false');
    const actions = bootReceiver!['intent-filter']?.[0]?.action ?? [];
    const bootAction = actions.find(
      (a) => a.$['android:name'] === 'android.intent.action.BOOT_COMPLETED'
    );
    expect(bootAction).toBeDefined();
  });

  it('does not duplicate BootReceiver on repeated runs', () => {
    const first = runPlugin(makeMinimalModResults());
    const second = runPlugin(first);
    const receivers = second.modResults.manifest.application![0].receiver ?? [];
    const count = receivers.filter((r) => r.$['android:name'] === '.BootReceiver').length;
    expect(count).toBe(1);
  });

  it('creates uses-permission array if it does not exist', () => {
    const modResults = makeMinimalModResults();
    delete modResults.modResults.manifest['uses-permission'];
    const result = runPlugin(modResults);
    expect(result.modResults.manifest['uses-permission']).toBeDefined();
    expect(Array.isArray(result.modResults.manifest['uses-permission'])).toBe(true);
  });

  it('creates application array if it does not exist', () => {
    const modResults = makeMinimalModResults();
    delete modResults.modResults.manifest.application;
    const result = runPlugin(modResults);
    expect(result.modResults.manifest.application).toBeDefined();
    expect(result.modResults.manifest.application!.length).toBeGreaterThan(0);
  });
});
