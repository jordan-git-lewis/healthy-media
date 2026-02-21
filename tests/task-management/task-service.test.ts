import type { SQLiteDatabase } from 'expo-sqlite';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';
import type { SuccessThreshold } from '../../src/calendar-tracking/calendar-types';
import { ValidationError } from '../../src/shared/error-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/time-schedule-repository');
jest.mock('../../src/database/repositories/success-threshold-repository');

import * as taskService from '../../src/task-management/task-service';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../../src/database/repositories/time-schedule-repository';
import * as successThresholdRepository from '../../src/database/repositories/success-threshold-repository';

const mockTaskRepo = goalTaskRepository as jest.Mocked<typeof goalTaskRepository>;
const mockScheduleRepo = timeScheduleRepository as jest.Mocked<typeof timeScheduleRepository>;
const mockThresholdRepo = successThresholdRepository as jest.Mocked<typeof successThresholdRepository>;

const mockDb = {} as SQLiteDatabase;

const sampleTask = (overrides: Partial<GoalTask> = {}): GoalTask => ({
  id: 'task-1',
  name: 'Read a book',
  date: '2026-02-20',
  isCompleted: false,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const sampleSchedule = (overrides: Partial<TimeSchedule> = {}): TimeSchedule => ({
  id: 'sched-1',
  name: 'Morning Block',
  startTime: '08:00',
  endTime: '12:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('taskService', () => {
  describe('createGoalTask', () => {
    it('creates a task with trimmed name', async () => {
      const created = sampleTask();
      mockTaskRepo.create.mockResolvedValue(created);

      const result = await taskService.createGoalTask(mockDb, '  Read a book  ', '2026-02-20');

      expect(mockTaskRepo.create).toHaveBeenCalledWith(mockDb, {
        name: 'Read a book',
        date: '2026-02-20',
      });
      expect(result).toEqual(created);
    });

    it('throws ValidationError for empty name', async () => {
      await expect(
        taskService.createGoalTask(mockDb, '   ', '2026-02-20')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('completeGoalTask', () => {
    it('marks task as completed with timestamp', async () => {
      const completed = sampleTask({ isCompleted: true, completedAt: '2026-02-20T10:00:00.000Z' });
      mockTaskRepo.update.mockResolvedValue(completed);

      const result = await taskService.completeGoalTask(mockDb, 'task-1');

      expect(mockTaskRepo.update).toHaveBeenCalledWith(mockDb, 'task-1', {
        isCompleted: true,
        completedAt: expect.any(String),
      });
      expect(result.isCompleted).toBe(true);
    });
  });

  describe('uncompleteGoalTask', () => {
    it('marks task as incomplete and clears completedAt', async () => {
      const uncompleted = sampleTask({ isCompleted: false, completedAt: null });
      mockTaskRepo.update.mockResolvedValue(uncompleted);

      const result = await taskService.uncompleteGoalTask(mockDb, 'task-1');

      expect(mockTaskRepo.update).toHaveBeenCalledWith(mockDb, 'task-1', {
        isCompleted: false,
        completedAt: null,
      });
      expect(result.isCompleted).toBe(false);
    });
  });

  describe('deleteGoalTask', () => {
    it('deletes task by id', async () => {
      mockTaskRepo.deleteById.mockResolvedValue(undefined);

      await taskService.deleteGoalTask(mockDb, 'task-1');

      expect(mockTaskRepo.deleteById).toHaveBeenCalledWith(mockDb, 'task-1');
    });
  });

  describe('createTimeSchedule', () => {
    it('creates a schedule when no overlap exists', async () => {
      const created = sampleSchedule();
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([]);
      mockScheduleRepo.create.mockResolvedValue(created);

      const result = await taskService.createTimeSchedule(mockDb, {
        name: 'Morning Block',
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
      });

      expect(result).toEqual(created);
    });

    it('throws ValidationError when start >= end', async () => {
      await expect(
        taskService.createTimeSchedule(mockDb, {
          name: 'Bad Schedule',
          startTime: '14:00',
          endTime: '08:00',
          daysOfWeek: [1],
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when overlap exists on shared days', async () => {
      const existing = sampleSchedule({
        startTime: '10:00',
        endTime: '14:00',
        daysOfWeek: [1, 3],
      });
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([existing]);

      await expect(
        taskService.createTimeSchedule(mockDb, {
          name: 'Overlapping',
          startTime: '12:00',
          endTime: '16:00',
          daysOfWeek: [1, 2],
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('allows schedules on different days with overlapping times', async () => {
      const existing = sampleSchedule({
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [1, 2],
      });
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([existing]);
      mockScheduleRepo.create.mockResolvedValue(
        sampleSchedule({ id: 'sched-2', daysOfWeek: [6, 0] })
      );

      await expect(
        taskService.createTimeSchedule(mockDb, {
          name: 'Weekend Block',
          startTime: '08:00',
          endTime: '12:00',
          daysOfWeek: [6, 0],
          isActive: true,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('evaluateDailySuccess', () => {
    it('returns full_success when all tasks completed', async () => {
      const tasks = [
        sampleTask({ id: 'task-1', isCompleted: true }),
        sampleTask({ id: 'task-2', isCompleted: true }),
      ];
      const threshold: SuccessThreshold = {
        id: 'thresh-1',
        date: '2026-02-20',
        requiredCount: 1,
        totalCount: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      mockTaskRepo.getByDate.mockResolvedValue(tasks);
      mockThresholdRepo.getByDate.mockResolvedValue(threshold);

      const result = await taskService.evaluateDailySuccess(mockDb, '2026-02-20');

      expect(result.status).toBe('full_success');
    });

    it('returns partial_success when completed >= required but not all', async () => {
      const tasks = [
        sampleTask({ id: 'task-1', isCompleted: true }),
        sampleTask({ id: 'task-2', isCompleted: true }),
        sampleTask({ id: 'task-3', isCompleted: false }),
      ];
      const threshold: SuccessThreshold = {
        id: 'thresh-1',
        date: '2026-02-20',
        requiredCount: 2,
        totalCount: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      mockTaskRepo.getByDate.mockResolvedValue(tasks);
      mockThresholdRepo.getByDate.mockResolvedValue(threshold);

      const result = await taskService.evaluateDailySuccess(mockDb, '2026-02-20');

      expect(result.status).toBe('partial_success');
    });

    it('returns not_met when completed < required', async () => {
      const tasks = [
        sampleTask({ id: 'task-1', isCompleted: true }),
        sampleTask({ id: 'task-2', isCompleted: false }),
        sampleTask({ id: 'task-3', isCompleted: false }),
      ];
      const threshold: SuccessThreshold = {
        id: 'thresh-1',
        date: '2026-02-20',
        requiredCount: 2,
        totalCount: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      mockTaskRepo.getByDate.mockResolvedValue(tasks);
      mockThresholdRepo.getByDate.mockResolvedValue(threshold);

      const result = await taskService.evaluateDailySuccess(mockDb, '2026-02-20');

      expect(result.status).toBe('not_met');
    });

    it('returns not_met when no threshold exists', async () => {
      mockTaskRepo.getByDate.mockResolvedValue([sampleTask()]);
      mockThresholdRepo.getByDate.mockResolvedValue(null);

      const result = await taskService.evaluateDailySuccess(mockDb, '2026-02-20');

      expect(result.status).toBe('not_met');
    });
  });
});
