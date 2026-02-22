import { getDatabase } from '../database/database';
import * as blockedAppRepository from '../database/repositories/blocked-app-repository';
import * as overrideEventRepository from '../database/repositories/override-event-repository';
import * as dailyRecordService from '../calendar-tracking/daily-record-service';
import {
  updateBlockedApps,
  showBlockingOverlay,
} from '../native-bridge';
import { useTaskStore } from '../task-management/task-store';
import { useBlockingStore } from './blocking-store';
import { useSettingsStore } from '../settings/settings-store';
import { useCalendarStore } from '../calendar-tracking/calendar-store';
import { getAlignedDate } from '../shared/date-utils';
import type { BlockingState } from './blocking-types';
import type { OverlayConfig } from '../native-bridge/native-bridge-types';

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates the current blocking state by reading from in-memory Zustand stores.
 *
 * Checks:
 *  1. globalBlockingEnabled — returns { isBlocking: false } immediately if off
 *  2. Active time schedules — if current time falls within a schedule, isBlocking = true
 *     with reason 'time_schedule' and timeRemaining computed to schedule end
 *  3. Goal tasks vs. success threshold — if completedCount < threshold, isBlocking = true
 *     with reason 'incomplete_tasks' and taskProgress populated
 */
export async function evaluateBlockingState(): Promise<BlockingState> {
  // Respect global blocking toggle
  const globalEnabled = useSettingsStore.getState().settings?.globalBlockingEnabled;
  if (globalEnabled === false) {
    return { isBlocking: false, reason: null, taskProgress: null, timeRemaining: null };
  }

  const { timeSchedules, goalTasks, successThreshold } = useTaskStore.getState();

  const now = new Date();
  const dayResetTime = useSettingsStore.getState().settings?.dayResetTime ?? '00:00';
  const _today = getAlignedDate(now, dayResetTime); // used for context

  // --- Time schedule check ---
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDayOfWeek = now.getDay(); // 0=Sunday
  const currentTimeStr =
    currentHour.toString().padStart(2, '0') +
    ':' +
    currentMinute.toString().padStart(2, '0');

  for (const schedule of timeSchedules) {
    if (!schedule.isActive) continue;
    if (!schedule.daysOfWeek.includes(currentDayOfWeek)) continue;

    if (currentTimeStr >= schedule.startTime && currentTimeStr < schedule.endTime) {
      // We are within this schedule — compute minutes remaining
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const endTotalMin = endH * 60 + endM;
      const currentTotalMin = currentHour * 60 + currentMinute;
      const minutesRemaining = Math.max(0, endTotalMin - currentTotalMin);

      return {
        isBlocking: true,
        reason: 'time_schedule',
        taskProgress: null,
        timeRemaining: { minutes: minutesRemaining },
      };
    }
  }

  // --- Task completion check ---
  const threshold = successThreshold?.requiredCount ?? 0;
  if (threshold > 0) {
    const total = goalTasks.length;
    const completed = goalTasks.filter((t) => t.isCompleted).length;
    if (completed < threshold) {
      return {
        isBlocking: true,
        reason: 'incomplete_tasks',
        taskProgress: { completed, total, threshold },
        timeRemaining: null,
      };
    }
  }

  return { isBlocking: false, reason: null, taskProgress: null, timeRemaining: null };
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

/**
 * Called when the native monitoring service detects a blocked app in the
 * foreground. Looks up the enforcement level, evaluates blocking state, and
 * shows the overlay if appropriate.
 */
export async function handleBlockedAppDetected(
  packageName: string,
  appName: string
): Promise<void> {
  const { blockedApps } = useBlockingStore.getState();
  const blockedApp = blockedApps.find((a) => a.packageName === packageName);

  // If the app is not in the blocked list or enforcement is off, do nothing.
  if (!blockedApp || blockedApp.enforcementLevel === 'off') {
    return;
  }

  const blockingState = await evaluateBlockingState();
  if (!blockingState.isBlocking) {
    return;
  }

  const config: OverlayConfig = {
    appName,
    packageName,
    taskProgress: blockingState.taskProgress,
    timeRemaining: blockingState.timeRemaining,
    enforcementLevel: blockedApp.enforcementLevel,
  };

  await showBlockingOverlay(config);
}

/**
 * Called when the user confirms an override on the blocking overlay.
 * Persists the override event, updates the DailyRecord override_count,
 * and triggers a calendar store refresh so the UI reactively updates.
 */
export async function handleOverrideConfirmed(
  packageName: string,
  appName: string,
  timestamp: string
): Promise<void> {
  const dayResetTime = useSettingsStore.getState().settings?.dayResetTime ?? '00:00';
  const alignedDate = getAlignedDate(new Date(timestamp), dayResetTime);

  const { goalTasks } = useTaskStore.getState();
  const taskContext = JSON.stringify(
    goalTasks.map((t) => ({ name: t.name, completed: t.isCompleted }))
  );

  const db = await getDatabase();

  // Persist the override event
  await overrideEventRepository.create(db, {
    packageName,
    appName,
    timestamp,
    date: alignedDate,
    activeScheduleId: null,
    taskContext,
  });

  // Recalculate DailyRecord (override_count, status) for the aligned date
  await dailyRecordService.updateDailyRecord(db, alignedDate);

  // Refresh calendar store so UI updates reactively
  await useCalendarStore.getState().refreshToday();
}
