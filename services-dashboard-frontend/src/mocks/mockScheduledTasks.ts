import type { ScheduledTask, TaskExecution, ServerSummary } from '../types/ScheduledTask';

// Helper function to generate task executions
const generateTaskExecutions = (taskId: number, serverIds: number[], count: number = 10): TaskExecution[] => {
  const executions: TaskExecution[] = [];
  const statuses: Array<'Completed' | 'Failed' | 'TimedOut'> = ['Completed', 'Completed', 'Completed', 'Completed', 'Failed'];

  for (let i = 0; i < count; i++) {
    const hoursAgo = i * 6; // Every 6 hours
    const status = i === 0 ? 'Completed' : statuses[Math.floor(Math.random() * statuses.length)];
    const serverId = serverIds[Math.floor(Math.random() * serverIds.length)];
    const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const duration = status === 'Completed' ? 500 + Math.random() * 5000 :
                     status === 'Failed' ? 100 + Math.random() * 1000 :
                     30000; // TimedOut takes full timeout

    executions.push({
      id: taskId * 1000 + i,
      scheduledTaskId: taskId,
      scheduledTaskName: `Task ${taskId}`,
      serverId,
      serverName: `Server ${serverId}`,
      startedAt: startedAt.toISOString(),
      completedAt: new Date(startedAt.getTime() + duration).toISOString(),
      status,
      output: status === 'Completed'
        ? `Successfully executed command\nProcessed 100 items\nCompleted without errors`
        : status === 'Failed'
        ? `Error: Command failed with exit code 1`
        : '',
      errorOutput: status === 'Failed' ? 'Error: Permission denied' : status === 'TimedOut' ? 'Execution timed out after 30 seconds' : undefined,
      exitCode: status === 'Completed' ? 0 : status === 'Failed' ? 1 : undefined,
      durationMs: duration,
    });
  }

  return executions.reverse();
};

const mockServerSummaries: ServerSummary[] = [
  { id: 1, name: 'Production Server 1', hostAddress: 'prod-1.example.com', status: 'Online', type: 'Server' },
  { id: 2, name: 'Cache Server', hostAddress: 'cache-1.example.com', status: 'Online', type: 'Server' },
  { id: 3, name: 'Message Queue Server', hostAddress: 'mq-1.example.com', status: 'Online', type: 'VirtualMachine' },
  { id: 4, name: 'Monitoring Server', hostAddress: 'monitor-1.example.com', status: 'Online', type: 'Server' },
  { id: 5, name: 'Load Balancer', hostAddress: 'lb-1.example.com', status: 'Warning', type: 'Server' },
];

export const mockScheduledTasks: ScheduledTask[] = [
  {
    id: 1,
    name: 'Daily Database Backup',
    description: 'Automated backup of all production databases to remote storage',
    command: 'pg_dump -h localhost -U postgres production_db | gzip > /backups/prod_db_$(date +%Y%m%d).sql.gz',
    cronExpression: '0 0 2 * * *', // Daily at 2 AM
    timeZone: 'America/New_York',
    isEnabled: true,
    timeoutSeconds: 3600,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    servers: [mockServerSummaries[0], mockServerSummaries[1]],
    totalExecutions: 92,
    successfulExecutions: 90,
    failedExecutions: 2,
  },
  {
    id: 2,
    name: 'System Updates Check',
    description: 'Check for available system updates across all servers',
    command: 'apt update && apt list --upgradable',
    cronExpression: '0 0 */6 * * *', // Every 6 hours
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 600,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    createdBy: 'devops@example.com',
    servers: mockServerSummaries,
    totalExecutions: 240,
    successfulExecutions: 235,
    failedExecutions: 5,
  },
  {
    id: 3,
    name: 'Clear Log Files',
    description: 'Clean up old log files to free disk space',
    command: 'find /var/log -name "*.log" -type f -mtime +30 -delete',
    cronExpression: '0 0 3 1 * *', // Monthly on the 1st at 3 AM
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 1800,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    servers: [mockServerSummaries[0], mockServerSummaries[2], mockServerSummaries[3]],
    totalExecutions: 6,
    successfulExecutions: 6,
    failedExecutions: 0,
  },
  {
    id: 4,
    name: 'Docker Container Cleanup',
    description: 'Remove stopped containers and unused images',
    command: 'docker system prune -af --filter "until=168h"',
    cronExpression: '0 0 0 * * 0', // Weekly on Sunday at midnight
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 900,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'devops@example.com',
    servers: [mockServerSummaries[0], mockServerSummaries[1]],
    totalExecutions: 17,
    successfulExecutions: 17,
    failedExecutions: 0,
  },
  {
    id: 5,
    name: 'SSL Certificate Expiry Check',
    description: 'Check SSL certificates and send alert if expiring within 30 days',
    command: 'certbot certificates | grep "VALID"',
    cronExpression: '0 0 0 * * *', // Daily at midnight
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 300,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now()).toISOString(),
    createdBy: 'security@example.com',
    servers: [mockServerSummaries[4]],
    totalExecutions: 45,
    successfulExecutions: 44,
    failedExecutions: 1,
  },
  {
    id: 6,
    name: 'Application Health Ping',
    description: 'Ping critical application endpoints to ensure availability',
    command: 'curl -f https://api.example.com/health || echo "Health check failed"',
    cronExpression: '0 */5 * * * *', // Every 5 minutes
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 60,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdBy: 'monitoring@example.com',
    servers: [mockServerSummaries[3]],
    totalExecutions: 8640,
    successfulExecutions: 8595,
    failedExecutions: 45,
  },
  {
    id: 7,
    name: 'Restart Message Queue',
    description: 'Restart RabbitMQ service to clear stale connections',
    command: 'systemctl restart rabbitmq-server',
    cronExpression: '0 0 4 * * *', // Daily at 4 AM
    timeZone: 'America/New_York',
    isEnabled: false,
    timeoutSeconds: 300,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    servers: [mockServerSummaries[2]],
    totalExecutions: 5,
    successfulExecutions: 4,
    failedExecutions: 1,
  },
  {
    id: 8,
    name: 'Generate Analytics Report',
    description: 'Generate and email daily analytics report',
    command: 'python3 /opt/scripts/generate_report.py --email admin@example.com',
    cronExpression: '0 0 8 * * *', // Daily at 8 AM
    timeZone: 'America/Los_Angeles',
    isEnabled: true,
    timeoutSeconds: 600,
    createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastExecutionTime: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    nextExecutionTime: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
    createdBy: 'analytics@example.com',
    servers: [mockServerSummaries[3]],
    totalExecutions: 75,
    successfulExecutions: 73,
    failedExecutions: 2,
  },
];

// Store executions by task ID for retrieval
export const mockTaskExecutions: Record<number, TaskExecution[]> = {
  1: generateTaskExecutions(1, [1, 2], 15),
  2: generateTaskExecutions(2, [1, 2, 3, 4, 5], 20),
  3: generateTaskExecutions(3, [1, 3, 4], 6),
  4: generateTaskExecutions(4, [1, 2], 10),
  5: generateTaskExecutions(5, [5], 15),
  6: generateTaskExecutions(6, [4], 25),
  7: generateTaskExecutions(7, [3], 5),
  8: generateTaskExecutions(8, [4], 12),
};
