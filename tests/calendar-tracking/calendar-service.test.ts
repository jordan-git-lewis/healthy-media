import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord } from '../../src/calendar-tracking/calendar-types';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';
import type { OverrideEvent } from '../../src/calendar-tracking/calendar-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/repositories/daily-record-repository');
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/override-event-repository');
jest.mock('../../src/database/repositories/time-schedule-repository');
jest.mock('../../src/calendar-tracking/daily-record-service');
jest.mock('../../src/settings/settings-store', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      settings: { dayResetTime: '00:00' },
    })),
  },
}));

import * as dailyRecordRepository from '../../src/database/repositories/daily-record-repository';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as overrideEventRepository from '../../src/database/repositories/override-event-repository';
import * as timeScheduleRepository from '../../src/database/repositories/time-schedule-repository';
import * as dailyRecordService from '../../src/calendar-tracking/daily-record-service';
import {
  getDailyRecordsForMonth,
  getDayDetail,
  computeCurrentDayStatus,
} from '../../src/calendar-tracking/calendar-service';

const mockDailyRecordRepo = dailyRecordRepository as jest.Mocked<
  typeof dailyRecordRepository
>;
const mockGoalTaskRepo = goalTaskRepository as jest.Mocked<
  typeof goalTaskRepository
>;
const mockOverrideRepo = overrideEventRepository as jest.Mocked<
  typeof overrideEventRepository
>;
const mockTimeScheduleRepo = timeScheduleRepository as jest.Mocked<
  typeof timeScheduleRepository
>;
const mockDailyRecordService = dailyRecordService as jest.Mocked<
  typeof dailyRecordService
>;

const mockDb = {} as SQLiteDatabase;

const sampleRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
  id: 'rec-1',
  date: '2026-02-20',
  goalTasksCompleted: 2,
  goalTasksTotal: 3,
  successThreshold: 2,
  overrideCount: 0,
  timeScheduleAdherence: 1,
  status: 'full_success',
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
  ...overrides,
});

const sampleOverride = (overrides: Partial<OverrideEvent> = {}): OverrideEvent => ({
  id: 'ov-1',
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  timestamp: '2026-02-20T14:34:00.000Z',
  date: '2026-02-20',
  activeScheduleId: null,
  taskContext: null,
  ...overrides,
});

const sampleTask = (overrides: Partial<GoalTask> = {}): GoalTask => ({
  id: 'task-1',
  name: 'Read',
  date: '2026-02-20',
  isCompleted: true,
  completedAt: '2026-02-20T10:00:00.000Z',
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
  ...overrides,
});

const sampleSchedule = (overrides: Partial<TimeSchedule> = {}): TimeSchedule => ({
  id: 'sched-1',
  name: 'Morning Block',
  startTime: '08:00',
  endTime: '12:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // all days
  isActive: true,
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDailyRecordsForMonth', () => {
  it('returns records for the given month range', async () => {
    const records = [
      sampleRecord({ date: '2026-02-05' }),
      sampleRecord({ date: '2026-02-15' }),
      sampleRecord({ date: '2026-02-20' }),
    ];
    mockDailyRecordRepo.getByDateRange.mockResolvedValue(records);

    const result = await getDailyRecordsForMonth(mockDb, 2026, 2);

    expect(mockDailyRecordRepo.getByDateRange).toHaveBeenCalledWith(
      mockDb,
      '2026-02-01',
      '2026-02-28'
    );
    expect(result).toHaveLength(3);
  });

  it('handles months with 31 days', async () => {
    mockDailyRecordRepo.getByDateRange.mockResolvedValue([]);

    await getDailyRecordsForMonth(mockDb, 2026, 1); // January

    expect(mockDailyRecordRepo.getByDateRange).toHaveBeenCalledWith(
      mockDb,
      '2026-01-01',
      '2026-01-31'
    );
  });

  it('returns empty array when no records in month', async () => {
    mockDailyRecordRepo.getByDateRange.mockResolvedValue([]);

    const result = await getDailyRecordsForMonth(mockDb, 2026, 3);

    expect(result).toHaveLength(0);
  });
});

describe('getDayDetail', () => {
  it('returns full day detail with record, overrides, tasks, and schedules', async () => {
    const record = sampleRecord();
    const overrides = [sampleOverride()];
    const tasks = [sampleTask()];
    const schedules = [sampleSchedule()];

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockOverrideRepo.getByDate.mockResolvedValue(overrides);
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue(schedules);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.date).toBe('2026-02-20');
    expect(result.record).toEqual(record);
    expect(result.overrideEvents).toHaveLength(1);
    expect(result.overrideEvents[0].appName).toBe('Instagram');
    expect(result.goalTasks).toHaveLength(1);
    expect(result.timeSchedules).toHaveLength(1);
  });

  it('filters schedules to those matching the date day-of-week', async () => {
    const record = sampleRecord();
    // '2026-02-20' is a Friday (dayOfWeek = 5)
    const fridaySchedule = sampleSchedule({ daysOfWeek: [5] });
    const mondaySchedule = sampleSchedule({ id: 'sched-2', daysOfWeek: [1] });

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockOverrideRepo.getByDate.mockResolvedValue([]);
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([
      fridaySchedule,
      mondaySchedule,
    ]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.timeSchedules).toHaveLength(1);
    expect(result.timeSchedules[0].id).toBe('sched-1');
  });

  it('returns empty collections when no data exists for the day', async () => {
    const record = sampleRecord({
      goalTasksCompleted: 0,
      goalTasksTotal: 0,
      overrideCount: 0,
    });

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockOverrideRepo.getByDate.mockResolvedValue([]);
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.overrideEvents).toHaveLength(0);
    expect(result.goalTasks).toHaveLength(0);
    expect(result.timeSchedules).toHaveLength(0);
  });
});

describe('computeCurrentDayStatus', () => {
  it('returns the status of the current aligned day', async () => {
    const record = sampleRecord({ status: 'full_success' });
    mockDailyRecordService.updateDailyRecord.mockResolvedValue(record);

    const result = await computeCurrentDayStatus(mockDb);

    expect(result).toBe('full_success');
    expect(mockDailyRecordService.updateDailyRecord).toHaveBeenCalled();
  });
});
