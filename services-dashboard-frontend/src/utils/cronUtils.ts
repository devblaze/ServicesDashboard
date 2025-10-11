import { CRON_PRESETS } from '../types/ScheduledTask';

export function describeCronExpression(cron: string): string {
  const preset = CRON_PRESETS.find(p => p.value === cron);
  if (preset) {
    return preset.description;
  }

  // Basic cron parsing for display
  const parts = cron.split(' ');
  if (parts.length < 6) {
    return 'Custom schedule';
  }

  const [, minute, hour, day, , dayOfWeek] = parts;

  // Common patterns
  if (minute === '*' && hour === '*') {
    return 'Every minute';
  }
  if (minute.startsWith('*/') && hour === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (hour.startsWith('*/') && minute === '0') {
    return `Every ${hour.slice(2)} hours`;
  }
  if (hour !== '*' && minute !== '*' && day === '*' && dayOfWeek === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return 'Custom schedule';
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export function formatNextExecution(dateString: string | undefined): string {
  if (!dateString) return 'Not scheduled';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Overdue';
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'In less than a minute';
  }
  if (diffMins < 60) {
    return `In ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
  }
  if (diffHours < 24) {
    return `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  }
  if (diffDays < 7) {
    return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
