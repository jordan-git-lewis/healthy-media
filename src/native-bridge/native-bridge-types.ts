/**
 * TypeScript type definitions for all Healthy Media native bridge interfaces.
 *
 * These types are shared between native-bridge.ts (the calling interface)
 * and native-events.ts (the event system).
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Represents a user-installed application returned by AppScannerModule. */
export interface InstalledApp {
  /** Android package name, e.g. "com.instagram.android". */
  packageName: string;
  /** Human-readable display label, e.g. "Instagram". */
  appName: string;
  /** Local file URI pointing to the cached app icon, e.g. "file:///...". */
  iconUri: string;
}

/** Configuration for starting the foreground monitoring service. */
export interface MonitoringConfig {
  /** Array of package names that should be blocked while monitoring is active. */
  blockedPackages: string[];
  /** How often (in milliseconds) the service polls the foreground app. */
  pollingIntervalMs: number;
}

/** Configuration for the blocking overlay shown over a blocked app. */
export interface OverlayConfig {
  /** Display name of the blocked application. */
  appName: string;
  /** Package name of the blocked application. */
  packageName: string;
  /**
   * Current task completion progress, or null if not applicable.
   * threshold is the minimum completed count required to dismiss the overlay.
   */
  taskProgress: {
    completed: number;
    total: number;
    threshold: number;
  } | null;
  /** Time remaining on a session limit, or null if not time-based. */
  timeRemaining: {
    minutes: number;
  } | null;
  /**
   * Enforcement level:
   *   'hard_block'   — user cannot proceed without completing tasks
   *   'soft_warning' — user can override after acknowledging
   */
  enforcementLevel: 'hard_block' | 'soft_warning';
}

// ---------------------------------------------------------------------------
// Event payload types (Kotlin → JavaScript)
// ---------------------------------------------------------------------------

/**
 * Emitted when the monitoring service detects a blocked app in the foreground.
 * Event name: 'onBlockedAppDetected'
 */
export interface BlockedAppDetectedPayload {
  packageName: string;
  appName: string;
}

/**
 * Emitted when the user confirms an override on the soft-warning overlay.
 * Event name: 'onOverrideConfirmed'
 */
export interface OverrideConfirmedPayload {
  packageName: string;
  appName: string;
  /** ISO-8601 timestamp of when the override was confirmed. */
  timestamp: string;
}

/**
 * Emitted when the monitoring service stops for any reason.
 * Event name: 'onServiceStopped'
 */
export interface ServiceStoppedPayload {
  reason: 'user_stopped' | 'system_killed' | 'error';
  message: string;
}
