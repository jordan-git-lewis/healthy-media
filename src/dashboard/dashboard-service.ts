import type { SQLiteDatabase } from 'expo-sqlite';
import type { TimeSchedule } from '../task-management/task-types';
import type { DashboardData } from './dashboard-types';
import * as userSettingsRepository from '../database/repositories/user-settings-repository';
import * as goalTaskRepository from '../database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../database/repositories/time-schedule-repository';
import { getAlignedDate } from '../shared/date-utils';

function getCurrentTime(now: Date): string {
  return (
    now.getHours().toString().padStart(2, '0') +
    ':' +
    now.getMinutes().toString().padStart(2, '0')
  );
}

function findCurrentSchedule(
  schedules: TimeSchedule[],
  dayOfWeek: number,
  currentTime: string
): TimeSchedule | null {
  return (
    schedules.find(
      (s) =>
        s.daysOfWeek.includes(dayOfWeek) &&
        currentTime >= s.startTime &&
        currentTime < s.endTime
    ) ?? null
  );
}

function findNextSchedule(
  schedules: TimeSchedule[],
  dayOfWeek: number,
  currentTime: string
): TimeSchedule | null {
  const upcoming = schedules
    .filter(
      (s) => s.daysOfWeek.includes(dayOfWeek) && s.startTime > currentTime
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcoming[0] ?? null;
}

export async function loadDashboard(
  db: SQLiteDatabase,
  now: Date = new Date()
): Promise<DashboardData> {
  const settings = await userSettingsRepository.get(db);
  const todayDate = getAlignedDate(now, settings.dayResetTime);

  const tasks = await goalTaskRepository.getByDate(db, todayDate);
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;

  const activeSchedules = await timeScheduleRepository.getActiveSchedules(db);
  const dayOfWeek = now.getDay();
  const currentTime = getCurrentTime(now);

  const currentSchedule = findCurrentSchedule(
    activeSchedules,
    dayOfWeek,
    currentTime
  );
  const nextSchedule = findNextSchedule(
    activeSchedules,
    dayOfWeek,
    currentTime
  );
  const isInScheduleWindow = currentSchedule !== null;
  const isActivelyBlocking =
    isInScheduleWindow && settings.globalBlockingEnabled;

  return {
    todayDate,
    tasks,
    completedCount,
    totalCount,
    activeSchedules,
    currentSchedule,
    nextSchedule,
    isInScheduleWindow,
    isActivelyBlocking,
    globalBlockingEnabled: settings.globalBlockingEnabled,
  };
}
