import type { SQLiteDatabase } from 'expo-sqlite';
import { migration001 } from '../../../src/database/migrations/001-initial-schema';

let capturedSql = '';

const mockDb: Partial<SQLiteDatabase> = {
  execAsync: jest.fn(async (sql: string) => {
    capturedSql = sql;
  }),
};

beforeAll(async () => {
  await migration001.up(mockDb as SQLiteDatabase);
});

describe('migration 001 — initial schema', () => {

  it('has version 1', () => {
    expect(migration001.version).toBe(1);
  });

  it('calls execAsync once with the full SQL', () => {
    expect(mockDb.execAsync).toHaveBeenCalledTimes(1);
  });

  // ── Tables ──────────────────────────────────────────────────────────

  const tables = [
    'BlockedApp',
    'TimeSchedule',
    'GoalTask',
    'SuccessThreshold',
    'OverrideEvent',
    'DailyRecord',
    'UserSettings',
  ];

  it.each(tables)('creates the %s table', (table) => {
    expect(capturedSql).toContain(
      `CREATE TABLE IF NOT EXISTS ${table}`
    );
  });

  // ── Indexes ─────────────────────────────────────────────────────────

  const indexes = [
    'idx_blocked_app_enforcement',
    'idx_time_schedule_active',
    'idx_goal_task_date',
    'idx_goal_task_date_completed',
    'idx_success_threshold_date',
    'idx_override_event_date',
    'idx_override_event_timestamp',
    'idx_daily_record_date',
    'idx_daily_record_status',
  ];

  it.each(indexes)('creates the %s index', (idx) => {
    expect(capturedSql).toContain(
      `CREATE INDEX IF NOT EXISTS ${idx}`
    );
  });

  // ── IF NOT EXISTS idempotency ───────────────────────────────────────

  it('uses IF NOT EXISTS on every CREATE TABLE', () => {
    const tableMatches = capturedSql.match(/CREATE TABLE(?! IF NOT EXISTS)/g);
    expect(tableMatches).toBeNull();
  });

  it('uses IF NOT EXISTS on every CREATE INDEX', () => {
    const indexMatches = capturedSql.match(/CREATE INDEX(?! IF NOT EXISTS)/g);
    expect(indexMatches).toBeNull();
  });

  // ── UNIQUE constraints ──────────────────────────────────────────────

  it('has UNIQUE on BlockedApp.package_name', () => {
    const blockedAppDdl = capturedSql.match(
      /CREATE TABLE IF NOT EXISTS BlockedApp\s*\([\s\S]*?\);/
    );
    expect(blockedAppDdl).not.toBeNull();
    expect(blockedAppDdl![0]).toMatch(/package_name\s+TEXT\s+NOT NULL\s+UNIQUE/);
  });

  it('has UNIQUE on SuccessThreshold.date', () => {
    const ddl = capturedSql.match(
      /CREATE TABLE IF NOT EXISTS SuccessThreshold\s*\([\s\S]*?\);/
    );
    expect(ddl).not.toBeNull();
    expect(ddl![0]).toMatch(/date\s+TEXT\s+NOT NULL\s+UNIQUE/);
  });

  it('has UNIQUE on DailyRecord.date', () => {
    const ddl = capturedSql.match(
      /CREATE TABLE IF NOT EXISTS DailyRecord\s*\([\s\S]*?\);/
    );
    expect(ddl).not.toBeNull();
    expect(ddl![0]).toMatch(/date\s+TEXT\s+NOT NULL\s+UNIQUE/);
  });

  // ── CHECK constraints ───────────────────────────────────────────────

  it('has CHECK constraints on SuccessThreshold', () => {
    const ddl = capturedSql.match(
      /CREATE TABLE IF NOT EXISTS SuccessThreshold\s*\([\s\S]*?\);/
    );
    expect(ddl).not.toBeNull();
    expect(ddl![0]).toContain('CHECK (required_count >= 1)');
    expect(ddl![0]).toContain('CHECK (required_count <= total_count)');
  });

  it('has CHECK(id = 1) on UserSettings', () => {
    const ddl = capturedSql.match(
      /CREATE TABLE IF NOT EXISTS UserSettings\s*\([\s\S]*?\);/
    );
    expect(ddl).not.toBeNull();
    expect(ddl![0]).toContain('CHECK (id = 1)');
  });

  // ── Default UserSettings row ────────────────────────────────────────

  it('inserts a default UserSettings row', () => {
    expect(capturedSql).toMatch(/INSERT OR IGNORE INTO UserSettings/);
  });

  // ── Column-level checks per table ──────────────────────────────────

  describe('BlockedApp columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS BlockedApp\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/package_name\s+TEXT\s+NOT NULL\s+UNIQUE/);
      expect(ddl).toMatch(/app_name\s+TEXT\s+NOT NULL/);
      expect(ddl).toContain('icon_uri TEXT');
      expect(ddl).toMatch(/enforcement_level\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/updated_at\s+TEXT\s+NOT NULL/);
    });
  });

  describe('TimeSchedule columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS TimeSchedule\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/name\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/start_time\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/end_time\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/days_of_week\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/is_active\s+INTEGER\s+NOT NULL\s+DEFAULT\s+1/);
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/updated_at\s+TEXT\s+NOT NULL/);
    });
  });

  describe('GoalTask columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS GoalTask\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/name\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/date\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/is_completed\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toContain('completed_at TEXT');
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/updated_at\s+TEXT\s+NOT NULL/);
    });
  });

  describe('SuccessThreshold columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS SuccessThreshold\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/date\s+TEXT\s+NOT NULL\s+UNIQUE/);
      expect(ddl).toMatch(/required_count\s+INTEGER\s+NOT NULL/);
      expect(ddl).toMatch(/total_count\s+INTEGER\s+NOT NULL/);
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
    });
  });

  describe('OverrideEvent columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS OverrideEvent\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/package_name\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/app_name\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/timestamp\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/date\s+TEXT\s+NOT NULL/);
      expect(ddl).toContain('active_schedule_id TEXT');
      expect(ddl).toContain('task_context TEXT');
    });
  });

  describe('DailyRecord columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS DailyRecord\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toContain('id TEXT PRIMARY KEY');
      expect(ddl).toMatch(/date\s+TEXT\s+NOT NULL\s+UNIQUE/);
      expect(ddl).toMatch(/goal_tasks_completed\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toMatch(/goal_tasks_total\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toMatch(/success_threshold\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toMatch(/override_count\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toMatch(/time_schedule_adherence\s+INTEGER\s+NOT NULL\s+DEFAULT\s+1/);
      expect(ddl).toMatch(/status\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/updated_at\s+TEXT\s+NOT NULL/);
    });
  });

  describe('UserSettings columns', () => {
    it('has all required columns', () => {
      const ddl = capturedSql.match(
        /CREATE TABLE IF NOT EXISTS UserSettings\s*\([\s\S]*?\);/
      )![0];
      expect(ddl).toMatch(/id\s+INTEGER\s+PRIMARY KEY\s+DEFAULT\s+1/);
      expect(ddl).toMatch(/day_reset_time\s+TEXT\s+NOT NULL\s+DEFAULT\s+'00:00'/);
      expect(ddl).toContain('onboarding_survey_response TEXT');
      expect(ddl).toMatch(/onboarding_completed\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/);
      expect(ddl).toMatch(/global_blocking_enabled\s+INTEGER\s+NOT NULL\s+DEFAULT\s+1/);
      expect(ddl).toMatch(/created_at\s+TEXT\s+NOT NULL/);
      expect(ddl).toMatch(/updated_at\s+TEXT\s+NOT NULL/);
    });
  });
});
