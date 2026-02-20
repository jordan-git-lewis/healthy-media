import type { SQLiteDatabase } from 'expo-sqlite';
import type { GoalTask } from '../../task-management/task-types';
import { generateId } from '../../shared/uuid-utils';

interface GoalTaskRow {
  id: string;
  name: string;
  date: string;
  is_completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: GoalTaskRow): GoalTask {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAll(db: SQLiteDatabase): Promise<GoalTask[]> {
  const rows = await db.getAllAsync<GoalTaskRow>('SELECT * FROM GoalTask');
  return rows.map(mapRow);
}

export async function getById(
  db: SQLiteDatabase,
  id: string
): Promise<GoalTask | null> {
  const row = await db.getFirstAsync<GoalTaskRow>(
    'SELECT * FROM GoalTask WHERE id = ?',
    id
  );
  return row ? mapRow(row) : null;
}

export async function getByDate(
  db: SQLiteDatabase,
  date: string
): Promise<GoalTask[]> {
  const rows = await db.getAllAsync<GoalTaskRow>(
    'SELECT * FROM GoalTask WHERE date = ?',
    date
  );
  return rows.map(mapRow);
}

export async function getIncompleteByDate(
  db: SQLiteDatabase,
  date: string
): Promise<GoalTask[]> {
  const rows = await db.getAllAsync<GoalTaskRow>(
    'SELECT * FROM GoalTask WHERE date = ? AND is_completed = 0',
    date
  );
  return rows.map(mapRow);
}

export async function create(
  db: SQLiteDatabase,
  task: Omit<GoalTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'isCompleted'>
): Promise<GoalTask> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO GoalTask (id, name, date, is_completed, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, 0, NULL, ?, ?)`,
    id,
    task.name,
    task.date,
    now,
    now
  );

  const row = await db.getFirstAsync<GoalTaskRow>(
    'SELECT * FROM GoalTask WHERE id = ?',
    id
  );
  return mapRow(row!);
}

export async function update(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Pick<GoalTask, 'name' | 'isCompleted' | 'completedAt'>>
): Promise<GoalTask> {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    params.push(updates.name);
  }
  if (updates.isCompleted !== undefined) {
    setClauses.push('is_completed = ?');
    params.push(updates.isCompleted ? 1 : 0);
  }
  if (updates.completedAt !== undefined) {
    setClauses.push('completed_at = ?');
    params.push(updates.completedAt);
  }

  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);
  params.push(id);

  await db.runAsync(
    `UPDATE GoalTask SET ${setClauses.join(', ')} WHERE id = ?`,
    ...params
  );

  const row = await db.getFirstAsync<GoalTaskRow>(
    'SELECT * FROM GoalTask WHERE id = ?',
    id
  );
  return mapRow(row!);
}

export async function deleteById(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM GoalTask WHERE id = ?', id);
}
