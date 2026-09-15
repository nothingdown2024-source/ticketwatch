export const QUEUES = {
  dispatcher: 'dispatcher',
  sourceScan: 'source-scan',
  notification: 'notification',
  retention: 'retention',
} as const;

export interface SourceScanJobData {
  sourceId: string;
  runKey: string;
  correlationId: string;
}

export interface NotificationJobData {
  notificationId: string;
  correlationId: string;
}
