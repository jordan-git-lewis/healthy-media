/**
 * Unit tests for blocking-service.ts (#38).
 *
 * Tests:
 *   - evaluateBlockingState: returns isBlocking: false when global blocking is off
 *   - evaluateBlockingState: returns isBlocking: true with reason 'time_schedule' during active schedule
 *   - evaluateBlockingState: returns isBlocking: true with reason 'incomplete_tasks' when tasks below threshold
 *   - evaluateBlockingState: returns isBlocking: false when tasks at/above threshold
 *   - handleBlockedAppDetected: shows overlay for hard_block app when blocking is active
 *   - handleBlockedAppDetected: does nothing for enforcement level 'off'
 *   - handleBlockedAppDetected: does nothing when evaluateBlockingState returns false
 *   - handleOverrideConfirmed: creates override event in repository
 */

// ---- Mocks ------------------------------------------------------------------

jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../../src/database/repositories/blocked-app-repository');
jest.mock('../../src/database/repositories/override-event-repository');

jest.mock('../../src/native-bridge', () => ({
  updateBlockedApps: jest.fn(),
  showBlockingOverlay: jest.fn(),
}));

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'mock-uuid'),
}));

// We mock the stores so we can set state directly
jest.mock('../../src/task-management/task-store', () => ({
  useTaskStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../src/app-blocking/blocking-store', () => ({
  useBlockingStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../src/settings/settings-store', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

const mockRefreshToday = jest.fn();
jest.mock('../../src/calendar-tracking/calendar-store', () => ({
  useCalendarStore: {
    getState: jest.fn(() => ({ refreshToday: mockRefreshToday })),
  },
}));

jest.mock('../../src/calendar-tracking/daily-record-service', () => ({
  updateDailyRecord: jest.fn(),
}));

// expo-crypto mock
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

import {
  evaluateBlockingState,
  handleBlockedAppDetected,
  handleOverrideConfirmed,
} from '../../src/app-blocking/blocking-service';
import { useTaskStore } from '../../src/task-management/task-store';
import { useBlockingStore } from '../../src/app-blocking/blocking-store';
import { useSettingsStore } from '../../src/settings/settings-store';
import { showBlockingOverlay } from '../../src/native-bridge';
import * as overrideEventRepository from '../../src/database/repositories/override-event-repository';
import * as dailyRecordService from '../../src/calendar-tracking/daily-record-service';
import { getDatabase } from '../../src/database/database';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { GoalTask, TimeSchedule } from '../../src/task-management/task-types';
import type { SuccessThreshold, DailyRecord } from '../../src/calendar-tracking/calendar-types';
import type { BlockedApp } from '../../src/app-blocking/blocking-types';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockShowBlockingOverlay = showBlockingOverlay as jest.MockedFunction<typeof showBlockingOverlay>;
const mockOverrideRepo = overrideEventRepository as jest.Mocked<typeof overrideEventRepository>;
const mockDailyRecordService = dailyRecordService as jest.Mocked<typeof dailyRecordService>;
const mockTaskStore = useTaskStore as jest.Mocked<typeof useTaskStore>;
const mockBlockingStore = useBlockingStore as jest.Mocked<typeof useBlockingStore>;
const mockSettingsStore = useSettingsStore as jest.Mocked<typeof useSettingsStore>;

const mockDb = {} as SQLiteDatabase;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGoalTask(overrides: Partial<GoalTask> = {}): GoalTask {
  return {
    id: 'task-1',
    name: 'Exercise',
    date: '2026-02-22',
    isCompleted: false,
    completedAt: null,
    createdAt: '2026-02-22T08:00:00.000Z',
    updatedAt: '2026-02-22T08:00:00.000Z',
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<TimeSchedule> = {}): TimeSchedule {
  return {
    id: 'sched-1',
    name: 'Evening Block',
    startTime: '20:00',
    endTime: '22:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
    createdAt: '2026-02-22T00:00:00.000Z',
    updatedAt: '2026-02-22T00:00:00.000Z',
    ...overrides,
  };
}

function makeThreshold(overrides: Partial<SuccessThreshold> = {}): SuccessThreshold {
  return {
    id: 'threshold-1',
    date: '2026-02-22',
    requiredCount: 3,
    totalCount: 5,
    createdAt: '2026-02-22T00:00:00.000Z',
    ...overrides,
  };
}

function makeBlockedApp(overrides: Partial<BlockedApp> = {}): BlockedApp {
  return {
    id: 'app-1',
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    iconUri: null,
    enforcementLevel: 'hard_block',
    createdAt: '2026-02-22T00:00:00.000Z',
    updatedAt: '2026-02-22T00:00:00.000Z',
    ...overrides,
  };
}

function makeDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: 'record-1',
    date: '2026-02-22',
    goalTasksCompleted: 0,
    goalTasksTotal: 0,
    successThreshold: 0,
    overrideCount: 0,
    timeScheduleAdherence: 1,
    status: 'not_met',
    createdAt: '2026-02-22T00:00:00.000Z',
    updatedAt: '2026-02-22T00:00:00.000Z',
    ...overrides,
  };
}

function setupDefaultStores({
  globalBlockingEnabled = true,
  goalTasks = [] as GoalTask[],
  timeSchedules = [] as TimeSchedule[],
  successThreshold = null as SuccessThreshold | null,
  blockedApps = [] as BlockedApp[],
} = {}) {
  (mockSettingsStore.getState as jest.Mock).mockReturnValue({
    settings: { globalBlockingEnabled, dayResetTime: '00:00' },
  });
  (mockTaskStore.getState as jest.Mock).mockReturnValue({
    goalTasks,
    timeSchedules,
    successThreshold,
  });
  (mockBlockingStore.getState as jest.Mock).mockReturnValue({ blockedApps });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockResolvedValue(mockDb);
  setupDefaultStores();
});

// ---- evaluateBlockingState -------------------------------------------------

describe('evaluateBlockingState', () => {
  it('returns isBlocking: false when globalBlockingEnabled is false', async () => {
    setupDefaultStores({ globalBlockingEnabled: false });
    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(false);
    expect(state.reason).toBeNull();
  });

  it('returns isBlocking: false when no schedules and no tasks', async () => {
    setupDefaultStores({ globalBlockingEnabled: true });
    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(false);
  });

  it('returns isBlocking: true with reason time_schedule during active schedule', async () => {
    // Mock the current time to 20:30 on a Sunday (day 0)
    const mockDate = new Date('2026-02-22T20:30:00');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(global, 'Date').mockImplementation((arg?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (arg !== undefined) return new (jest.requireActual('Date') as any)(arg) as Date;
      return mockDate as Date;
    });

    setupDefaultStores({
      timeSchedules: [makeSchedule({ startTime: '20:00', endTime: '22:00', daysOfWeek: [0] })],
    });

    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(true);
    expect(state.reason).toBe('time_schedule');
    expect(state.timeRemaining).not.toBeNull();
    expect(state.timeRemaining!.minutes).toBe(90); // 22:00 - 20:30 = 90 min

    jest.restoreAllMocks();
  });

  it('returns isBlocking: false when schedule is inactive', async () => {
    const mockDate = new Date('2026-02-22T20:30:00');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(global, 'Date').mockImplementation((arg?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (arg !== undefined) return new (jest.requireActual('Date') as any)(arg) as Date;
      return mockDate as Date;
    });

    setupDefaultStores({
      timeSchedules: [makeSchedule({ isActive: false, startTime: '20:00', endTime: '22:00', daysOfWeek: [0] })],
    });

    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(false);

    jest.restoreAllMocks();
  });

  it('returns isBlocking: true with reason incomplete_tasks when tasks below threshold', async () => {
    setupDefaultStores({
      goalTasks: [
        makeGoalTask({ isCompleted: true }),
        makeGoalTask({ id: 'task-2', isCompleted: false }),
        makeGoalTask({ id: 'task-3', isCompleted: false }),
      ],
      successThreshold: makeThreshold({ requiredCount: 3 }),
    });

    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(true);
    expect(state.reason).toBe('incomplete_tasks');
    expect(state.taskProgress).toEqual({ completed: 1, total: 3, threshold: 3 });
  });

  it('returns isBlocking: false when completed tasks meet threshold', async () => {
    setupDefaultStores({
      goalTasks: [
        makeGoalTask({ isCompleted: true }),
        makeGoalTask({ id: 'task-2', isCompleted: true }),
        makeGoalTask({ id: 'task-3', isCompleted: true }),
      ],
      successThreshold: makeThreshold({ requiredCount: 3 }),
    });

    const state = await evaluateBlockingState();
    expect(state.isBlocking).toBe(false);
  });
});

// ---- handleBlockedAppDetected -----------------------------------------------

describe('handleBlockedAppDetected', () => {
  it('shows overlay for hard_block app when blocking is active', async () => {
    const mockDate = new Date('2026-02-22T20:30:00');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(global, 'Date').mockImplementation((arg?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (arg !== undefined) return new (jest.requireActual('Date') as any)(arg) as Date;
      return mockDate as Date;
    });

    setupDefaultStores({
      blockedApps: [makeBlockedApp({ packageName: 'com.instagram.android', enforcementLevel: 'hard_block' })],
      timeSchedules: [makeSchedule({ startTime: '20:00', endTime: '22:00', daysOfWeek: [0] })],
    });

    mockShowBlockingOverlay.mockResolvedValueOnce(undefined);

    await handleBlockedAppDetected('com.instagram.android', 'Instagram');

    expect(mockShowBlockingOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'Instagram',
        packageName: 'com.instagram.android',
        enforcementLevel: 'hard_block',
      })
    );

    jest.restoreAllMocks();
  });

  it('does nothing when enforcement level is off', async () => {
    setupDefaultStores({
      blockedApps: [makeBlockedApp({ enforcementLevel: 'off' })],
    });

    await handleBlockedAppDetected('com.instagram.android', 'Instagram');

    expect(mockShowBlockingOverlay).not.toHaveBeenCalled();
  });

  it('does nothing when app is not in blocked list', async () => {
    setupDefaultStores({ blockedApps: [] });

    await handleBlockedAppDetected('com.unknown.app', 'Unknown App');

    expect(mockShowBlockingOverlay).not.toHaveBeenCalled();
  });

  it('does nothing when evaluateBlockingState returns isBlocking: false', async () => {
    setupDefaultStores({
      blockedApps: [makeBlockedApp()],
      globalBlockingEnabled: false,
    });

    await handleBlockedAppDetected('com.instagram.android', 'Instagram');

    expect(mockShowBlockingOverlay).not.toHaveBeenCalled();
  });
});

// ---- handleOverrideConfirmed ------------------------------------------------

describe('handleOverrideConfirmed', () => {
  it('creates an override event with correct fields', async () => {
    setupDefaultStores({
      goalTasks: [makeGoalTask({ name: 'Exercise', isCompleted: true })],
    });

    const fakeEvent = {
      id: 'mock-uuid',
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      timestamp: '2026-02-22T20:30:00.000Z',
      date: '2026-02-22',
      activeScheduleId: null,
      taskContext: null,
    };
    mockOverrideRepo.create.mockResolvedValueOnce(fakeEvent);
    mockDailyRecordService.updateDailyRecord.mockResolvedValueOnce(makeDailyRecord());
    mockRefreshToday.mockResolvedValueOnce(undefined);

    await handleOverrideConfirmed(
      'com.instagram.android',
      'Instagram',
      '2026-02-22T20:30:00.000Z'
    );

    expect(mockOverrideRepo.create).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        timestamp: '2026-02-22T20:30:00.000Z',
        date: '2026-02-22',
        activeScheduleId: null,
        taskContext: expect.any(String),
      })
    );
  });

  it('includes task context snapshot in the override event', async () => {
    setupDefaultStores({
      goalTasks: [
        makeGoalTask({ name: 'Exercise', isCompleted: true }),
        makeGoalTask({ id: 'task-2', name: 'Read', isCompleted: false }),
      ],
    });

    const fakeEvent = {
      id: 'mock-uuid',
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      timestamp: '2026-02-22T20:30:00.000Z',
      date: '2026-02-22',
      activeScheduleId: null,
      taskContext: null,
    };
    mockOverrideRepo.create.mockResolvedValueOnce(fakeEvent);
    mockDailyRecordService.updateDailyRecord.mockResolvedValueOnce(makeDailyRecord());
    mockRefreshToday.mockResolvedValueOnce(undefined);

    await handleOverrideConfirmed(
      'com.instagram.android',
      'Instagram',
      '2026-02-22T20:30:00.000Z'
    );

    const callArgs = mockOverrideRepo.create.mock.calls[0][1];
    const taskContext = JSON.parse(callArgs.taskContext!);
    expect(taskContext).toEqual([
      { name: 'Exercise', completed: true },
      { name: 'Read', completed: false },
    ]);
  });

  it('calls updateDailyRecord after creating override event', async () => {
    setupDefaultStores({
      goalTasks: [makeGoalTask({ isCompleted: true })],
    });

    const fakeEvent = {
      id: 'mock-uuid',
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      timestamp: '2026-02-22T20:30:00.000Z',
      date: '2026-02-22',
      activeScheduleId: null,
      taskContext: null,
    };
    mockOverrideRepo.create.mockResolvedValueOnce(fakeEvent);
    mockDailyRecordService.updateDailyRecord.mockResolvedValueOnce(makeDailyRecord());
    mockRefreshToday.mockResolvedValueOnce(undefined);

    await handleOverrideConfirmed(
      'com.instagram.android',
      'Instagram',
      '2026-02-22T20:30:00.000Z'
    );

    expect(mockDailyRecordService.updateDailyRecord).toHaveBeenCalledWith(
      mockDb,
      '2026-02-22'
    );
  });

  it('calls calendarStore.refreshToday() after updating daily record', async () => {
    setupDefaultStores({ goalTasks: [] });

    const fakeEvent = {
      id: 'mock-uuid',
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      timestamp: '2026-02-22T20:30:00.000Z',
      date: '2026-02-22',
      activeScheduleId: null,
      taskContext: null,
    };
    mockOverrideRepo.create.mockResolvedValueOnce(fakeEvent);
    mockDailyRecordService.updateDailyRecord.mockResolvedValueOnce(makeDailyRecord());
    mockRefreshToday.mockResolvedValueOnce(undefined);

    await handleOverrideConfirmed(
      'com.instagram.android',
      'Instagram',
      '2026-02-22T20:30:00.000Z'
    );

    expect(mockRefreshToday).toHaveBeenCalledTimes(1);
  });
});
