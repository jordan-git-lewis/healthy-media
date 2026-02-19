import type { SQLiteDatabase } from 'expo-sqlite';
import { migration001 } from './001-initial-schema';

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

export const migrations: Migration[] = [migration001];
