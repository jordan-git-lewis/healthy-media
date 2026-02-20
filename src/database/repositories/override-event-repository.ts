import type { SQLiteDatabase } from 'expo-sqlite';
import type { OverrideEvent } from '../../calendar-tracking/calendar-types';
import { generateId } from '../../shared/uuid-utils';

interface OverrideEventRow {
  id: string;
  package_name: string;
  app_name: string;
  timestamp: string;
  date: string;
  active_schedule_id: string | null;
  task_context: string | null;
}

function mapRow(row: OverrideEventRow): OverrideEvent {
  return {
    id: row.id,
    packageName: row.package_name,
    appName: row.app_name,
    timestamp: row.timestamp,
    date: row.date,
    activeScheduleId: row.active_schedule_id,
    taskContext: row.task_context,
  };
}

export async function create(
  db: SQLiteDatabase,
  event: Omit<OverrideEvent, 'id'>
): Promise<OverrideEvent> {
  const id = generateId();

  await db.runAsync(
    `INSERT INTO OverrideEvent (id, package_name, app_name, timestamp, date, active_schedule_id, task_context)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    event.packageName,
    event.appName,
    event.timestamp,
    event.date,
    event.activeScheduleId,
    event.taskContext
  );

  const row = await db.getFirstAsync<OverrideEventRow>(
    'SELECT * FROM OverrideEvent WHERE id = ?',
    id
  );
  return mapRow(row!);
}

export async function getByDate(
  db: SQLiteDatabase,
  date: string
): Promise<OverrideEvent[]> {
  const rows = await db.getAllAsync<OverrideEventRow>(
    'SELECT * FROM OverrideEvent WHERE date = ?',
    date
  );
  return rows.map(mapRow);
}

export async function getCountByDate(
  db: SQLiteDatabase,
  date: string
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM OverrideEvent WHERE date = ?',
    date
  );
  return result!.count;
}
