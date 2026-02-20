import type { SQLiteDatabase } from 'expo-sqlite';
import type { TimeSchedule } from '../../task-management/task-types';
import { generateId } from '../../shared/uuid-utils';

interface TimeScheduleRow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: TimeScheduleRow): TimeSchedule {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    daysOfWeek: JSON.parse(row.days_of_week) as number[],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAll(db: SQLiteDatabase): Promise<TimeSchedule[]> {
  const rows = await db.getAllAsync<TimeScheduleRow>(
    'SELECT * FROM TimeSchedule'
  );
  return rows.map(mapRow);
}

export async function getById(
  db: SQLiteDatabase,
  id: string
): Promise<TimeSchedule | null> {
  const row = await db.getFirstAsync<TimeScheduleRow>(
    'SELECT * FROM TimeSchedule WHERE id = ?',
    id
  );
  return row ? mapRow(row) : null;
}

export async function getActiveSchedules(
  db: SQLiteDatabase
): Promise<TimeSchedule[]> {
  const rows = await db.getAllAsync<TimeScheduleRow>(
    'SELECT * FROM TimeSchedule WHERE is_active = 1'
  );
  return rows.map(mapRow);
}

export async function isTimeBlocked(
  db: SQLiteDatabase,
  now: Date
): Promise<boolean> {
  const schedules = await getActiveSchedules(db);
  const dayOfWeek = now.getDay();
  const currentTime =
    now.getHours().toString().padStart(2, '0') +
    ':' +
    now.getMinutes().toString().padStart(2, '0');

  return schedules.some(
    (s) =>
      s.daysOfWeek.includes(dayOfWeek) &&
      currentTime >= s.startTime &&
      currentTime < s.endTime
  );
}

export async function create(
  db: SQLiteDatabase,
  schedule: Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TimeSchedule> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO TimeSchedule (id, name, start_time, end_time, days_of_week, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    schedule.name,
    schedule.startTime,
    schedule.endTime,
    JSON.stringify(schedule.daysOfWeek),
    schedule.isActive ? 1 : 0,
    now,
    now
  );

  const row = await db.getFirstAsync<TimeScheduleRow>(
    'SELECT * FROM TimeSchedule WHERE id = ?',
    id
  );
  return mapRow(row!);
}

export async function update(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Omit<TimeSchedule, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TimeSchedule> {
  const setClauses: string[] = [];
  const params: (string | number)[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.startTime !== undefined) {
    setClauses.push('start_time = ?');
    params.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    setClauses.push('end_time = ?');
    params.push(updates.endTime);
  }
  if (updates.daysOfWeek !== undefined) {
    setClauses.push('days_of_week = ?');
    params.push(JSON.stringify(updates.daysOfWeek));
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    params.push(updates.isActive ? 1 : 0);
  }

  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);
  params.push(id);

  await db.runAsync(
    `UPDATE TimeSchedule SET ${setClauses.join(', ')} WHERE id = ?`,
    ...params
  );

  const row = await db.getFirstAsync<TimeScheduleRow>(
    'SELECT * FROM TimeSchedule WHERE id = ?',
    id
  );
  return mapRow(row!);
}

export async function deleteById(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM TimeSchedule WHERE id = ?', id);
}
