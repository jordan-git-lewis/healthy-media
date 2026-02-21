import type { GoalTask, TimeSchedule } from '../task-management/task-types';

export interface DashboardData {
  todayDate: string;
  tasks: GoalTask[];
  completedCount: number;
  totalCount: number;
  activeSchedules: TimeSchedule[];
  currentSchedule: TimeSchedule | null;
  nextSchedule: TimeSchedule | null;
  isInScheduleWindow: boolean;
  isActivelyBlocking: boolean;
  globalBlockingEnabled: boolean;
}
