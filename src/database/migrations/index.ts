import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

export const migrations: Migration[] = [];
