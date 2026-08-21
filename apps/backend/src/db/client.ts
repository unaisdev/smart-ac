import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { DEFAULT_AIR_STATE, SEED_AIR_CONDITIONERS } from '@smart-ac/shared';

export type SqliteDatabase = Database.Database;

export function resolveSqlitePath(databaseUrl: string): string {
  if (databaseUrl === ':memory:' || databaseUrl === 'file::memory:') {
    return ':memory:';
  }
  const withoutScheme = databaseUrl.replace(/^file:/, '');
  return resolve(withoutScheme);
}

export function openDatabase(databaseUrl: string): SqliteDatabase {
  const sqlitePath = resolveSqlitePath(databaseUrl);
  if (sqlitePath !== ':memory:') {
    mkdirSync(dirname(sqlitePath), { recursive: true });
  }

  const db = new Database(sqlitePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seed(db);
  return db;
}

function migrate(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS air_conditioners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telegram_users (
      telegram_user_id INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      air_conditioner_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      success INTEGER NOT NULL,
      FOREIGN KEY (air_conditioner_id) REFERENCES air_conditioners(id)
    );

    CREATE TABLE IF NOT EXISTS device_status (
      air_conditioner_id TEXT PRIMARY KEY,
      desired_state_json TEXT NOT NULL,
      reported_state_json TEXT,
      online INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (air_conditioner_id) REFERENCES air_conditioners(id)
    );

    CREATE TABLE IF NOT EXISTS ir_commands (
      device_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      PRIMARY KEY (device_id, name)
    );
  `);
}

function seed(db: SqliteDatabase): void {
  const insertAc = db.prepare(
    `INSERT OR IGNORE INTO air_conditioners (id, name, location) VALUES (@id, @name, @location)`,
  );
  const insertStatus = db.prepare(
    `INSERT OR IGNORE INTO device_status
      (air_conditioner_id, desired_state_json, reported_state_json, online, updated_at)
     VALUES (@id, @desired, NULL, 0, @updatedAt)`,
  );

  const now = new Date().toISOString();
  const desired = JSON.stringify(DEFAULT_AIR_STATE);

  const run = db.transaction(() => {
    for (const ac of SEED_AIR_CONDITIONERS) {
      insertAc.run(ac);
      insertStatus.run({ id: ac.id, desired, updatedAt: now });
    }
  });
  run();
}
