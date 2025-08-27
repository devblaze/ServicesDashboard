// Existing interfaces...

export interface ManagedServer {
  id: number;
  name: string;
  hostAddress: string;
  sshPort?: number;
  username?: string;
  type: ServerType;
  status: ServerStatus;
  operatingSystem?: string;
  systemInfo?: string;
  lastCheckTime?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string;
  healthChecks?: ServerHealthCheck[];
  updateReports?: UpdateReport[];
  alerts?: ServerAlert[];
}

export interface CreateServerDto {
  name: string;
  hostAddress: string;
  sshPort: number;
  username: string;
  password: string;
  type: ServerType;
  tags?: string | null;
}

export interface ServerHealthCheck {
  id: number;
  serverId: number;
  checkTime: string;
  isHealthy: boolean;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  loadAverage?: number;
  runningProcesses?: number;
  errorMessage?: string;
  rawData?: string;
}

export interface UpdateReport {
  id: number;
  serverId: number;
  scanTime: string;
  availableUpdates: number;
  securityUpdates: number;
  packageDetails?: string;
  status: UpdateStatus;
  aiRecommendation?: string;
  aiConfidence?: number;
}

export interface ServerAlert {
  id: number;
  serverId: number;
  createdAt: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolution?: string;
  server?: ManagedServer;
}

// Convert enums to string literal union types
export type ServerType = 'Server' | 'RaspberryPi' | 'VirtualMachine' | 'Container';

export type ServerStatus = 
  | 'Unknown'
  | 'Online'
  | 'Offline'
  | 'Warning'
  | 'Critical'
  | 'Maintenance';

export type UpdateStatus = 
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Skipped';

export type AlertType = 
  | 'HighCpuUsage'
  | 'HighMemoryUsage'
  | 'HighDiskUsage'
  | 'ServiceDown'
  | 'UpdatesAvailable'
  | 'SecurityAlert'
  | 'ConnectionLost'
  | 'Custom';

export type AlertSeverity = 
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

// Export constants for the enum-like values if needed for iteration or validation
export const SERVER_TYPES = [
  'Server',
  'RaspberryPi',
  'VirtualMachine',
  'Container',
  'Other'
] as const;

export const SERVER_STATUSES = [
  'Unknown',
  'Online',
  'Offline',
  'Warning',
  'Critical',
  'Maintenance'
] as const;

export const UPDATE_STATUSES = [
  'Pending',
  'InProgress',
  'Completed',
  'Failed',
  'Skipped'
] as const;

export const ALERT_TYPES = [
  'HighCpuUsage',
  'HighMemoryUsage',
  'HighDiskUsage',
  'ServiceDown',
  'UpdatesAvailable',
  'SecurityAlert',
  'ConnectionLost',
  'Custom'
] as const;

export const ALERT_SEVERITIES = [
  'Low',
  'Medium',
  'High',
  'Critical'
] as const;