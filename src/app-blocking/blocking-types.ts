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

export interface BlockedAppState {
  blockedApps: BlockedApp[];
  isHydrated: boolean;
  error: string | null;
}

export interface BlockingState {
  isBlocking: boolean;
  reason: string | null;
  taskProgress: {
    completed: number;
    total: number;
    threshold: number;
  } | null;
  timeRemaining: {
    minutes: number;
  } | null;
}
