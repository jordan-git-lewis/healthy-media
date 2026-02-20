export interface TimeSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTask {
  id: string;
  name: string;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
