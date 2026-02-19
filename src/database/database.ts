import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrations, type Migration } from './migrations';

let dbInstance: SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabaseAsync('healthy-media.db');
  }
  return dbInstance;
}

export async function getCurrentVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM SchemaVersion'
  );
  return row?.version ?? 0;
}

export async function runMigrations(
  db: SQLiteDatabase,
  pendingMigrations: Migration[]
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);

  const unapplied = pendingMigrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of unapplied) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      await txn.runAsync(
        'INSERT INTO SchemaVersion (version, applied_at) VALUES (?, ?)',
        migration.version,
        new Date().toISOString()
      );
    });
  }
}

export async function initializeDatabase(): Promise<SQLiteDatabase> {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS SchemaVersion (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  await runMigrations(db, migrations);

  return db;
}

/** Reset singleton — for testing only */
export function _resetDbInstance(): void {
  dbInstance = null;
}
