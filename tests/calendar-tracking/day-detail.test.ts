import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord } from '../../src/calendar-tracking/calendar-types';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';

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

import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as overrideEventRepository from '../../src/database/repositories/override-event-repository';
import * as timeScheduleRepository from '../../src/database/repositories/time-schedule-repository';
import * as dailyRecordService from '../../src/calendar-tracking/daily-record-service';
import { getDayDetail } from '../../src/calendar-tracking/calendar-service';

const mockGoalTaskRepo = goalTaskRepository as jest.Mocked<typeof goalTaskRepository>;
const mockOverrideRepo = overrideEventRepository as jest.Mocked<typeof overrideEventRepository>;
const mockTimeScheduleRepo = timeScheduleRepository as jest.Mocked<typeof timeScheduleRepository>;
const mockDailyRecordService = dailyRecordService as jest.Mocked<typeof dailyRecordService>;

const mockDb = {} as SQLiteDatabase;

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: 'rec-1',
    date: '2026-02-20',
    goalTasksCompleted: 2,
    goalTasksTotal: 3,
    successThreshold: 2,
    overrideCount: 1,
    timeScheduleAdherence: 1,
    status: 'partial_success',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<GoalTask> = {}): GoalTask {
  return {
    id: 'task-1',
    name: 'Read a book',
    date: '2026-02-20',
    isCompleted: true,
    completedAt: '2026-02-20T10:00:00.000Z',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<TimeSchedule> = {}): TimeSchedule {
  return {
    id: 'sched-1',
    name: 'Morning Block',
    startTime: '08:00',
    endTime: '12:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDayDetail', () => {
  it('returns complete day detail with all data populated', async () => {
    const record = makeRecord();
    const tasks = [makeTask({ id: 'task-1', isCompleted: true }), makeTask({ id: 'task-2', isCompleted: false })];
    const overrides = [
      {
        id: 'ov-1',
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        timestamp: '2026-02-20T14:34:00.000Z',
        date: '2026-02-20',
        activeScheduleId: null,
        taskContext: null,
      },
    ];
    const schedule = makeSchedule();

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockOverrideRepo.getByDate.mockResolvedValue(overrides);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([schedule]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.date).toBe('2026-02-20');
    expect(result.record.status).toBe('partial_success');
    expect(result.goalTasks).toHaveLength(2);
    expect(result.overrideEvents).toHaveLength(1);
    expect(result.overrideEvents[0].appName).toBe('Instagram');
    expect(result.overrideEvents[0].packageName).toBe('com.instagram.android');
  });

  it('maps override event fields correctly (appName, packageName, timestamp)', async () => {
    const record = makeRecord({ overrideCount: 2 });
    const overrides = [
      {
        id: 'ov-1',
        packageName: 'com.tiktok',
        appName: 'TikTok',
        timestamp: '2026-02-20T09:15:00.000Z',
        date: '2026-02-20',
        activeScheduleId: null,
        taskContext: null,
      },
      {
        id: 'ov-2',
        packageName: 'com.facebook',
        appName: 'Facebook',
        timestamp: '2026-02-20T15:00:00.000Z',
        date: '2026-02-20',
        activeScheduleId: null,
        taskContext: null,
      },
    ];

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockOverrideRepo.getByDate.mockResolvedValue(overrides);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.overrideEvents[0]).toEqual({
      appName: 'TikTok',
      packageName: 'com.tiktok',
      timestamp: '2026-02-20T09:15:00.000Z',
    });
    expect(result.overrideEvents[1]).toEqual({
      appName: 'Facebook',
      packageName: 'com.facebook',
      timestamp: '2026-02-20T15:00:00.000Z',
    });
  });

  it('returns only schedules matching the day-of-week for the date', async () => {
    // '2026-02-20' is a Friday (dayOfWeek = 5)
    const record = makeRecord();
    const fridaySchedule = makeSchedule({ id: 'fri-sched', daysOfWeek: [5] });
    const saturdaySchedule = makeSchedule({ id: 'sat-sched', daysOfWeek: [6] });

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockOverrideRepo.getByDate.mockResolvedValue([]);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([
      fridaySchedule,
      saturdaySchedule,
    ]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.timeSchedules).toHaveLength(1);
    expect(result.timeSchedules[0].id).toBe('fri-sched');
  });

  it('returns empty collections for a day with no activity', async () => {
    const record = makeRecord({
      goalTasksCompleted: 0,
      goalTasksTotal: 0,
      overrideCount: 0,
      status: 'full_success',
    });

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockOverrideRepo.getByDate.mockResolvedValue([]);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.goalTasks).toHaveLength(0);
    expect(result.overrideEvents).toHaveLength(0);
    expect(result.timeSchedules).toHaveLength(0);
  });

  it('preserves task completion status in goalTasks', async () => {
    const record = makeRecord({ goalTasksCompleted: 1, goalTasksTotal: 2 });
    const tasks = [
      makeTask({ id: 'task-1', name: 'Read', isCompleted: true }),
      makeTask({ id: 'task-2', name: 'Exercise', isCompleted: false }),
    ];

    mockDailyRecordService.getOrCreateDailyRecord.mockResolvedValue(record);
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockOverrideRepo.getByDate.mockResolvedValue([]);
    mockTimeScheduleRepo.getActiveSchedules.mockResolvedValue([]);

    const result = await getDayDetail(mockDb, '2026-02-20');

    expect(result.goalTasks[0].isCompleted).toBe(true);
    expect(result.goalTasks[1].isCompleted).toBe(false);
    expect(result.goalTasks[0].name).toBe('Read');
    expect(result.goalTasks[1].name).toBe('Exercise');
  });
});
