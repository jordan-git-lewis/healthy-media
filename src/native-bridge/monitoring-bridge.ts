export interface MonitoringBridge {
  startMonitoringService(): Promise<void>;
  stopMonitoringService(): Promise<void>;
}

export const monitoringBridge: MonitoringBridge = {
  async startMonitoringService(): Promise<void> {
    console.warn(
      'monitoringBridge.startMonitoringService() is a stub — native module not yet implemented'
    );
  },
  async stopMonitoringService(): Promise<void> {
    console.warn(
      'monitoringBridge.stopMonitoringService() is a stub — native module not yet implemented'
    );
  },
};
