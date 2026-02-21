import type { SQLiteDatabase } from 'expo-sqlite';
import type { GoalTask, TimeSchedule } from './task-types';
import type { DailyStatus, SuccessThreshold } from '../calendar-tracking/calendar-types';
import * as goalTaskRepository from '../database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../database/repositories/time-schedule-repository';
import * as successThresholdRepository from '../database/repositories/success-threshold-repository';
import { ValidationError } from '../shared/error-types';

export async function createGoalTask(
  db: SQLiteDatabase,
  name: string,
  date: string
): Promise<GoalTask> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ValidationError('Task name cannot be empty');
  }
  return goalTaskRepository.create(db, { name: trimmed, date });
}

export async function completeGoalTask(
  db: SQLiteDatabase,
  taskId: string
): Promise<GoalTask> {
  return goalTaskRepository.update(db, taskId, {
    isCompleted: true,
    completedAt: new Date().toISOString(),
  });
}

export async function uncompleteGoalTask(
  db: SQLiteDatabase,
  taskId: string
): Promise<GoalTask> {
  return goalTaskRepository.update(db, taskId, {
    isCompleted: false,
    completedAt: null,
  });
}

export async function deleteGoalTask(
  db: SQLiteDatabase,
  taskId: string
): Promise<void> {
  return goalTaskRepository.deleteById(db, taskId);
}

export async function createTimeSchedule(
  db: SQLiteDatabase,
  schedule: Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TimeSchedule> {
  validateScheduleTimes(schedule.startTime, schedule.endTime);
  const existing = await timeScheduleRepository.getActiveSchedules(db);
  checkOverlap(existing, schedule.startTime, schedule.endTime, schedule.daysOfWeek);
  return timeScheduleRepository.create(db, schedule);
}

export async function updateTimeSchedule(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TimeSchedule> {
  const current = await timeScheduleRepository.getById(db, id);
  if (!current) {
    throw new ValidationError('Schedule not found');
  }

  const startTime = updates.startTime ?? current.startTime;
  const endTime = updates.endTime ?? current.endTime;
  const daysOfWeek = updates.daysOfWeek ?? current.daysOfWeek;

  validateScheduleTimes(startTime, endTime);

  const existing = await timeScheduleRepository.getActiveSchedules(db);
  const others = existing.filter((s) => s.id !== id);
  checkOverlap(others, startTime, endTime, daysOfWeek);

  return timeScheduleRepository.update(db, id, updates);
}

export async function deleteTimeSchedule(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  return timeScheduleRepository.deleteById(db, id);
}

export async function evaluateDailySuccess(
  db: SQLiteDatabase,
  date: string
): Promise<{ status: DailyStatus; threshold: SuccessThreshold | null }> {
  const tasks = await goalTaskRepository.getByDate(db, date);
  const threshold = await successThresholdRepository.getByDate(db, date);

  if (tasks.length === 0 || !threshold) {
    return { status: 'not_met', threshold };
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length;

  if (completedCount >= tasks.length) {
    return { status: 'full_success', threshold };
  }
  if (completedCount >= threshold.requiredCount) {
    return { status: 'partial_success', threshold };
  }
  return { status: 'not_met', threshold };
}

function validateScheduleTimes(startTime: string, endTime: string): void {
  if (startTime >= endTime) {
    throw new ValidationError('Start time must be before end time');
  }
}

function checkOverlap(
  existing: TimeSchedule[],
  startTime: string,
  endTime: string,
  daysOfWeek: number[]
): void {
  for (const schedule of existing) {
    const sharedDays = schedule.daysOfWeek.some((d) => daysOfWeek.includes(d));
    if (!sharedDays) continue;

    const timesOverlap =
      startTime < schedule.endTime && endTime > schedule.startTime;
    if (timesOverlap) {
      throw new ValidationError(
        `Schedule overlaps with "${schedule.name}" on shared days`
      );
    }
  }
}
