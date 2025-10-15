export interface AISettings {
  provider: 'ollama' | 'openai' | 'anthropic';
  baseUrl: string;
  model: string;
  apiKey?: string;
  enableServiceRecognition: boolean;
  enableScreenshots: boolean;
  timeoutSeconds: number;
}

export interface NotificationSettings {
  enablePushover: boolean;
  pushoverUserKey?: string;
  pushoverApiToken?: string;
  enablePushbullet: boolean;
  pushbulletApiKey?: string;
  enableEmail: boolean;
  smtpServer?: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail?: string;
  toEmail?: string;
}

export interface GeneralSettings {
  applicationName: string;
  theme: 'dark' | 'light' | 'auto';
  refreshInterval: number;
  enableAutoRefresh: boolean;
  defaultScanPorts: 'common' | 'extended' | 'custom';
  customPorts?: string;
}

export interface ServerMonitoringSettings {
  enableAutoMonitoring: boolean;
  monitoringIntervalMinutes: number;
  enableHealthChecks: boolean;
  enableUpdateChecks: boolean;
  notifyOnHealthCheckFailure: boolean;
  notifyOnCriticalStatus: boolean;
  notifyOnSecurityUpdates: boolean;
}

export interface SettingsGroup {
  category: string;
  displayName: string;
  description: string;
  icon: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
}
