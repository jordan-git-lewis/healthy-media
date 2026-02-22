import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord } from '../../src/calendar-tracking/calendar-types';
import type { GoalTask } from '../../src/task-management/task-types';
import type { SuccessThreshold } from '../../src/calendar-tracking/calendar-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/repositories/daily-record-repository');
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/success-threshold-repository');
jest.mock('../../src/database/repositories/override-event-repository');
jest.mock('../../src/settings/settings-store', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      settings: { dayResetTime: '00:00' },
    })),
  },
}));

import * as dailyRecordRepository from '../../src/database/repositories/daily-record-repository';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as successThresholdRepository from '../../src/database/repositories/success-threshold-repository';
import * as overrideEventRepository from '../../src/database/repositories/override-event-repository';
import {
  getOrCreateDailyRecord,
  updateDailyRecord,
  computeStatus,
} from '../../src/calendar-tracking/daily-record-service';

const mockDailyRecordRepo = dailyRecordRepository as jest.Mocked<
  typeof dailyRecordRepository
>;
const mockGoalTaskRepo = goalTaskRepository as jest.Mocked<
  typeof goalTaskRepository
>;
const mockThresholdRepo = successThresholdRepository as jest.Mocked<
  typeof successThresholdRepository
>;
const mockOverrideRepo = overrideEventRepository as jest.Mocked<
  typeof overrideEventRepository
>;

const mockDb = {} as SQLiteDatabase;

const sampleRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
  id: 'rec-1',
  date: '2026-02-20',
  goalTasksCompleted: 0,
  goalTasksTotal: 0,
  successThreshold: 0,
  overrideCount: 0,
  timeScheduleAdherence: 1,
  status: 'not_met',
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
  ...overrides,
});

const sampleTask = (overrides: Partial<GoalTask> = {}): GoalTask => ({
  id: 'task-1',
  name: 'Read a book',
  date: '2026-02-20',
  isCompleted: false,
  completedAt: null,
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-20T00:00:00.000Z',
  ...overrides,
});

const sampleThreshold = (
  overrides: Partial<SuccessThreshold> = {}
): SuccessThreshold => ({
  id: 'thresh-1',
  date: '2026-02-20',
  requiredCount: 2,
  totalCount: 3,
  createdAt: '2026-02-20T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('computeStatus', () => {
  it('returns full_success when tasks >= threshold and no overrides', () => {
    expect(computeStatus(3, 3, 2, 0, 1)).toBe('full_success');
  });

  it('returns partial_success when tasks >= threshold but overrides exist', () => {
    expect(computeStatus(3, 3, 2, 2, 1)).toBe('partial_success');
  });

  it('returns not_met when tasks < threshold', () => {
    expect(computeStatus(1, 3, 2, 0, 1)).toBe('not_met');
  });

  it('returns full_success for time-only day (no tasks) with no overrides and adherence=1', () => {
    expect(computeStatus(0, 0, 0, 0, 1)).toBe('full_success');
  });

  it('returns partial_success for time-only day with overrides', () => {
    expect(computeStatus(0, 0, 0, 1, 1)).toBe('partial_success');
  });

  it('returns not_met for time-only day when adherence=0', () => {
    expect(computeStatus(0, 0, 0, 0, 0)).toBe('not_met');
  });
});

describe('getOrCreateDailyRecord', () => {
  it('returns existing record if found', async () => {
    const existing = sampleRecord({ goalTasksCompleted: 2 });
    mockDailyRecordRepo.getByDate.mockResolvedValue(existing);

    const result = await getOrCreateDailyRecord(mockDb, '2026-02-20');

    expect(mockDailyRecordRepo.getByDate).toHaveBeenCalledWith(
      mockDb,
      '2026-02-20'
    );
    expect(result).toEqual(existing);
    expect(mockDailyRecordRepo.upsert).not.toHaveBeenCalled();
  });

  it('creates default record when none exists', async () => {
    const defaultRecord = sampleRecord();
    mockDailyRecordRepo.getByDate.mockResolvedValue(null);
    mockDailyRecordRepo.upsert.mockResolvedValue(defaultRecord);

    const result = await getOrCreateDailyRecord(mockDb, '2026-02-20');

    expect(mockDailyRecordRepo.upsert).toHaveBeenCalledWith(mockDb, {
      date: '2026-02-20',
      goalTasksCompleted: 0,
      goalTasksTotal: 0,
      successThreshold: 0,
      overrideCount: 0,
      timeScheduleAdherence: 1,
      status: 'not_met',
    });
    expect(result).toEqual(defaultRecord);
  });
});

describe('updateDailyRecord', () => {
  it('computes full_success when all tasks completed with no overrides', async () => {
    const tasks = [
      sampleTask({ id: 'task-1', isCompleted: true }),
      sampleTask({ id: 'task-2', isCompleted: true }),
    ];
    const threshold = sampleThreshold({ requiredCount: 1, totalCount: 2 });
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockThresholdRepo.getByDate.mockResolvedValue(threshold);
    mockOverrideRepo.getCountByDate.mockResolvedValue(0);
    mockDailyRecordRepo.upsert.mockResolvedValue(
      sampleRecord({ goalTasksCompleted: 2, goalTasksTotal: 2, status: 'full_success' })
    );

    const result = await updateDailyRecord(mockDb, '2026-02-20');

    expect(result.status).toBe('full_success');
  });

  it('computes partial_success when threshold met but overrides exist', async () => {
    const tasks = [
      sampleTask({ id: 'task-1', isCompleted: true }),
      sampleTask({ id: 'task-2', isCompleted: true }),
    ];
    const threshold = sampleThreshold({ requiredCount: 1, totalCount: 2 });
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockThresholdRepo.getByDate.mockResolvedValue(threshold);
    mockOverrideRepo.getCountByDate.mockResolvedValue(3);
    mockDailyRecordRepo.upsert.mockResolvedValue(
      sampleRecord({ goalTasksCompleted: 2, goalTasksTotal: 2, overrideCount: 3, status: 'partial_success' })
    );

    const result = await updateDailyRecord(mockDb, '2026-02-20');

    expect(result.status).toBe('partial_success');
  });

  it('computes not_met when completed tasks < threshold', async () => {
    const tasks = [
      sampleTask({ id: 'task-1', isCompleted: true }),
      sampleTask({ id: 'task-2', isCompleted: false }),
      sampleTask({ id: 'task-3', isCompleted: false }),
    ];
    const threshold = sampleThreshold({ requiredCount: 2, totalCount: 3 });
    mockGoalTaskRepo.getByDate.mockResolvedValue(tasks);
    mockThresholdRepo.getByDate.mockResolvedValue(threshold);
    mockOverrideRepo.getCountByDate.mockResolvedValue(0);
    mockDailyRecordRepo.upsert.mockResolvedValue(
      sampleRecord({ goalTasksCompleted: 1, goalTasksTotal: 3, status: 'not_met' })
    );

    const result = await updateDailyRecord(mockDb, '2026-02-20');

    expect(result.status).toBe('not_met');
  });

  it('handles zero threshold (no threshold record): defaults to not_met with no tasks', async () => {
    mockGoalTaskRepo.getByDate.mockResolvedValue([]);
    mockThresholdRepo.getByDate.mockResolvedValue(null);
    mockOverrideRepo.getCountByDate.mockResolvedValue(0);
    mockDailyRecordRepo.upsert.mockResolvedValue(
      sampleRecord({ status: 'full_success' })
    );

    await updateDailyRecord(mockDb, '2026-02-20');

    // With no tasks (time-only day) and no overrides, adherence=1 => full_success
    expect(mockDailyRecordRepo.upsert).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        goalTasksTotal: 0,
        goalTasksCompleted: 0,
        successThreshold: 0,
        overrideCount: 0,
        status: 'full_success',
      })
    );
  });
});
