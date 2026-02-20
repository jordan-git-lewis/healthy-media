export type EnforcementLevel = 'hard_block' | 'soft_warning' | 'off';

export interface BlockedApp {
  id: string;
  packageName: string;
  appName: string;
  iconUri: string | null;
  enforcementLevel: EnforcementLevel;
  createdAt: string;
  updatedAt: string;
}
