export type DailyStatus = 'full_success' | 'partial_success' | 'not_met';

export interface SuccessThreshold {
  id: string;
  date: string;
  requiredCount: number;
  totalCount: number;
  createdAt: string;
}

export interface OverrideEvent {
  id: string;
  packageName: string;
  appName: string;
  timestamp: string;
  date: string;
  activeScheduleId: string | null;
  taskContext: string | null;
}

export interface DailyRecord {
  id: string;
  date: string;
  goalTasksCompleted: number;
  goalTasksTotal: number;
  successThreshold: number;
  overrideCount: number;
  timeScheduleAdherence: number;
  status: DailyStatus;
  createdAt: string;
  updatedAt: string;
}
