import type { SQLiteDatabase } from 'expo-sqlite';
import type { UserSettings } from '../../settings/settings-types';
import { DatabaseError } from '../../shared/error-types';

interface UserSettingsRow {
  id: string;
  day_reset_time: string;
  onboarding_survey_response: string | null;
  onboarding_completed: number;
  global_blocking_enabled: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: UserSettingsRow): UserSettings {
  return {
    id: row.id,
    dayResetTime: row.day_reset_time,
    onboardingSurveyResponse: row.onboarding_survey_response,
    onboardingCompleted: row.onboarding_completed === 1,
    globalBlockingEnabled: row.global_blocking_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function get(db: SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<UserSettingsRow>(
    'SELECT * FROM UserSettings WHERE id = ?',
    '1'
  );
  if (!row) {
    throw new DatabaseError('UserSettings record not found');
  }
  return mapRow(row);
}

export async function update(
  db: SQLiteDatabase,
  settings: Partial<
    Pick<
      UserSettings,
      | 'dayResetTime'
      | 'onboardingSurveyResponse'
      | 'onboardingCompleted'
      | 'globalBlockingEnabled'
    >
  >
): Promise<UserSettings> {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (settings.dayResetTime !== undefined) {
    setClauses.push('day_reset_time = ?');
    params.push(settings.dayResetTime);
  }
  if (settings.onboardingSurveyResponse !== undefined) {
    setClauses.push('onboarding_survey_response = ?');
    params.push(settings.onboardingSurveyResponse);
  }
  if (settings.onboardingCompleted !== undefined) {
    setClauses.push('onboarding_completed = ?');
    params.push(settings.onboardingCompleted ? 1 : 0);
  }
  if (settings.globalBlockingEnabled !== undefined) {
    setClauses.push('global_blocking_enabled = ?');
    params.push(settings.globalBlockingEnabled ? 1 : 0);
  }

  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);
  params.push('1');

  await db.runAsync(
    `UPDATE UserSettings SET ${setClauses.join(', ')} WHERE id = ?`,
    ...params
  );

  return get(db);
}
