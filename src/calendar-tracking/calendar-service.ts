import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord, DailyStatus, DayDetail } from './calendar-types';
import * as dailyRecordRepository from '../database/repositories/daily-record-repository';
import * as goalTaskRepository from '../database/repositories/goal-task-repository';
import * as overrideEventRepository from '../database/repositories/override-event-repository';
import * as timeScheduleRepository from '../database/repositories/time-schedule-repository';
import { getOrCreateDailyRecord, updateDailyRecord } from './daily-record-service';
import { getAlignedDate, formatDate } from '../shared/date-utils';
import { useSettingsStore } from '../settings/settings-store';

export async function getDailyRecordsForMonth(
  db: SQLiteDatabase,
  year: number,
  month: number
): Promise<DailyRecord[]> {
  const resetTime =
    useSettingsStore.getState().settings?.dayResetTime ?? '00:00';

  // Compute month boundaries (1-indexed month)
  const firstDay = new Date(year, month - 1, 1, 0, 0, 0);
  const lastDay = new Date(year, month, 0, 23, 59, 59);

  const startDate = getAlignedDate(firstDay, resetTime);
  const endDate = formatDate(lastDay);

  return dailyRecordRepository.getByDateRange(db, startDate, endDate);
}

export async function getDayDetail(
  db: SQLiteDatabase,
  date: string
): Promise<DayDetail> {
  const record = await getOrCreateDailyRecord(db, date);
  const overrideEvents = await overrideEventRepository.getByDate(db, date);
  const goalTasks = await goalTaskRepository.getByDate(db, date);

  // Get active time schedules relevant to the date's day-of-week
  const dateObj = new Date(date + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();
  const allSchedules = await timeScheduleRepository.getActiveSchedules(db);
  const timeSchedules = allSchedules.filter((s) =>
    s.daysOfWeek.includes(dayOfWeek)
  );

  return {
    date,
    record,
    overrideEvents: overrideEvents.map((e) => ({
      appName: e.appName,
      packageName: e.packageName,
      timestamp: e.timestamp,
    })),
    goalTasks,
    timeSchedules,
  };
}

export async function computeCurrentDayStatus(
  db: SQLiteDatabase
): Promise<DailyStatus> {
  const resetTime =
    useSettingsStore.getState().settings?.dayResetTime ?? '00:00';
  const today = getAlignedDate(new Date(), resetTime);
  const record = await updateDailyRecord(db, today);
  return record.status;
}
