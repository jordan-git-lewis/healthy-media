import type { Migration } from './index';

export const migration001: Migration = {
  version: 1,
  up: async (db) => {
    await db.execAsync(`
      -- BlockedApp
      CREATE TABLE IF NOT EXISTS BlockedApp (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL UNIQUE,
        app_name TEXT NOT NULL,
        icon_uri TEXT,
        enforcement_level TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- TimeSchedule
      CREATE TABLE IF NOT EXISTS TimeSchedule (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- GoalTask
      CREATE TABLE IF NOT EXISTS GoalTask (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- SuccessThreshold
      CREATE TABLE IF NOT EXISTS SuccessThreshold (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        required_count INTEGER NOT NULL,
        total_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        CHECK (required_count >= 1),
        CHECK (required_count <= total_count)
      );

      -- OverrideEvent
      CREATE TABLE IF NOT EXISTS OverrideEvent (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        app_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        date TEXT NOT NULL,
        active_schedule_id TEXT,
        task_context TEXT
      );

      -- DailyRecord
      CREATE TABLE IF NOT EXISTS DailyRecord (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        goal_tasks_completed INTEGER NOT NULL DEFAULT 0,
        goal_tasks_total INTEGER NOT NULL DEFAULT 0,
        success_threshold INTEGER NOT NULL DEFAULT 0,
        override_count INTEGER NOT NULL DEFAULT 0,
        time_schedule_adherence INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- UserSettings (singleton)
      CREATE TABLE IF NOT EXISTS UserSettings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        day_reset_time TEXT NOT NULL DEFAULT '00:00',
        onboarding_survey_response TEXT,
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        global_blocking_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (id = 1)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_blocked_app_enforcement ON BlockedApp (enforcement_level);
      CREATE INDEX IF NOT EXISTS idx_time_schedule_active ON TimeSchedule (is_active);
      CREATE INDEX IF NOT EXISTS idx_goal_task_date ON GoalTask (date);
      CREATE INDEX IF NOT EXISTS idx_goal_task_date_completed ON GoalTask (date, is_completed);
      CREATE INDEX IF NOT EXISTS idx_success_threshold_date ON SuccessThreshold (date);
      CREATE INDEX IF NOT EXISTS idx_override_event_date ON OverrideEvent (date);
      CREATE INDEX IF NOT EXISTS idx_override_event_timestamp ON OverrideEvent (timestamp);
      CREATE INDEX IF NOT EXISTS idx_daily_record_date ON DailyRecord (date);
      CREATE INDEX IF NOT EXISTS idx_daily_record_status ON DailyRecord (status);

      -- Default UserSettings row
      INSERT OR IGNORE INTO UserSettings (id, day_reset_time, onboarding_completed, global_blocking_enabled, created_at, updated_at)
      VALUES (1, '00:00', 0, 1, datetime('now'), datetime('now'));
    `);
  },
};
