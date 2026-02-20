import type { SQLiteDatabase } from 'expo-sqlite';
import type { BlockedApp, EnforcementLevel } from '../../app-blocking/blocking-types';
import { generateId } from '../../shared/uuid-utils';

interface BlockedAppRow {
  id: string;
  package_name: string;
  app_name: string;
  icon_uri: string | null;
  enforcement_level: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: BlockedAppRow): BlockedApp {
  return {
    id: row.id,
    packageName: row.package_name,
    appName: row.app_name,
    iconUri: row.icon_uri,
    enforcementLevel: row.enforcement_level as EnforcementLevel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAll(db: SQLiteDatabase): Promise<BlockedApp[]> {
  const rows = await db.getAllAsync<BlockedAppRow>('SELECT * FROM BlockedApp');
  return rows.map(mapRow);
}

export async function getByPackageName(
  db: SQLiteDatabase,
  packageName: string
): Promise<BlockedApp | null> {
  const row = await db.getFirstAsync<BlockedAppRow>(
    'SELECT * FROM BlockedApp WHERE package_name = ?',
    packageName
  );
  return row ? mapRow(row) : null;
}

export async function getActivelyBlocked(
  db: SQLiteDatabase
): Promise<BlockedApp[]> {
  const rows = await db.getAllAsync<BlockedAppRow>(
    "SELECT * FROM BlockedApp WHERE enforcement_level != 'off'"
  );
  return rows.map(mapRow);
}

export async function upsert(
  db: SQLiteDatabase,
  app: Omit<BlockedApp, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BlockedApp> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO BlockedApp (id, package_name, app_name, icon_uri, enforcement_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(package_name) DO UPDATE SET
       app_name = excluded.app_name,
       icon_uri = excluded.icon_uri,
       enforcement_level = excluded.enforcement_level,
       updated_at = excluded.updated_at`,
    id,
    app.packageName,
    app.appName,
    app.iconUri,
    app.enforcementLevel,
    now,
    now
  );

  const row = await db.getFirstAsync<BlockedAppRow>(
    'SELECT * FROM BlockedApp WHERE package_name = ?',
    app.packageName
  );
  return mapRow(row!);
}

export async function updateEnforcement(
  db: SQLiteDatabase,
  id: string,
  level: EnforcementLevel
): Promise<void> {
  await db.runAsync(
    'UPDATE BlockedApp SET enforcement_level = ?, updated_at = ? WHERE id = ?',
    level,
    new Date().toISOString(),
    id
  );
}

export async function deleteById(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM BlockedApp WHERE id = ?', id);
}
