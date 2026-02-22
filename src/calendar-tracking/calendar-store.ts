import { create } from 'zustand';
import type { DailyRecord, DailyStatus } from './calendar-types';
import { getDatabase } from '../database/database';
import * as calendarService from './calendar-service';
import { formatDate } from '../shared/date-utils';

interface CalendarState {
  currentYear: number;
  currentMonth: number;
  dailyRecords: Map<string, DailyRecord>;
  todayStatus: DailyStatus | null;
  isLoading: boolean;
  error: string | null;
  loadMonth: (year: number, month: number) => Promise<void>;
  refreshToday: () => Promise<void>;
  navigateMonth: (delta: number) => Promise<void>;
}

function getInitialMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const useCalendarStore = create<CalendarState>((set, get) => {
  const { year, month } = getInitialMonth();
  return {
    currentYear: year,
    currentMonth: month,
    dailyRecords: new Map(),
    todayStatus: null,
    isLoading: false,
    error: null,

    async loadMonth(year: number, month: number) {
      set({ isLoading: true, error: null });
      try {
        const db = await getDatabase();
        const records = await calendarService.getDailyRecordsForMonth(
          db,
          year,
          month
        );
        const recordMap = new Map<string, DailyRecord>();
        for (const record of records) {
          recordMap.set(record.date, record);
        }
        set({ dailyRecords: recordMap, isLoading: false });
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to load month',
        });
      }
    },

    async refreshToday() {
      try {
        const db = await getDatabase();
        const status = await calendarService.computeCurrentDayStatus(db);
        set({ todayStatus: status });

        // Also refresh the record for today in the map
        const today = formatDate(new Date());
        const { currentYear, currentMonth, dailyRecords } = get();
        const todayYear = parseInt(today.slice(0, 4), 10);
        const todayMonth = parseInt(today.slice(5, 7), 10);
        if (todayYear === currentYear && todayMonth === currentMonth) {
          await get().loadMonth(currentYear, currentMonth);
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to refresh today',
        });
      }
    },

    async navigateMonth(delta: number) {
      const { currentYear, currentMonth } = get();
      let newMonth = currentMonth + delta;
      let newYear = currentYear;

      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }

      set({ currentYear: newYear, currentMonth: newMonth });
      await get().loadMonth(newYear, newMonth);
    },
  };
});
