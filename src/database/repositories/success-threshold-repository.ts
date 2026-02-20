import type { SQLiteDatabase } from 'expo-sqlite';
import type { SuccessThreshold } from '../../calendar-tracking/calendar-types';
import { generateId } from '../../shared/uuid-utils';

interface SuccessThresholdRow {
  id: string;
  date: string;
  required_count: number;
  total_count: number;
  created_at: string;
}

function mapRow(row: SuccessThresholdRow): SuccessThreshold {
  return {
    id: row.id,
    date: row.date,
    requiredCount: row.required_count,
    totalCount: row.total_count,
    createdAt: row.created_at,
  };
}

export async function getByDate(
  db: SQLiteDatabase,
  date: string
): Promise<SuccessThreshold | null> {
  const row = await db.getFirstAsync<SuccessThresholdRow>(
    'SELECT * FROM SuccessThreshold WHERE date = ?',
    date
  );
  return row ? mapRow(row) : null;
}

export async function upsert(
  db: SQLiteDatabase,
  threshold: Omit<SuccessThreshold, 'id' | 'createdAt'>
): Promise<SuccessThreshold> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO SuccessThreshold (id, date, required_count, total_count, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       required_count = excluded.required_count,
       total_count = excluded.total_count`,
    id,
    threshold.date,
    threshold.requiredCount,
    threshold.totalCount,
    now
  );

  const row = await db.getFirstAsync<SuccessThresholdRow>(
    'SELECT * FROM SuccessThreshold WHERE date = ?',
    threshold.date
  );
  return mapRow(row!);
}
