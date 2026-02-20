export interface UserSettings {
  id: string;
  dayResetTime: string;
  onboardingSurveyResponse: string | null;
  onboardingCompleted: boolean;
  globalBlockingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
