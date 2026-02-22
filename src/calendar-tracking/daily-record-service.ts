import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord, DailyStatus } from './calendar-types';
import * as dailyRecordRepository from '../database/repositories/daily-record-repository';
import * as goalTaskRepository from '../database/repositories/goal-task-repository';
import * as successThresholdRepository from '../database/repositories/success-threshold-repository';
import * as overrideEventRepository from '../database/repositories/override-event-repository';
import { getAlignedDate } from '../shared/date-utils';
import { useSettingsStore } from '../settings/settings-store';
import { generateId } from '../shared/uuid-utils';

function computeStatus(
  goalTasksCompleted: number,
  goalTasksTotal: number,
  successThreshold: number,
  overrideCount: number,
  timeScheduleAdherence: number
): DailyStatus {
  // Time-only day (no goal tasks)
  if (goalTasksTotal === 0) {
    if (timeScheduleAdherence === 1 && overrideCount === 0) {
      return 'full_success';
    }
    if (timeScheduleAdherence === 1 && overrideCount > 0) {
      return 'partial_success';
    }
    return 'not_met';
  }

  // Task-based day
  if (goalTasksCompleted >= successThreshold) {
    if (overrideCount === 0) {
      return 'full_success';
    }
    return 'partial_success';
  }
  return 'not_met';
}

export async function getOrCreateDailyRecord(
  db: SQLiteDatabase,
  date: string
): Promise<DailyRecord> {
  const existing = await dailyRecordRepository.getByDate(db, date);
  if (existing) {
    return existing;
  }

  // Create a default record
  return dailyRecordRepository.upsert(db, {
    date,
    goalTasksCompleted: 0,
    goalTasksTotal: 0,
    successThreshold: 0,
    overrideCount: 0,
    timeScheduleAdherence: 1,
    status: 'not_met',
  });
}

export async function updateDailyRecord(
  db: SQLiteDatabase,
  date: string
): Promise<DailyRecord> {
  const resetTime =
    useSettingsStore.getState().settings?.dayResetTime ?? '00:00';

  // Use aligned date for queries
  const alignedDate = getAlignedDate(new Date(date + 'T12:00:00'), resetTime);

  const tasks = await goalTaskRepository.getByDate(db, alignedDate);
  const threshold = await successThresholdRepository.getByDate(db, alignedDate);
  const overrideCount = await overrideEventRepository.getCountByDate(
    db,
    alignedDate
  );

  const goalTasksTotal = tasks.length;
  const goalTasksCompleted = tasks.filter((t) => t.isCompleted).length;
  const successThreshold = threshold?.requiredCount ?? 0;

  // time_schedule_adherence: 1 if no threshold broken, default to 1
  const timeScheduleAdherence = 1;

  const status = computeStatus(
    goalTasksCompleted,
    goalTasksTotal,
    successThreshold,
    overrideCount,
    timeScheduleAdherence
  );

  return dailyRecordRepository.upsert(db, {
    date: alignedDate,
    goalTasksCompleted,
    goalTasksTotal,
    successThreshold,
    overrideCount,
    timeScheduleAdherence,
    status,
  });
}

export { computeStatus };
