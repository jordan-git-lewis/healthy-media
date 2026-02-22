import type { DailyRecord, DailyStatus } from '../../src/calendar-tracking/calendar-types';

jest.mock('../../src/shared/uuid-utils', () => ({
  generateId: jest.fn(() => 'test-uuid'),
}));
jest.mock('../../src/database/database', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('../../src/calendar-tracking/calendar-service');
jest.mock('../../src/settings/settings-store', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      settings: { dayResetTime: '00:00' },
    })),
  },
}));

import { getDatabase } from '../../src/database/database';
import * as calendarService from '../../src/calendar-tracking/calendar-service';
import { useCalendarStore } from '../../src/calendar-tracking/calendar-store';

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockCalendarService = calendarService as jest.Mocked<typeof calendarService>;

const mockDb = {} as any;

const sampleRecord = (date: string, status: DailyStatus = 'full_success'): DailyRecord => ({
  id: `rec-${date}`,
  date,
  goalTasksCompleted: 2,
  goalTasksTotal: 2,
  successThreshold: 2,
  overrideCount: 0,
  timeScheduleAdherence: 1,
  status,
  createdAt: `${date}T00:00:00.000Z`,
  updatedAt: `${date}T00:00:00.000Z`,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatabase.mockResolvedValue(mockDb);

  // Reset the store state between tests
  useCalendarStore.setState({
    dailyRecords: new Map(),
    todayStatus: null,
    isLoading: false,
    error: null,
  });
});

describe('useCalendarStore', () => {
  describe('loadMonth', () => {
    it('loads records for the given month and stores as map', async () => {
      const records = [
        sampleRecord('2026-02-10'),
        sampleRecord('2026-02-15', 'partial_success'),
        sampleRecord('2026-02-20', 'not_met'),
      ];
      mockCalendarService.getDailyRecordsForMonth.mockResolvedValue(records);

      await useCalendarStore.getState().loadMonth(2026, 2);

      const { dailyRecords, isLoading } = useCalendarStore.getState();
      expect(isLoading).toBe(false);
      expect(dailyRecords.size).toBe(3);
      expect(dailyRecords.get('2026-02-10')?.status).toBe('full_success');
      expect(dailyRecords.get('2026-02-15')?.status).toBe('partial_success');
      expect(dailyRecords.get('2026-02-20')?.status).toBe('not_met');
    });

    it('sets isLoading true during fetch then false after', async () => {
      let resolveRecords: (val: DailyRecord[]) => void;
      const promise = new Promise<DailyRecord[]>((res) => {
        resolveRecords = res;
      });
      mockCalendarService.getDailyRecordsForMonth.mockReturnValue(promise);

      const loadPromise = useCalendarStore.getState().loadMonth(2026, 2);
      expect(useCalendarStore.getState().isLoading).toBe(true);

      resolveRecords!([]);
      await loadPromise;

      expect(useCalendarStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockCalendarService.getDailyRecordsForMonth.mockRejectedValue(
        new Error('DB error')
      );

      await useCalendarStore.getState().loadMonth(2026, 2);

      const { error, isLoading } = useCalendarStore.getState();
      expect(error).toBe('DB error');
      expect(isLoading).toBe(false);
    });
  });

  describe('refreshToday', () => {
    it('updates todayStatus from computeCurrentDayStatus', async () => {
      mockCalendarService.computeCurrentDayStatus.mockResolvedValue('full_success');
      mockCalendarService.getDailyRecordsForMonth.mockResolvedValue([]);

      await useCalendarStore.getState().refreshToday();

      expect(useCalendarStore.getState().todayStatus).toBe('full_success');
    });
  });

  describe('navigateMonth', () => {
    it('advances to the next month correctly', async () => {
      mockCalendarService.getDailyRecordsForMonth.mockResolvedValue([]);
      useCalendarStore.setState({ currentYear: 2026, currentMonth: 2 });

      await useCalendarStore.getState().navigateMonth(1);

      const { currentYear, currentMonth } = useCalendarStore.getState();
      expect(currentYear).toBe(2026);
      expect(currentMonth).toBe(3);
    });

    it('wraps December to January of next year', async () => {
      mockCalendarService.getDailyRecordsForMonth.mockResolvedValue([]);
      useCalendarStore.setState({ currentYear: 2026, currentMonth: 12 });

      await useCalendarStore.getState().navigateMonth(1);

      const { currentYear, currentMonth } = useCalendarStore.getState();
      expect(currentYear).toBe(2027);
      expect(currentMonth).toBe(1);
    });

    it('wraps January to December of previous year', async () => {
      mockCalendarService.getDailyRecordsForMonth.mockResolvedValue([]);
      useCalendarStore.setState({ currentYear: 2026, currentMonth: 1 });

      await useCalendarStore.getState().navigateMonth(-1);

      const { currentYear, currentMonth } = useCalendarStore.getState();
      expect(currentYear).toBe(2025);
      expect(currentMonth).toBe(12);
    });
  });
});
