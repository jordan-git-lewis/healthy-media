import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyRecord, DailyStatus } from '../../calendar-tracking/calendar-types';
import { generateId } from '../../shared/uuid-utils';

interface DailyRecordRow {
  id: string;
  date: string;
  goal_tasks_completed: number;
  goal_tasks_total: number;
  success_threshold: number;
  override_count: number;
  time_schedule_adherence: number;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DailyRecordRow): DailyRecord {
  return {
    id: row.id,
    date: row.date,
    goalTasksCompleted: row.goal_tasks_completed,
    goalTasksTotal: row.goal_tasks_total,
    successThreshold: row.success_threshold,
    overrideCount: row.override_count,
    timeScheduleAdherence: row.time_schedule_adherence,
    status: row.status as DailyStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getByDate(
  db: SQLiteDatabase,
  date: string
): Promise<DailyRecord | null> {
  const row = await db.getFirstAsync<DailyRecordRow>(
    'SELECT * FROM DailyRecord WHERE date = ?',
    date
  );
  return row ? mapRow(row) : null;
}

export async function upsert(
  db: SQLiteDatabase,
  record: Omit<DailyRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DailyRecord> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO DailyRecord (id, date, goal_tasks_completed, goal_tasks_total, success_threshold, override_count, time_schedule_adherence, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       goal_tasks_completed = excluded.goal_tasks_completed,
       goal_tasks_total = excluded.goal_tasks_total,
       success_threshold = excluded.success_threshold,
       override_count = excluded.override_count,
       time_schedule_adherence = excluded.time_schedule_adherence,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    id,
    record.date,
    record.goalTasksCompleted,
    record.goalTasksTotal,
    record.successThreshold,
    record.overrideCount,
    record.timeScheduleAdherence,
    record.status,
    now,
    now
  );

  const row = await db.getFirstAsync<DailyRecordRow>(
    'SELECT * FROM DailyRecord WHERE date = ?',
    record.date
  );
  return mapRow(row!);
}

export async function getByDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<DailyRecord[]> {
  const rows = await db.getAllAsync<DailyRecordRow>(
    'SELECT * FROM DailyRecord WHERE date >= ? AND date <= ? ORDER BY date',
    startDate,
    endDate
  );
  return rows.map(mapRow);
}
