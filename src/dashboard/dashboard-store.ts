import { create } from 'zustand';
import type { DashboardData } from './dashboard-types';
import * as dashboardService from './dashboard-service';
import { getDatabase } from '../database/database';

interface DashboardState {
  dashboard: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  loadDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboard: null,
  isLoading: false,
  error: null,

  async loadDashboard() {
    set({ isLoading: true, error: null });
    try {
      const db = await getDatabase();
      const dashboard = await dashboardService.loadDashboard(db);
      set({ dashboard, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load dashboard',
      });
    }
  },
}));
