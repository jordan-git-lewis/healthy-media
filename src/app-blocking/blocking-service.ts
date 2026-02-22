import { getDatabase } from '../database/database';
import * as blockedAppRepository from '../database/repositories/blocked-app-repository';
import { updateBlockedApps } from '../native-bridge';
import type { BlockingState } from './blocking-types';

/**
 * Reads all actively blocked apps from the database and pushes the package
 * name list to the native monitoring service.
 *
 * Apps with enforcement_level === 'off' are excluded.
 */
export async function syncBlockedAppsToNative(): Promise<void> {
  const db = await getDatabase();
  const activeApps = await blockedAppRepository.getActivelyBlocked(db);
  const packageNames = activeApps.map((app) => app.packageName);
  await updateBlockedApps(packageNames);
}

/**
 * Evaluates the current blocking state.
 *
 * This is a stub implementation. Full evaluation (task progress, time
 * remaining, active schedules) will be wired in a later parent issue.
 */
export async function evaluateBlockingState(): Promise<BlockingState> {
  return {
    isBlocking: false,
    reason: null,
    taskProgress: null,
    timeRemaining: null,
  };
}
