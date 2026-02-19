import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from '../../src/database/migrations';

// Mock expo-sqlite before importing the module under test
const mockDb: Partial<SQLiteDatabase> = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

import { openDatabaseAsync } from 'expo-sqlite';
import {
  getDatabase,
  initializeDatabase,
  getCurrentVersion,
  runMigrations,
  _resetDbInstance,
} from '../../src/database/database';

beforeEach(() => {
  jest.clearAllMocks();
  _resetDbInstance();
});

describe('getDatabase', () => {
  it('returns a database connection', async () => {
    const db = await getDatabase();
    expect(openDatabaseAsync).toHaveBeenCalledWith('healthy-media.db');
    expect(db).toBe(mockDb);
  });

  it('returns the same instance on subsequent calls', async () => {
    const db1 = await getDatabase();
    const db2 = await getDatabase();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(db1).toBe(db2);
  });
});

describe('initializeDatabase', () => {
  it('creates the SchemaVersion table', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

    await initializeDatabase();

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS SchemaVersion')
    );
  });
});

describe('getCurrentVersion', () => {
  it('returns 0 when no migrations have been applied', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);

    const version = await getCurrentVersion(mockDb as SQLiteDatabase);
    expect(version).toBe(0);
  });

  it('returns the max version from SchemaVersion', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({ version: 3 });

    const version = await getCurrentVersion(mockDb as SQLiteDatabase);
    expect(version).toBe(3);
  });
});

describe('runMigrations', () => {
  // Helper: make withExclusiveTransactionAsync execute the callback with a mock txn
  function setupTransactionMock() {
    const mockTxn: Partial<SQLiteDatabase> = {
      runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
      execAsync: jest.fn(),
    };
    (mockDb.withExclusiveTransactionAsync as jest.Mock).mockImplementation(
      async (fn: (txn: SQLiteDatabase) => Promise<void>) => {
        await fn(mockTxn as SQLiteDatabase);
      }
    );
    return mockTxn;
  }

  it('applies new migrations in order', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);
    const mockTxn = setupTransactionMock();

    const upCalls: number[] = [];
    const testMigrations: Migration[] = [
      {
        version: 1,
        up: jest.fn(async () => {
          upCalls.push(1);
        }),
      },
      {
        version: 2,
        up: jest.fn(async () => {
          upCalls.push(2);
        }),
      },
    ];

    await runMigrations(mockDb as SQLiteDatabase, testMigrations);

    expect(testMigrations[0].up).toHaveBeenCalledWith(mockTxn);
    expect(testMigrations[1].up).toHaveBeenCalledWith(mockTxn);
    expect(upCalls).toEqual([1, 2]);
    expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalledTimes(2);
  });

  it('skips already-applied migrations', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue({ version: 1 });
    setupTransactionMock();

    const testMigrations: Migration[] = [
      { version: 1, up: jest.fn() },
      { version: 2, up: jest.fn() },
    ];

    await runMigrations(mockDb as SQLiteDatabase, testMigrations);

    expect(testMigrations[0].up).not.toHaveBeenCalled();
    expect(testMigrations[1].up).toHaveBeenCalled();
    expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('throws when a migration fails', async () => {
    (mockDb.getFirstAsync as jest.Mock).mockResolvedValue(null);
    (mockDb.withExclusiveTransactionAsync as jest.Mock).mockImplementation(
      async (fn: (txn: SQLiteDatabase) => Promise<void>) => {
        const mockTxn = { runAsync: jest.fn(), execAsync: jest.fn() };
        await fn(mockTxn as unknown as SQLiteDatabase);
      }
    );

    const testMigrations: Migration[] = [
      {
        version: 1,
        up: jest.fn().mockRejectedValue(new Error('SQL syntax error')),
      },
    ];

    await expect(
      runMigrations(mockDb as SQLiteDatabase, testMigrations)
    ).rejects.toThrow('SQL syntax error');
  });
});
