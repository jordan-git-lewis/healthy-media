import type { SQLiteDatabase } from 'expo-sqlite';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';
import type { SuccessThreshold } from '../../src/calendar-tracking/calendar-types';
import type { UserSettings } from '../../src/settings/settings-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/time-schedule-repository');
jest.mock('../../src/database/repositories/success-threshold-repository');
jest.mock('../../src/database/repositories/user-settings-repository');
jest.mock('../../src/task-management/task-service');

import { useTaskStore } from '../../src/task-management/task-store';
import { getDatabase } from '../../src/database/database';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../../src/database/repositories/time-schedule-repository';
import * as successThresholdRepository from '../../src/database/repositories/success-threshold-repository';
import * as userSettingsRepository from '../../src/database/repositories/user-settings-repository';
import * as taskService from '../../src/task-management/task-service';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockTaskRepo = goalTaskRepository as jest.Mocked<typeof goalTaskRepository>;
const mockScheduleRepo = timeScheduleRepository as jest.Mocked<typeof timeScheduleRepository>;
const mockThresholdRepo = successThresholdRepository as jest.Mocked<typeof successThresholdRepository>;
const mockSettingsRepo = userSettingsRepository as jest.Mocked<typeof userSettingsRepository>;
const mockTaskService = taskService as jest.Mocked<typeof taskService>;

const mockDb = {} as SQLiteDatabase;

const sampleSettings: UserSettings = {
  id: '1',
  dayResetTime: '04:00',
  onboardingSurveyResponse: null,
  onboardingCompleted: true,
  globalBlockingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

const sampleThreshold: SuccessThreshold = {
  id: 'thresh-1',
  date: '2026-02-20',
  requiredCount: 2,
  totalCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockResolvedValue(mockDb);
  mockSettingsRepo.get.mockResolvedValue(sampleSettings);
  // Reset store state between tests
  useTaskStore.setState({
    goalTasks: [],
    timeSchedules: [],
    successThreshold: null,
    isLoading: false,
    error: null,
  });
});

describe('useTaskStore', () => {
  describe('hydrate', () => {
    it('loads tasks, schedules, and threshold into state', async () => {
      const tasks = [sampleTask()];
      const schedules = [sampleSchedule()];
      mockTaskRepo.getByDate.mockResolvedValue(tasks);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue(schedules);
      mockThresholdRepo.getByDate.mockResolvedValue(sampleThreshold);

      await useTaskStore.getState().hydrate();

      const state = useTaskStore.getState();
      expect(state.goalTasks).toEqual(tasks);
      expect(state.timeSchedules).toEqual(schedules);
      expect(state.successThreshold).toEqual(sampleThreshold);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSettingsRepo.get.mockRejectedValue(new Error('DB failed'));

      await useTaskStore.getState().hydrate();

      expect(useTaskStore.getState().error).toBe('DB failed');
      expect(useTaskStore.getState().isLoading).toBe(false);
    });
  });

  describe('addGoalTask', () => {
    it('adds new task to store', async () => {
      const newTask = sampleTask({ id: 'task-new', name: 'New task' });
      mockTaskService.createGoalTask.mockResolvedValue(newTask);

      await useTaskStore.getState().addGoalTask('New task');

      expect(useTaskStore.getState().goalTasks).toContainEqual(newTask);
    });

    it('sets error on failure without modifying tasks', async () => {
      mockTaskService.createGoalTask.mockRejectedValue(
        new Error('Task name cannot be empty')
      );

      await useTaskStore.getState().addGoalTask('');

      expect(useTaskStore.getState().goalTasks).toEqual([]);
      expect(useTaskStore.getState().error).toBe('Task name cannot be empty');
    });
  });

  describe('toggleGoalTaskCompletion', () => {
    it('optimistically flips completion and persists', async () => {
      const task = sampleTask({ isCompleted: false });
      useTaskStore.setState({ goalTasks: [task] });
      mockTaskService.completeGoalTask.mockResolvedValue(
        sampleTask({ isCompleted: true })
      );

      await useTaskStore.getState().toggleGoalTaskCompletion('task-1');

      expect(useTaskStore.getState().goalTasks[0].isCompleted).toBe(true);
      expect(mockTaskService.completeGoalTask).toHaveBeenCalledWith(mockDb, 'task-1');
    });

    it('rolls back on failure', async () => {
      const task = sampleTask({ isCompleted: false });
      useTaskStore.setState({ goalTasks: [task] });
      mockTaskService.completeGoalTask.mockRejectedValue(
        new Error('DB write failed')
      );

      await useTaskStore.getState().toggleGoalTaskCompletion('task-1');

      expect(useTaskStore.getState().goalTasks[0].isCompleted).toBe(false);
      expect(useTaskStore.getState().error).toBe('DB write failed');
    });
  });

  describe('removeGoalTask', () => {
    it('optimistically removes and persists deletion', async () => {
      useTaskStore.setState({ goalTasks: [sampleTask()] });
      mockTaskService.deleteGoalTask.mockResolvedValue(undefined);

      await useTaskStore.getState().removeGoalTask('task-1');

      expect(useTaskStore.getState().goalTasks).toEqual([]);
    });

    it('rolls back on failure', async () => {
      const task = sampleTask();
      useTaskStore.setState({ goalTasks: [task] });
      mockTaskService.deleteGoalTask.mockRejectedValue(
        new Error('Delete failed')
      );

      await useTaskStore.getState().removeGoalTask('task-1');

      expect(useTaskStore.getState().goalTasks).toEqual([task]);
      expect(useTaskStore.getState().error).toBe('Delete failed');
    });
  });

  describe('addTimeSchedule', () => {
    it('adds schedule on success', async () => {
      const schedule = sampleSchedule();
      mockTaskService.createTimeSchedule.mockResolvedValue(schedule);

      await useTaskStore.getState().addTimeSchedule({
        name: 'Morning Block',
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
      });

      expect(useTaskStore.getState().timeSchedules).toContainEqual(schedule);
    });

    it('sets error on overlap without adding to store', async () => {
      mockTaskService.createTimeSchedule.mockRejectedValue(
        new Error('Schedule overlaps with "Morning Block" on shared days')
      );

      await useTaskStore.getState().addTimeSchedule({
        name: 'Overlapping',
        startTime: '10:00',
        endTime: '14:00',
        daysOfWeek: [1],
        isActive: true,
      });

      expect(useTaskStore.getState().timeSchedules).toEqual([]);
      expect(useTaskStore.getState().error).toContain('overlaps');
    });
  });

  describe('removeTimeSchedule', () => {
    it('optimistically removes and persists', async () => {
      useTaskStore.setState({ timeSchedules: [sampleSchedule()] });
      mockTaskService.deleteTimeSchedule.mockResolvedValue(undefined);

      await useTaskStore.getState().removeTimeSchedule('sched-1');

      expect(useTaskStore.getState().timeSchedules).toEqual([]);
    });
  });

  describe('updateSuccessThreshold', () => {
    it('persists and updates store', async () => {
      const updated: SuccessThreshold = { ...sampleThreshold, requiredCount: 3 };
      mockThresholdRepo.upsert.mockResolvedValue(updated);

      await useTaskStore.getState().updateSuccessThreshold(3, 5);

      expect(useTaskStore.getState().successThreshold).toEqual(updated);
    });
  });
});
