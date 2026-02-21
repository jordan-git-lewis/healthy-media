import { create } from 'zustand';
import type { GoalTask, TimeSchedule } from './task-types';
import type { SuccessThreshold } from '../calendar-tracking/calendar-types';
import * as taskService from './task-service';
import * as goalTaskRepository from '../database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../database/repositories/time-schedule-repository';
import * as successThresholdRepository from '../database/repositories/success-threshold-repository';
import * as userSettingsRepository from '../database/repositories/user-settings-repository';
import { getDatabase } from '../database/database';
import { getAlignedDate } from '../shared/date-utils';

interface TaskState {
  goalTasks: GoalTask[];
  timeSchedules: TimeSchedule[];
  successThreshold: SuccessThreshold | null;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addGoalTask: (name: string) => Promise<void>;
  toggleGoalTaskCompletion: (taskId: string) => Promise<void>;
  removeGoalTask: (taskId: string) => Promise<void>;
  addTimeSchedule: (
    schedule: Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateTimeSchedule: (
    id: string,
    updates: Partial<Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  removeTimeSchedule: (id: string) => Promise<void>;
  updateSuccessThreshold: (
    requiredCount: number,
    totalCount: number
  ) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  goalTasks: [],
  timeSchedules: [],
  successThreshold: null,
  isLoading: false,
  error: null,

  async hydrate() {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const settings = await userSettingsRepository.get(db);
      const todayDate = getAlignedDate(new Date(), settings.dayResetTime);

      const goalTasks = await goalTaskRepository.getByDate(db, todayDate);
      const timeSchedules = await timeScheduleRepository.getActiveSchedules(db);
      const successThreshold = await successThresholdRepository.getByDate(
        db,
        todayDate
      );

      set({ goalTasks, timeSchedules, successThreshold, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to load tasks',
      });
    }
  },

  async addGoalTask(name: string) {
    set({ error: null });
    try {
      const db = await getDatabase();
      const settings = await userSettingsRepository.get(db);
      const todayDate = getAlignedDate(new Date(), settings.dayResetTime);
      const task = await taskService.createGoalTask(db, name, todayDate);
      set({ goalTasks: [...get().goalTasks, task] });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to add task',
      });
    }
  },

  async toggleGoalTaskCompletion(taskId: string) {
    const previous = get().goalTasks;
    const task = previous.find((t) => t.id === taskId);
    if (!task) return;

    const optimistic = previous.map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    set({ goalTasks: optimistic, error: null });

    try {
      const db = await getDatabase();
      if (task.isCompleted) {
        await taskService.uncompleteGoalTask(db, taskId);
      } else {
        await taskService.completeGoalTask(db, taskId);
      }
    } catch (error) {
      set({
        goalTasks: previous,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update task',
      });
    }
  },

  async removeGoalTask(taskId: string) {
    const previous = get().goalTasks;
    set({
      goalTasks: previous.filter((t) => t.id !== taskId),
      error: null,
    });

    try {
      const db = await getDatabase();
      await taskService.deleteGoalTask(db, taskId);
    } catch (error) {
      set({
        goalTasks: previous,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete task',
      });
    }
  },

  async addTimeSchedule(
    schedule: Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    set({ error: null });
    try {
      const db = await getDatabase();
      const created = await taskService.createTimeSchedule(db, schedule);
      set({ timeSchedules: [...get().timeSchedules, created] });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add schedule',
      });
    }
  },

  async updateTimeSchedule(
    id: string,
    updates: Partial<Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    const previous = get().timeSchedules;
    set({ error: null });

    try {
      const db = await getDatabase();
      const updated = await taskService.updateTimeSchedule(db, id, updates);
      set({
        timeSchedules: previous.map((s) => (s.id === id ? updated : s)),
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update schedule',
      });
    }
  },

  async removeTimeSchedule(id: string) {
    const previous = get().timeSchedules;
    set({
      timeSchedules: previous.filter((s) => s.id !== id),
      error: null,
    });

    try {
      const db = await getDatabase();
      await taskService.deleteTimeSchedule(db, id);
    } catch (error) {
      set({
        timeSchedules: previous,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete schedule',
      });
    }
  },

  async updateSuccessThreshold(requiredCount: number, totalCount: number) {
    const previous = get().successThreshold;
    set({ error: null });

    try {
      const db = await getDatabase();
      const settings = await userSettingsRepository.get(db);
      const todayDate = getAlignedDate(new Date(), settings.dayResetTime);
      const threshold = await successThresholdRepository.upsert(db, {
        date: todayDate,
        requiredCount,
        totalCount,
      });
      set({ successThreshold: threshold });
    } catch (error) {
      set({
        successThreshold: previous,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update threshold',
      });
    }
  },
}));
