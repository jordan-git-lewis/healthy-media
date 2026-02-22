/**
 * OEM-specific battery optimisation instruction data.
 * Pure TypeScript — no React dependencies — so this can be imported in tests.
 */

export interface OEMInstructions {
  /** Display name shown in the screen heading */
  oemName: string;
  /** Step-by-step instructions shown as a numbered list */
  steps: string[];
  /** Optional note shown below the steps */
  note?: string;
  /** True for stock Android — hides the "Open Settings" button */
  isGeneric: boolean;
}

/**
 * Returns OEM-specific (or generic) battery optimisation instructions based on
 * the normalised (lowercase) manufacturer string returned by getDeviceManufacturer().
 */
export function getOEMInstructions(manufacturer: string): OEMInstructions {
  const m = manufacturer.toLowerCase();

  if (m === 'samsung') {
    return {
      oemName: 'Samsung',
      steps: [
        'Open the Settings app.',
        'Go to Battery → Background usage limits.',
        'Turn off "Put unused apps to sleep".',
        'Tap "Apps that won\'t be put to sleep" and add Healthy Media.',
      ],
      note: 'Samsung may re-apply these settings after a software update — check back if the app stops working.',
      isGeneric: false,
    };
  }

  if (m === 'xiaomi' || m === 'redmi' || m === 'poco') {
    return {
      oemName: 'Xiaomi / MIUI',
      steps: [
        'Open Security Center.',
        'Tap Autostart and enable Healthy Media.',
        'Go back and tap Manage apps → Healthy Media → Battery saver → No restrictions.',
        'When switching apps, long-press Healthy Media in the recents screen and lock it so MIUI does not close it.',
      ],
      isGeneric: false,
    };
  }

  if (m === 'huawei' || m === 'honor') {
    return {
      oemName: 'Huawei / Honor',
      steps: [
        'Open Settings → Battery.',
        'Tap App Launch.',
        'Find Healthy Media and switch it from "Manage automatically" to manual.',
        'Enable all three toggles: Auto-launch, Secondary launch, and Run in background.',
      ],
      note: "Huawei's \"PowerGenie\" can kill background apps even when battery optimisation is disabled — these extra steps are required.",
      isGeneric: false,
    };
  }

  if (m === 'oneplus') {
    return {
      oemName: 'OnePlus',
      steps: [
        'Open Settings → Battery → Battery Optimization.',
        'Find Healthy Media and select "Don\'t optimize".',
        'Tap Save.',
      ],
      note: 'OnePlus may silently revert this setting after a system update. If blocking stops working, repeat these steps.',
      isGeneric: false,
    };
  }

  if (m === 'oppo' || m === 'realme' || m === 'vivo') {
    const displayName = m.charAt(0).toUpperCase() + m.slice(1);
    return {
      oemName: displayName,
      steps: [
        'Open the phone manager / security app.',
        'Find Autostart Manager and enable Healthy Media.',
        'Locate "App Quick Freeze" or "Freeze" settings and make sure Healthy Media is excluded.',
        'In Battery settings, set Healthy Media to "No restrictions".',
      ],
      isGeneric: false,
    };
  }

  // Stock Android / Pixel / Nokia / unrecognised
  return {
    oemName: 'Standard Android',
    steps: [],
    note: "Great news — your device uses standard Android battery management. The battery optimisation exemption you granted in the previous step is all that's needed. No additional steps are required.",
    isGeneric: true,
  };
}
