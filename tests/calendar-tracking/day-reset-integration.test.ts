/**
 * Integration tests for day reset alignment across calendar services.
 *
 * Verifies that CalendarService and DailyRecordService correctly use
 * getAlignedDate() based on the user's configured dayResetTime.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord } from '../../src/calendar-tracking/calendar-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/repositories/daily-record-repository');
jest.mock('../../src/database/repositories/goal-task-repository');
jest.mock('../../src/database/repositories/success-threshold-repository');
jest.mock('../../src/database/repositories/override-event-repository');
jest.mock('../../src/database/repositories/time-schedule-repository');

// We test that the setting is read from useSettingsStore
const mockGetState = jest.fn();
jest.mock('../../src/settings/settings-store', () => ({
  useSettingsStore: {
    getState: mockGetState,
  },
}));

import * as dailyRecordRepository from '../../src/database/repositories/daily-record-repository';
import * as goalTaskRepository from '../../src/database/repositories/goal-task-repository';
import * as successThresholdRepository from '../../src/database/repositories/success-threshold-repository';
import * as overrideEventRepository from '../../src/database/repositories/override-event-repository';
import { updateDailyRecord } from '../../src/calendar-tracking/daily-record-service';
import { getDailyRecordsForMonth } from '../../src/calendar-tracking/calendar-service';
import { getAlignedDate } from '../../src/shared/date-utils';

const mockDailyRecordRepo = dailyRecordRepository as jest.Mocked<typeof dailyRecordRepository>;
const mockGoalTaskRepo = goalTaskRepository as jest.Mocked<typeof goalTaskRepository>;
const mockThresholdRepo = successThresholdRepository as jest.Mocked<typeof successThresholdRepository>;
const mockOverrideRepo = overrideEventRepository as jest.Mocked<typeof overrideEventRepository>;

const mockDb = {} as SQLiteDatabase;

function makeRecord(date: string, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: `rec-${date}`,
    date,
    goalTasksCompleted: 0,
    goalTasksTotal: 0,
    successThreshold: 0,
    overrideCount: 0,
    timeScheduleAdherence: 1,
    status: 'not_met',
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoalTaskRepo.getByDate.mockResolvedValue([]);
  mockThresholdRepo.getByDate.mockResolvedValue(null);
  mockOverrideRepo.getCountByDate.mockResolvedValue(0);
  mockDailyRecordRepo.upsert.mockImplementation(async (_db, record) =>
    makeRecord(record.date, record as Partial<DailyRecord>)
  );
});

// Direct unit tests for getAlignedDate edge cases (verifying existing behavior)
describe('getAlignedDate edge cases', () => {
  it('returns previous day when timestamp is before reset time', () => {
    // 02:00 AM on Feb 20 with a 04:00 reset → still Feb 19
    const timestamp = new Date('2026-02-20T02:00:00');
    expect(getAlignedDate(timestamp, '04:00')).toBe('2026-02-19');
  });

  it('returns current day when timestamp is at or after reset time', () => {
    // 04:00 AM exactly on Feb 20 with a 04:00 reset → Feb 20
    const timestamp = new Date('2026-02-20T04:00:00');
    expect(getAlignedDate(timestamp, '04:00')).toBe('2026-02-20');
  });

  it('handles midnight reset with late-night timestamp', () => {
    // 23:30 on Feb 19 with a 00:00 reset → Feb 19 (after midnight reset)
    const timestamp = new Date('2026-02-19T23:30:00');
    expect(getAlignedDate(timestamp, '00:00')).toBe('2026-02-19');
  });

  it('handles non-midnight reset: 2 AM before 4 AM reset returns previous day', () => {
    const timestamp = new Date('2026-02-20T02:00:00');
    expect(getAlignedDate(timestamp, '04:00')).toBe('2026-02-19');
  });
});

// Integration: updateDailyRecord uses aligned date from settings
describe('updateDailyRecord alignment integration', () => {
  it('uses midnight reset (default) and queries tasks for the same date', async () => {
    mockGetState.mockReturnValue({ settings: { dayResetTime: '00:00' } });

    await updateDailyRecord(mockDb, '2026-02-20');

    // With 00:00 reset, '2026-02-20T12:00:00' aligns to '2026-02-20'
    expect(mockGoalTaskRepo.getByDate).toHaveBeenCalledWith(mockDb, '2026-02-20');
  });

  it('uses configured reset time when settings have dayResetTime', async () => {
    // If dayResetTime is '04:00', then '2026-02-20T12:00:00' (noon) aligns to '2026-02-20'
    mockGetState.mockReturnValue({ settings: { dayResetTime: '04:00' } });

    await updateDailyRecord(mockDb, '2026-02-20');

    expect(mockGoalTaskRepo.getByDate).toHaveBeenCalledWith(mockDb, '2026-02-20');
  });

  it('falls back to 00:00 when settings is null', async () => {
    mockGetState.mockReturnValue({ settings: null });

    await updateDailyRecord(mockDb, '2026-02-20');

    // Default '00:00' reset → still queries '2026-02-20'
    expect(mockGoalTaskRepo.getByDate).toHaveBeenCalledWith(mockDb, '2026-02-20');
  });
});

// Integration: getDailyRecordsForMonth uses aligned date boundaries
describe('getDailyRecordsForMonth alignment integration', () => {
  it('queries the correct month boundary dates with midnight reset', async () => {
    mockGetState.mockReturnValue({ settings: { dayResetTime: '00:00' } });
    mockDailyRecordRepo.getByDateRange.mockResolvedValue([]);

    await getDailyRecordsForMonth(mockDb, 2026, 2);

    // February 2026: 2026-02-01 to 2026-02-28
    expect(mockDailyRecordRepo.getByDateRange).toHaveBeenCalledWith(
      mockDb,
      '2026-02-01',
      '2026-02-28'
    );
  });

  it('queries the correct month boundary for January (31 days)', async () => {
    mockGetState.mockReturnValue({ settings: { dayResetTime: '00:00' } });
    mockDailyRecordRepo.getByDateRange.mockResolvedValue([]);

    await getDailyRecordsForMonth(mockDb, 2026, 1);

    expect(mockDailyRecordRepo.getByDateRange).toHaveBeenCalledWith(
      mockDb,
      '2026-01-01',
      '2026-01-31'
    );
  });

  it('uses settings dayResetTime for start boundary alignment', async () => {
    mockGetState.mockReturnValue({ settings: { dayResetTime: '04:00' } });
    mockDailyRecordRepo.getByDateRange.mockResolvedValue([]);

    await getDailyRecordsForMonth(mockDb, 2026, 2);

    // First day of Feb at 00:00 is before 04:00 reset — so aligns to Jan 31
    // This verifies the aligned date logic for month boundaries
    const call = mockDailyRecordRepo.getByDateRange.mock.calls[0];
    expect(call[0]).toBe(mockDb);
    // The start date should reflect aligned date logic
    // '2026-02-01 00:00' with '04:00' reset → previous day '2026-01-31'
    expect(call[1]).toBe('2026-01-31');
    expect(call[2]).toBe('2026-02-28');
  });
});
