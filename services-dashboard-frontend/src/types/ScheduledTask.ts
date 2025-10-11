export interface ScheduledTask {
  id: number;
  name: string;
  description?: string;
  command: string;
  cronExpression: string;
  timeZone: string;
  isEnabled: boolean;
  timeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
  lastExecutionTime?: string;
  nextExecutionTime?: string;
  createdBy?: string;
  servers: ServerSummary[];
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

export interface ServerSummary {
  id: number;
  name: string;
  hostAddress: string;
  status: string;
  type: string;
}

export interface CreateScheduledTaskRequest {
  name: string;
  description?: string;
  command: string;
  cronExpression: string;
  timeZone?: string;
  isEnabled?: boolean;
  timeoutSeconds?: number;
  serverIds: number[];
}

export interface UpdateScheduledTaskRequest {
  name?: string;
  description?: string;
  command?: string;
  cronExpression?: string;
  timeZone?: string;
  isEnabled?: boolean;
  timeoutSeconds?: number;
  serverIds?: number[];
}

export interface TaskExecution {
  id: number;
  scheduledTaskId: number;
  scheduledTaskName: string;
  serverId: number;
  serverName: string;
  startedAt: string;
  completedAt?: string;
  status: TaskExecutionStatus;
  output?: string;
  errorOutput?: string;
  exitCode?: number;
  durationMs: number;
}

export type TaskExecutionStatus =
  | 'Pending'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'TimedOut'
  | 'Cancelled';

export interface ManualExecutionRequest {
  serverIds: number[];
}

export interface CronValidationRequest {
  cronExpression: string;
  timeZone?: string;
}

export interface CronValidationResponse {
  isValid: boolean;
  nextExecution?: string;
}

// Helper types for the UI
export interface CronPreset {
  label: string;
  value: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every minute', value: '0 * * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '0 */5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '0 */15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '0 */30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 hours', value: '0 0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Every 12 hours', value: '0 0 */12 * * *', description: 'Runs every 12 hours' },
  { label: 'Daily at midnight', value: '0 0 0 * * *', description: 'Runs once per day at 00:00' },
  { label: 'Daily at 2 AM', value: '0 0 2 * * *', description: 'Runs once per day at 02:00' },
  { label: 'Weekly (Sunday)', value: '0 0 0 * * 0', description: 'Runs every Sunday at midnight' },
  { label: 'Monthly (1st)', value: '0 0 0 1 * *', description: 'Runs on the 1st of each month' },
];

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];
