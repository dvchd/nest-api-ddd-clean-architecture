import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;

/**
 * Extract table type from schema
 */
export type ExtractTableType<T> = T extends infer S
  ? S extends Record<string, unknown>
    ? { [K in keyof S]: S[K] }
    : never
  : never;
