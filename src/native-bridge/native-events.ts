/**
 * Typed event listener registration for native → JavaScript events emitted
 * by the Healthy Media monitoring service.
 *
 * Uses React Native's NativeEventEmitter to subscribe to events from Kotlin.
 *
 * Events:
 *   onBlockedAppDetected  — monitoring service detected a blocked app
 *   onOverrideConfirmed   — user confirmed a soft-warning override
 *   onServiceStopped      — monitoring service stopped
 *
 * Each listener registration function returns an unsubscribe handle
 * (an EmitterSubscription) that callers must call `.remove()` on to avoid
 * memory leaks — typically in a React useEffect cleanup.
 */

import { NativeEventEmitter, NativeModules } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import type {
  BlockedAppDetectedPayload,
  OverrideConfirmedPayload,
  ServiceStoppedPayload,
} from './native-bridge-types';

// ---------------------------------------------------------------------------
// Emitter instance — created once using the module that emits the events.
// The monitoring service events are emitted by the native monitoring module;
// we reference BatteryOptimizationHelper as a stable existing module and will
// update this to MonitoringModule once that native module is implemented.
// ---------------------------------------------------------------------------

const emitter = new NativeEventEmitter(NativeModules.BatteryOptimizationHelper);

// ---------------------------------------------------------------------------
// Typed listener registration functions
// ---------------------------------------------------------------------------

/**
 * Registers a listener for the 'onBlockedAppDetected' event.
 *
 * Fired by the monitoring service when it detects that a blocked application
 * has moved to the foreground.
 *
 * @param callback - Receives the blocked app's package name and display name.
 * @returns An EmitterSubscription — call `.remove()` to unsubscribe.
 */
export function onBlockedAppDetected(
  callback: (payload: BlockedAppDetectedPayload) => void
): EmitterSubscription {
  return emitter.addListener('onBlockedAppDetected', callback);
}

/**
 * Registers a listener for the 'onOverrideConfirmed' event.
 *
 * Fired when the user taps "proceed anyway" on the soft-warning overlay,
 * confirming they wish to override the block for this session.
 *
 * @param callback - Receives package name, app name, and ISO-8601 timestamp.
 * @returns An EmitterSubscription — call `.remove()` to unsubscribe.
 */
export function onOverrideConfirmed(
  callback: (payload: OverrideConfirmedPayload) => void
): EmitterSubscription {
  return emitter.addListener('onOverrideConfirmed', callback);
}

/**
 * Registers a listener for the 'onServiceStopped' event.
 *
 * Fired whenever the monitoring service stops, whether due to user action,
 * system memory pressure, or an internal error.
 *
 * @param callback - Receives stop reason and a descriptive message.
 * @returns An EmitterSubscription — call `.remove()` to unsubscribe.
 */
export function onServiceStopped(
  callback: (payload: ServiceStoppedPayload) => void
): EmitterSubscription {
  return emitter.addListener('onServiceStopped', callback);
}
