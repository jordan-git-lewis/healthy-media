import type { SQLiteDatabase } from 'expo-sqlite';
import type { UserSettings } from '../../src/settings/settings-types';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/repositories/user-settings-repository');
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/time-schedule-repository');

import * as dashboardService from '../../src/dashboard/dashboard-service';
import * as userSettingsRepository from '../../src/database/repositories/user-settings-repository';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as timeScheduleRepository from '../../src/database/repositories/time-schedule-repository';

const mockSettingsRepo = userSettingsRepository as jest.Mocked<
  typeof userSettingsRepository
>;
const mockTaskRepo = goalTaskRepository as jest.Mocked<
  typeof goalTaskRepository
>;
const mockScheduleRepo = timeScheduleRepository as jest.Mocked<
  typeof timeScheduleRepository
>;

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
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dashboardService', () => {
  describe('loadDashboard', () => {
    it('returns correct task counts for the aligned date', async () => {
      const tasks = [
        sampleTask({ id: 'task-1', isCompleted: true }),
        sampleTask({ id: 'task-2', isCompleted: false }),
        sampleTask({ id: 'task-3', isCompleted: true }),
      ];
      mockSettingsRepo.get.mockResolvedValue(sampleSettings);
      mockTaskRepo.getByDate.mockResolvedValue(tasks);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([]);

      // Friday Feb 20, 2026 at 10:00 AM
      const now = new Date(2026, 1, 20, 10, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.totalCount).toBe(3);
      expect(result.completedCount).toBe(2);
      expect(result.todayDate).toBe('2026-02-20');
      expect(mockTaskRepo.getByDate).toHaveBeenCalledWith(mockDb, '2026-02-20');
    });

    it('uses previous day when current time is before reset time', async () => {
      mockSettingsRepo.get.mockResolvedValue(sampleSettings);
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([]);

      // Feb 20 at 03:00 — before 04:00 reset, so aligned date = Feb 19
      const now = new Date(2026, 1, 20, 3, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.todayDate).toBe('2026-02-19');
      expect(mockTaskRepo.getByDate).toHaveBeenCalledWith(mockDb, '2026-02-19');
    });

    it('identifies current schedule when inside a window', async () => {
      const schedule = sampleSchedule({
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [5], // Friday
      });
      mockSettingsRepo.get.mockResolvedValue(sampleSettings);
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([schedule]);

      // Friday Feb 20, 2026 at 10:00 AM (day 5 = Friday)
      const now = new Date(2026, 1, 20, 10, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.currentSchedule).toEqual(schedule);
      expect(result.isInScheduleWindow).toBe(true);
    });

    it('returns null currentSchedule when outside all windows', async () => {
      const schedule = sampleSchedule({
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [5],
      });
      mockSettingsRepo.get.mockResolvedValue(sampleSettings);
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([schedule]);

      // Friday Feb 20, 2026 at 14:00 — outside 08:00-12:00
      const now = new Date(2026, 1, 20, 14, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.currentSchedule).toBeNull();
      expect(result.isInScheduleWindow).toBe(false);
    });

    it('finds next upcoming schedule', async () => {
      const morning = sampleSchedule({
        id: 'sched-morning',
        name: 'Morning',
        startTime: '08:00',
        endTime: '10:00',
        daysOfWeek: [5],
      });
      const afternoon = sampleSchedule({
        id: 'sched-afternoon',
        name: 'Afternoon',
        startTime: '14:00',
        endTime: '17:00',
        daysOfWeek: [5],
      });
      mockSettingsRepo.get.mockResolvedValue(sampleSettings);
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([
        afternoon,
        morning,
      ]);

      // Friday Feb 20 at 12:00 — between morning and afternoon
      const now = new Date(2026, 1, 20, 12, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.nextSchedule).toEqual(afternoon);
    });

    it('computes isActivelyBlocking=true when in window and global enabled', async () => {
      const schedule = sampleSchedule({ daysOfWeek: [5] });
      mockSettingsRepo.get.mockResolvedValue({
        ...sampleSettings,
        globalBlockingEnabled: true,
      });
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([schedule]);

      // Friday Feb 20 at 10:00 — inside 08:00-12:00
      const now = new Date(2026, 1, 20, 10, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.isActivelyBlocking).toBe(true);
      expect(result.globalBlockingEnabled).toBe(true);
    });

    it('computes isActivelyBlocking=false when global blocking disabled', async () => {
      const schedule = sampleSchedule({ daysOfWeek: [5] });
      mockSettingsRepo.get.mockResolvedValue({
        ...sampleSettings,
        globalBlockingEnabled: false,
      });
      mockTaskRepo.getByDate.mockResolvedValue([]);
      mockScheduleRepo.getActiveSchedules.mockResolvedValue([schedule]);

      // Friday Feb 20 at 10:00 — inside window but global off
      const now = new Date(2026, 1, 20, 10, 0);
      const result = await dashboardService.loadDashboard(mockDb, now);

      expect(result.isActivelyBlocking).toBe(false);
      expect(result.isInScheduleWindow).toBe(true);
      expect(result.globalBlockingEnabled).toBe(false);
    });
  });
});
